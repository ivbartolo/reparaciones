import React, { useState, useEffect } from 'react';
import { Tab, RepairRecord } from './types';
import { WorkTab } from './components/WorkTab';
import { RecordsTab } from './components/RecordsTab';
import { Wrench, FolderOpen } from 'lucide-react';
import { initGoogleDrive } from './services/googleDriveService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.WORK);
  const [editingRecord, setEditingRecord] = useState<RepairRecord | undefined>(undefined);

  useEffect(() => {
    // Attempt to initialize drive, but don't block app if it fails (e.g. offline)
    initGoogleDrive().catch(e => console.warn("Drive init warning:", e));
  }, []);

  const handleEdit = (record: RepairRecord) => {
    setEditingRecord(record);
    setActiveTab(Tab.WORK);
  };

  const handleSaveComplete = () => {
    setEditingRecord(undefined);
    setActiveTab(Tab.RECORDS);
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === Tab.WORK ? (
          <WorkTab 
            initialData={editingRecord} 
            onSaveComplete={handleSaveComplete}
            onCancel={() => {
              setEditingRecord(undefined);
              setActiveTab(Tab.RECORDS);
            }}
          />
        ) : (
          <RecordsTab onEdit={handleEdit} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-16 bg-white border-t border-slate-200 flex flex-row justify-around items-center shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
        <button
          onClick={() => {
             setEditingRecord(undefined);
             setActiveTab(Tab.WORK);
          }}
          className={`flex flex-col items-center justify-center w-1/2 h-full transition-colors ${
            activeTab === Tab.WORK ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Wrench size={24} />
          <span className="text-xs font-semibold mt-1">Trabajo</span>
        </button>
        <button
          onClick={() => setActiveTab(Tab.RECORDS)}
          className={`flex flex-col items-center justify-center w-1/2 h-full transition-colors ${
            activeTab === Tab.RECORDS ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <FolderOpen size={24} />
          <span className="text-xs font-semibold mt-1">Fichas</span>
        </button>
      </nav>
    </div>
  );
};

export default App;