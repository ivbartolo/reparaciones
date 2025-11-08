import React, { useState, useCallback, useRef } from 'react';
import type { VehicleRecord } from '../types';
import { extractLicensePlateText } from '../services/geminiService';
import { uploadVehicleAssetsToDrive, type DriveUploadItem } from '../services/googleDriveService';
import { processImage, fileToBase64, resizeImageToAspect } from '../utils/imageUtils';
import { CameraIcon, TrashIcon, PlusIcon, SparklesIcon } from './icons';

interface VehicleFormProps {
  onAddVehicle: (record: Omit<VehicleRecord, 'id' | 'createdAt'>) => void;
}

const MAX_SECONDARY_IMAGES = 8;
const DRIVE_TARGET_WIDTH = 800;
const DRIVE_TARGET_HEIGHT = 600;
const DRIVE_MAX_BYTES = 500 * 1024; // 500 KB

const VehicleForm: React.FC<VehicleFormProps> = ({ onAddVehicle }) => {
  const [matricula, setMatricula] = useState('');
  const [licensePlateImage, setLicensePlateImage] = useState<{ url: string; file: File | null }>({ url: '', file: null });
  const [secondaryImages, setSecondaryImages] = useState<{ url: string; file: File }[]>([]);
  const [notes, setNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const secondaryGalleryInputRef = useRef<HTMLInputElement>(null);
  const secondaryCameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setMatricula('');
    setLicensePlateImage({ url: '', file: null });
    setSecondaryImages([]);
    setNotes('');
    setIsLoading(false);
    setError(null);
    setStatusMessage(null);
  }, []);

  const handleLicensePlateImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
  
    setIsLoading(true);
    setError(null);
    setStatusMessage(null);
  
    try {
      const processedFile = await processImage(file, 800, 450);
  
      // Set preview and reset state for analysis
      setLicensePlateImage({ url: URL.createObjectURL(processedFile), file: processedFile });
      setMatricula('');
  
      // Analyze
      const { data, mime } = await fileToBase64(processedFile);
      const text = await extractLicensePlateText(data, mime);
      if (text && text.toUpperCase() !== 'N/A') {
        setMatricula(text.toUpperCase());
      } else {
        setError("No se pudo identificar una matrícula. Por favor, introdúcela manualmente.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al procesar o analizar la imagen.");
      setLicensePlateImage({ url: '', file: null }); // Clear image on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecondaryImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const availableSlots = MAX_SECONDARY_IMAGES - secondaryImages.length;
    const filesToProcess = files.slice(0, availableSlots);
    
    setError(null);
    try {
      // Process all selected images concurrently
      const processedFiles = await Promise.all(
        filesToProcess.map(f => processImage(f, 500, 500))
      );

      const newImages = processedFiles.map((file: File) => ({
        url: URL.createObjectURL(file),
        file: file
      }));

      setSecondaryImages(prev => [...prev, ...newImages]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar una o más imágenes secundarias.");
    }
  };

  const removeSecondaryImage = (index: number) => {
    setSecondaryImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!licensePlateImage.file) {
      setError("La foto de la matrícula es obligatoria.");
      return;
    }
    if (!matricula.trim()) {
      setError("El campo matrícula es obligatorio.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage('Subiendo archivos a Google Drive...');
    try {
      const uploadItems: DriveUploadItem[] = [];

      const licensePlateBlob = await resizeImageToAspect(
        licensePlateImage.file,
        DRIVE_TARGET_WIDTH,
        DRIVE_TARGET_HEIGHT,
        DRIVE_MAX_BYTES
      );
      uploadItems.push({
        file: licensePlateBlob,
        name: `${matricula}-principal.jpg`,
      });

      const secondaryUploadItems = await Promise.all(
        secondaryImages.map(async (image, index) => {
          const blob = await resizeImageToAspect(
            image.file,
            DRIVE_TARGET_WIDTH,
            DRIVE_TARGET_HEIGHT,
            DRIVE_MAX_BYTES
          );
          return {
            file: blob,
            name: `${matricula}-sec-${index + 1}.jpg`,
          };
        })
      );
      uploadItems.push(...secondaryUploadItems);

      const driveFolderId = await uploadVehicleAssetsToDrive(matricula, uploadItems);

      setStatusMessage('Creando ficha local...');

      const { data: licensePlateBase64, mime: licensePlateMime } = await fileToBase64(licensePlateImage.file);
      const licensePlateDataUrl = `data:${licensePlateMime};base64,${licensePlateBase64}`;

      const secondaryImageDataUrls = await Promise.all(
        secondaryImages.map(async (image) => {
          const { data, mime } = await fileToBase64(image.file);
          return `data:${mime};base64,${data}`;
        })
      );

      onAddVehicle({
        matricula,
        licensePlateImage: licensePlateDataUrl,
        secondaryImages: secondaryImageDataUrls,
        notes,
        driveFolderId,
      });

      resetForm();
      setStatusMessage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al procesar las imágenes.");
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-card p-6 space-y-6 border border-white/10">
      <h2 className="text-xl font-semibold">Nueva Ficha de Vehículo</h2>

      {/* License Plate Image Section */}
      <div>
        <label className="block text-sm font-medium mb-2">Foto de la Matrícula (Principal)</label>
        <div className="aspect-video bg-background rounded-lg flex items-center justify-center relative border-2 border-dashed border-gray-600 hover:border-accent/50 transition-colors">
            {/* Hidden inputs */}
            <input
              type="file"
              accept="image/*"
              onChange={handleLicensePlateImageChange}
              ref={galleryInputRef}
              className="hidden"
              id="gallery-upload"
              disabled={isLoading}
            />
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleLicensePlateImageChange}
              ref={cameraInputRef}
              className="hidden"
              id="camera-upload"
              disabled={isLoading}
            />

            {licensePlateImage.url ? (
              <>
                <img src={licensePlateImage.url} alt="Vista previa de matrícula" className="object-cover w-full h-full rounded-lg" />
                
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-white mt-2 text-sm font-medium">Analizando matrícula...</p>
                  </div>
                )}

                {/* Remove Image Button */}
                {!isLoading && (
                    <button
                        type="button"
                        onClick={() => setLicensePlateImage({ url: '', file: null })}
                        className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1.5 transition-opacity"
                        aria-label="Eliminar imagen de matrícula"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-center p-4">
                  <CameraIcon className="h-10 w-10 text-gray-400" />
                  <p className="text-gray-400">Añadir foto de la matrícula</p>
                  <div className="flex flex-wrap justify-center gap-3">
                      <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={isLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors text-sm font-medium"
                      >
                          <CameraIcon className="h-4 w-4" />
                          Usar Cámara
                      </button>
                      <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={isLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/10 text-gray-300 rounded-md hover:bg-gray-500/20 transition-colors text-sm font-medium"
                      >
                          {/* FIX: Corrected the malformed viewBox attribute from "0 0 24" 24"" to "0 0 24 24". */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          Desde Galería
                      </button>
                  </div>
              </div>
            )}
        </div>
      </div>
      
      {/* License Plate Text Input */}
      <div>
        <label htmlFor="matricula" className="flex items-center text-sm font-medium mb-2 gap-2">
          <SparklesIcon className="h-4 w-4 text-accent" />
          Matrícula
        </label>
        <input
            id="matricula"
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value.toUpperCase())}
            placeholder="Escriba o use la foto para OCR"
            className="block w-full max-w-sm mx-auto bg-background/50 border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:ring-accent focus:border-accent text-center text-xl font-semibold tracking-widest"
            required
        />
      </div>
      
      {/* Secondary Images */}
      <div>
        <label className="block text-sm font-medium mb-2">Fotos Adicionales (hasta {MAX_SECONDARY_IMAGES})</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {secondaryImages.map((image, index) => (
            <div key={index} className="relative group aspect-square">
              <img src={image.url} alt={`Foto secundaria ${index + 1}`} className="object-cover w-full h-full rounded-lg" />
              <button
                type="button"
                onClick={() => removeSecondaryImage(index)}
                className="absolute top-1 right-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Eliminar imagen"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {secondaryImages.length < MAX_SECONDARY_IMAGES && (
            <div className="aspect-square bg-background rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-600 hover:border-accent transition-colors p-4 text-center">
              <PlusIcon className="h-8 w-8 text-gray-400" />
              <p className="text-xs text-gray-400">Añadir fotos</p>
              <div className="flex flex-col w-full gap-2">
                <button
                  type="button"
                  onClick={() => secondaryCameraInputRef.current?.click()}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-colors text-xs font-medium"
                >
                  <CameraIcon className="h-4 w-4" />
                  Usar Cámara
                </button>
                <button
                  type="button"
                  onClick={() => secondaryGalleryInputRef.current?.click()}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-500/10 text-gray-300 rounded-md hover:bg-gray-500/20 transition-colors text-xs font-medium"
                >
                  Desde Galería
                </button>
              </div>
              <input
                ref={secondaryCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleSecondaryImageChange}
                disabled={isLoading}
              />
              <input
                ref={secondaryGalleryInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleSecondaryImageChange}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-2">Notas de Reparación</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Añadir detalles sobre la reparación, daños observados, etc."
          className="w-full bg-background/50 border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:ring-accent focus:border-accent"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {statusMessage && !error && <p className="text-sm text-accent">{statusMessage}</p>}
      
      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Procesando...' : 'Crear Ficha'}
      </button>
    </form>
  );
};

export default VehicleForm;
