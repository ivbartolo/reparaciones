import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Save, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { RepairRecord } from '../types';
import { extractLicensePlate } from '../services/geminiService';
import { compressImage } from '../services/imageUtils';
import { saveRepair, deleteRepair } from '../services/db';
import { authenticateAndSync } from '../services/googleDriveService';

interface WorkTabProps {
  initialData?: RepairRecord;
  onSaveComplete: () => void;
  onCancel: () => void;
}

export const WorkTab: React.FC<WorkTabProps> = ({ initialData, onSaveComplete, onCancel }) => {
  // State
  const [licensePlate, setLicensePlate] = useState(initialData?.licensePlate || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Refs for file inputs
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  // Split refs for secondary photos (Camera vs Gallery)
  const secondaryCameraInputRef = useRef<HTMLInputElement>(null);
  const secondaryGalleryInputRef = useRef<HTMLInputElement>(null);

  // Sync state when initialData changes (e.g., when editing a different record)
  useEffect(() => {
    if (initialData) {
      setLicensePlate(initialData.licensePlate || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setPhotos(initialData.photos || []);
      setNotes(initialData.notes || '');
    } else {
      // Reset to defaults when creating new record
      setLicensePlate('');
      setDate(new Date().toISOString().split('T')[0]);
      setPhotos([]);
      setNotes('');
    }
  }, [initialData?.id]); // Only update when the record ID changes

  const handleMainPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    try {
      const compressed = await compressImage(file, 800); // Higher quality for OCR
      const text = await extractLicensePlate(compressed);
      if (text && text !== "UNKNOWN" && text !== "NO_API_KEY") {
        setLicensePlate(text);
      } else if (text === "NO_API_KEY") {
        alert("Por favor configura tu API KEY de Gemini en el entorno.");
      } else {
        alert("No se pudo detectar la matrícula. Inténtalo de nuevo o escríbela manualmente.");
      }
    } catch (err) {
      console.error(err);
      alert("Error procesando la imagen.");
    } finally {
      setIsProcessingOCR(false);
      if(mainInputRef.current) mainInputRef.current.value = '';
      if(galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleSecondaryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 12) {
      alert("Máximo 12 fotos permitidas.");
      return;
    }

    const newPhotos: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i], 500);
        newPhotos.push(compressed);
      } catch (err) {
        console.error("Error compressing photo", err);
      }
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    
    // Reset inputs
    if(secondaryCameraInputRef.current) secondaryCameraInputRef.current.value = '';
    if(secondaryGalleryInputRef.current) secondaryGalleryInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!licensePlate) {
      alert("Debes introducir una matrícula.");
      return;
    }

    setIsSaving(true);
    try {
      // Save locally
      const record: RepairRecord = {
        id: initialData?.id,
        licensePlate,
        date,
        photos,
        notes,
        createdAt: initialData?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      await saveRepair(record);

      // Sync with Drive
      setIsSyncing(true);
      try {
         await authenticateAndSync(licensePlate, photos);
      } catch (err) {
        console.error("Drive sync failed", err);
        alert("Guardado localmente, pero falló la sincronización con Drive. Verifica tu conexión o configuración.");
      } finally {
        setIsSyncing(false);
      }

      onSaveComplete();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la ficha.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (window.confirm("¿Estás seguro de eliminar esta ficha? Esta acción no se puede deshacer.")) {
      await deleteRepair(initialData.id);
      onSaveComplete();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden">
      
      {/* --- 1st Quarter: Date & Main Input (OCR) --- */}
      <div className="flex-shrink-0 min-h-[160px] bg-white p-4 shadow-sm flex flex-col justify-center items-center relative border-b border-slate-200 z-20">
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="absolute top-2 left-4 text-sm text-slate-500 bg-transparent border-none outline-none font-medium"
        />
        
        {/* License Plate Box - 50:11 Aspect Ratio */}
        <div className="w-full max-w-md relative">
           <div className="w-full aspect-plate bg-plate-yellow border-4 border-plate-border rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
             {/* European Blue Strip Decoration (Optional visual flair) */}
             <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-blue-700 flex flex-col items-center justify-start pt-1">
                <span className="text-[8px] text-white font-bold">E</span>
             </div>
             
             <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="MATRÍCULA"
                className="w-[85%] h-full bg-transparent text-center font-mono text-4xl md:text-5xl font-bold text-black placeholder-black/30 outline-none uppercase ml-auto tracking-wider"
             />
             
             {isProcessingOCR && (
               <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                 <Loader2 className="animate-spin mr-2" /> <span>Escaneando...</span>
               </div>
             )}
           </div>
        </div>

        <div className="flex gap-4 mt-4 w-full max-w-md justify-center">
          <button 
            onClick={() => mainInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow active:scale-95 transition-transform"
          >
            <Camera size={18} />
            <span className="text-sm font-medium">Escanear</span>
          </button>
          <input 
            type="file" 
            ref={mainInputRef} 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleMainPhoto}
          />

           <button 
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform"
          >
            <ImageIcon size={18} />
            <span className="text-sm font-medium">Galería</span>
          </button>
          <input 
            type="file" 
            ref={galleryInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleMainPhoto}
          />
        </div>
      </div>

      {/* --- 2nd & 3rd Quarter: Photo Grid (Up to 12) --- */}
      <div className="flex-1 bg-slate-100 p-2 overflow-y-auto min-h-0 pb-44 sm:pb-48">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <div key={index} className="aspect-[4/3] relative group rounded-lg overflow-hidden shadow-sm border border-slate-200 bg-white">
              <img src={photo} alt={`Detalle ${index}`} className="w-full h-full object-cover" />
              <button 
                onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          
          {photos.length < 12 && (
            <div className="aspect-[4/3] flex flex-col gap-3">
              <button 
                onClick={() => secondaryCameraInputRef.current?.click()}
                className="flex-1 w-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-300 shadow-md hover:bg-slate-50 active:bg-slate-100 transition-all py-4 gap-2"
              >
                <Camera size={28} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Cámara</span>
              </button>
              <button 
                onClick={() => secondaryGalleryInputRef.current?.click()}
                className="flex-1 w-full flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-300 shadow-md hover:bg-slate-50 active:bg-slate-100 transition-all py-4 gap-2"
              >
                <ImageIcon size={28} className="text-purple-600" />
                <span className="text-sm font-semibold text-slate-700">Galería</span>
              </button>
            </div>
          )}
          
          {/* Inputs for secondary photos */}
          <input 
            type="file" 
            ref={secondaryCameraInputRef} 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleSecondaryPhoto}
          />
          <input 
            type="file" 
            ref={secondaryGalleryInputRef} 
            multiple
            accept="image/*" 
            className="hidden" 
            onChange={handleSecondaryPhoto}
          />
        </div>
      </div>

      {/* --- 4th Quarter: Notes & Actions --- */}
      <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 flex flex-col z-30 shadow-[0_-8px_20px_rgba(0,0,0,0.15)]">
        {/* Notes */}
        <div className="px-4 pt-3 border-b border-slate-100">
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Añadir notas de la reparación..."
            className="w-full min-h-[60px] max-h-[80px] resize-none bg-slate-50 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            rows={2}
          />
        </div>

        {/* Actions - Fixed bottom with safe area */}
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px)+0.5rem)] pt-3 flex flex-col sm:flex-row items-stretch gap-3">
          {initialData && (
            <button 
              onClick={handleDelete}
              className="sm:flex-1 h-14 sm:h-16 bg-red-50 text-red-600 rounded-xl font-semibold text-base sm:text-lg flex items-center justify-center gap-2 hover:bg-red-100 active:bg-red-200 transition-colors"
            >
              <Trash2 size={20} />
              Eliminar
            </button>
          )}
          
          <button 
            onClick={handleSave}
            disabled={isSaving || isSyncing}
            className={`sm:flex-[2] h-14 sm:h-16 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 text-white transition-all shadow-xl active:scale-[0.98]
              ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'}
            `}
          >
            {isSaving ? (
              <><Loader2 className="animate-spin" size={22} /> <span className="hidden sm:inline">{isSyncing ? 'Selecciona cuenta...' : 'Guardando...'}</span><span className="sm:hidden">{isSyncing ? 'Sincronizando...' : 'Guardando...'}</span></>
            ) : (
              <><Save size={22} /> <span>{initialData ? 'Actualizar Ficha' : 'Guardar Ficha'}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};