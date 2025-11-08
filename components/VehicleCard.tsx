import React, { useState } from 'react';
import type { VehicleRecord } from '../types';
import { TrashIcon, EditIcon } from './icons';

interface VehicleCardProps {
  record: VehicleRecord;
  view: 'grid' | 'list';
  onEdit: (record: VehicleRecord) => void;
  onDelete: (id: string) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ record, view, onEdit, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete(record.id);
  };
  
  if (view === 'list') {
    return (
      <div className="bg-card rounded-lg p-3 sm:p-4 border border-white/10 shadow-md transition-all hover:border-accent/50 flex items-center gap-4">
        <img
          src={record.licensePlateImage}
          alt={`Matrícula ${record.matricula}`}
          className="w-24 sm:w-32 aspect-video object-cover rounded-md flex-shrink-0"
        />
        <div className="flex-grow">
          <p className="font-bold text-lg tracking-wider">{record.matricula}</p>
          <p className="text-xs text-gray-400">
            Creado: {record.createdAt.toLocaleDateString('es-ES')}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
           {!showDeleteConfirm ? (
              <>
                <button
                    onClick={() => onEdit(record)}
                    className="p-2 rounded-full bg-background/50 hover:bg-accent/20 text-gray-300 hover:text-accent transition-colors"
                    aria-label="Editar ficha"
                >
                    <EditIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 rounded-full bg-background/50 hover:bg-destructive/80 text-gray-300 hover:text-white transition-colors"
                    aria-label="Eliminar ficha"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 bg-background p-2 rounded-lg">
                <p className="text-xs text-gray-300 hidden sm:block">¿Seguro?</p>
                <button onClick={handleDelete} className="px-3 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/80">Sí</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500">No</button>
              </div>
            )}
        </div>
      </div>
    );
  }

  // Grid View (default)
  return (
    <div className="bg-card rounded-card p-4 sm:p-6 border border-white/10 shadow-lg relative transition-all hover:border-accent/50">
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {!showDeleteConfirm ? (
          <>
            <button
                onClick={() => onEdit(record)}
                className="p-2 rounded-full bg-background/50 hover:bg-accent/20 text-gray-300 hover:text-accent transition-colors"
                aria-label="Editar ficha"
            >
                <EditIcon className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-full bg-background/50 hover:bg-destructive/80 text-gray-300 hover:text-white transition-colors"
                aria-label="Eliminar ficha"
            >
                <TrashIcon className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-background p-2 rounded-lg">
             <p className="text-xs text-gray-300">¿Seguro?</p>
             <button onClick={handleDelete} className="px-3 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/80">Sí</button>
             <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500">No</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <p className="text-sm font-medium text-accent">Matrícula</p>
          <img
            src={record.licensePlateImage}
            alt={`Matrícula ${record.matricula}`}
            className="w-full aspect-video object-cover rounded-lg"
          />
          <div className="bg-background/50 rounded-md p-3 text-center">
            <p className="text-lg font-bold tracking-wider text-primary">
              {record.matricula || 'No identificada'}
            </p>
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <p className="text-sm font-medium text-accent mb-2">Notas</p>
            <div className="bg-background/50 rounded-md p-3 max-h-28 overflow-y-auto">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {record.notes || 'Sin notas.'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-accent mb-2">Fotos Adicionales</p>
            {record.secondaryImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {record.secondaryImages.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Foto adicional ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay fotos adicionales.</p>
            )}
          </div>
        </div>
      </div>
       <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-xs text-gray-500">
            Creado: {record.createdAt.toLocaleString('es-ES')}
        </p>
      </div>
    </div>
  );
};

export default VehicleCard;