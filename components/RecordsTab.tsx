import React, { useEffect, useState } from 'react';
import { ViewMode, RepairRecord } from '../types';
import { getAllRepairs } from '../services/db';
import { LayoutGrid, List, Calendar, Car, Image as ImageIcon } from 'lucide-react';

interface RecordsTabProps {
  onEdit: (record: RepairRecord) => void;
}

export const RecordsTab: React.FC<RecordsTabProps> = ({ onEdit }) => {
  const [records, setRecords] = useState<RepairRecord[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.LIST);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllRepairs();
        setRecords(data);
      } catch (err) {
        console.error("Error loading records", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-slate-400">Cargando fichas...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
        <h2 className="font-bold text-lg text-slate-800">Fichas Guardadas ({records.length})</h2>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode(ViewMode.LIST)}
            className={`p-1.5 rounded-md transition-colors ${viewMode === ViewMode.LIST ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewMode(ViewMode.GRID)}
            className={`p-1.5 rounded-md transition-colors ${viewMode === ViewMode.GRID ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {records.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
             <Car size={48} className="mb-2" />
             <p>No hay reparaciones guardadas</p>
          </div>
        ) : (
          <div className={viewMode === ViewMode.GRID ? "grid grid-cols-2 gap-4" : "flex flex-col gap-3"}>
            {records.map((record) => (
              <div 
                key={record.id} 
                onClick={() => onEdit(record)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden active:scale-[0.98] transition-transform cursor-pointer"
              >
                {/* Grid View Card */}
                {viewMode === ViewMode.GRID ? (
                  <>
                    <div className="aspect-video bg-slate-100 relative">
                      {record.photos.length > 0 ? (
                        <img src={record.photos[0]} alt={record.licensePlate} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                        <p className="text-white font-bold font-mono text-lg truncate">{record.licensePlate}</p>
                      </div>
                    </div>
                    <div className="p-3">
                       <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                         <Calendar size={12} />
                         <span>{record.date}</span>
                       </div>
                       <p className="text-xs text-slate-600 line-clamp-2 h-8">
                         {record.notes || "Sin notas..."}
                       </p>
                    </div>
                  </>
                ) : (
                  /* List View Card */
                  <div className="flex p-3 gap-4 items-center">
                    <div className="w-20 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                       {record.photos.length > 0 ? (
                        <img src={record.photos[0]} alt={record.licensePlate} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold font-mono text-slate-800">{record.licensePlate}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> {record.date} 
                        <span className="mx-1">•</span> 
                        {record.photos.length} fotos
                      </p>
                    </div>
                    <div className="text-slate-400">
                      <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium">
                        Editar
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};