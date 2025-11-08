import React, { useState } from 'react';
import type { VehicleRecord } from './types';
import VehicleForm from './components/VehicleForm';
import VehicleCard from './components/VehicleCard';
import EditForm from './components/EditForm';
import { CarIcon, LayoutGridIcon, ListIcon } from './components/icons';

type ViewMode = 'grid' | 'list';

const App: React.FC = () => {
  const [vehicleRecords, setVehicleRecords] = useState<VehicleRecord[]>([]);
  const [view, setView] = useState<ViewMode>('grid');
  const [editingRecord, setEditingRecord] = useState<VehicleRecord | null>(null);

  const addVehicleRecord = (record: Omit<VehicleRecord, 'id' | 'createdAt'>) => {
    const newRecord: VehicleRecord = {
      ...record,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setVehicleRecords(prevRecords => [newRecord, ...prevRecords]);
  };
  
  const updateVehicleRecord = (id: string, updatedData: Omit<VehicleRecord, 'id' | 'createdAt'>) => {
    setVehicleRecords(prevRecords =>
      prevRecords.map(record =>
        record.id === id ? { ...record, ...updatedData } : record
      )
    );
    setEditingRecord(null); // Close modal on save
  };

  const deleteVehicleRecord = (id: string) => {
    setVehicleRecords(prevRecords => prevRecords.filter(record => record.id !== id));
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-center gap-4">
          <div className="bg-accent/10 p-3 rounded-lg">
            <CarIcon className="h-8 w-8 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">Gestor de Reparaciones de Vehículos</h1>
            <p className="text-sm sm:text-base text-gray-400">Crea y administra fichas de vehículos de forma rápida y eficiente.</p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <VehicleForm onAddVehicle={addVehicleRecord} />
          </div>
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Fichas Recientes</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-white/10'}`}
                  aria-label="Vista de lista"
                >
                  <ListIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-white/10'}`}
                  aria-label="Vista de cuadrícula"
                >
                  <LayoutGridIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {vehicleRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-card rounded-card border border-dashed border-gray-600 p-8">
                <p className="text-gray-400 text-center">Aún no has creado ninguna ficha de vehículo.</p>
                <p className="text-gray-500 text-sm text-center mt-2">Usa el formulario para empezar.</p>
              </div>
            ) : (
              <div className={view === 'grid'
                  ? "grid grid-cols-1 xl:grid-cols-2 gap-6"
                  : "space-y-4"
              }>
                {vehicleRecords.map(record => (
                  <VehicleCard
                    key={record.id}
                    record={record}
                    view={view}
                    onEdit={() => setEditingRecord(record)}
                    onDelete={deleteVehicleRecord}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
           <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-card border border-white/10 shadow-2xl">
              <EditForm 
                record={editingRecord}
                onUpdate={updateVehicleRecord}
                onCancel={() => setEditingRecord(null)}
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default App;