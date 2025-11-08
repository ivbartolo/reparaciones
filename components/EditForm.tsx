import React, { useState, useCallback } from 'react';
import type { VehicleRecord } from '../types';
import { extractLicensePlateText } from '../services/geminiService';
import { processImage, fileToBase64 } from '../utils/imageUtils';
import { CameraIcon, TrashIcon, PlusIcon, SparklesIcon } from './icons';

interface EditFormProps {
  record: VehicleRecord;
  onUpdate: (id: string, data: Omit<VehicleRecord, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const MAX_SECONDARY_IMAGES = 8;

const EditForm: React.FC<EditFormProps> = ({ record, onUpdate, onCancel }) => {
  const [matricula, setMatricula] = useState(record.matricula);
  const [licensePlateImage, setLicensePlateImage] = useState<{ url: string; file: File | null }>({ url: record.licensePlateImage, file: null });
  // State holds existing URLs (string) or new image objects { url, file }
  const [secondaryImages, setSecondaryImages] = useState<(string | { url: string; file: File })[]>(record.secondaryImages);
  const [notes, setNotes] = useState(record.notes);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLicensePlateImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const processedFile = await processImage(file, 800, 450);
      setLicensePlateImage({ url: URL.createObjectURL(processedFile), file: processedFile });
      
      const { data, mime } = await fileToBase64(processedFile);
      const text = await extractLicensePlateText(data, mime);
      if (text && text.toUpperCase() !== 'N/A') {
        setMatricula(text.toUpperCase());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al analizar la nueva imagen.");
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
    if (!matricula.trim()) {
      setError("El campo matrícula es obligatorio.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Process license plate image
      let licensePlateDataUrl = licensePlateImage.url;
      if (licensePlateImage.file) {
        const { data, mime } = await fileToBase64(licensePlateImage.file);
        licensePlateDataUrl = `data:${mime};base64,${data}`;
      }

      // Process secondary images
      const secondaryImageDataUrls = await Promise.all(
        secondaryImages.map(async (image) => {
          if (typeof image === 'string') {
            return image; // It's an existing URL
          }
          const { data, mime } = await fileToBase64(image.file);
          return `data:${mime};base64,${data}`;
        })
      );

      onUpdate(record.id, {
        matricula,
        licensePlateImage: licensePlateDataUrl,
        secondaryImages: secondaryImageDataUrls,
        notes,
      });

    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al procesar las imágenes.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Editar Ficha de Vehículo</h2>
        <button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-white/10">&times;</button>
      </div>
      
      {/* License Plate Image Section */}
      <div>
        <label className="block text-sm font-medium mb-2">Foto de la Matrícula</label>
        <div className="aspect-video bg-background rounded-lg flex items-center justify-center relative border-2 border-dashed border-gray-600">
            <input
              type="file"
              accept="image/*"
              onChange={handleLicensePlateImageChange}
              className="hidden"
              id="edit-image-upload"
              disabled={isLoading}
            />
            <img src={licensePlateImage.url} alt="Vista previa de matrícula" className="object-cover w-full h-full rounded-lg" />
            <label htmlFor="edit-image-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="text-center text-white">
                    <CameraIcon className="h-8 w-8 mx-auto"/>
                    <p className="text-sm mt-1">Cambiar foto</p>
                </div>
            </label>
        </div>
      </div>
      
      {/* License Plate Text Input */}
      <div>
        <label htmlFor="edit-matricula" className="flex items-center text-sm font-medium mb-2 gap-2">
          <SparklesIcon className="h-4 w-4 text-accent" />
          Matrícula
        </label>
        <input
            id="edit-matricula"
            type="text"
            value={matricula}
            onChange={(e) => setMatricula(e.target.value.toUpperCase())}
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
              <img src={typeof image === 'string' ? image : image.url} alt={`Foto secundaria ${index + 1}`} className="object-cover w-full h-full rounded-lg" />
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
            <label className="aspect-square bg-background rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-600 hover:border-accent transition-colors">
              <input type="file" multiple accept="image/*" onChange={handleSecondaryImageChange} className="hidden" />
              <PlusIcon className="h-8 w-8 text-gray-400" />
            </label>
          )}
        </div>
      </div>
      
      {/* Notes */}
      <div>
        <label htmlFor="edit-notes" className="block text-sm font-medium mb-2">Notas de Reparación</label>
        <textarea
          id="edit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full bg-background/50 border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:ring-accent focus:border-accent"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
         <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 hover:bg-white/10 focus:outline-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
      </div>
    </form>
  );
};

export default EditForm;