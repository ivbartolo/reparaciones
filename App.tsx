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
      {/* Tabs Navigation - Top */}
      <nav className="h-14 bg-white border-b border-slate-200 flex flex-row items-center shadow-sm z-10 sticky top-0">
        <button
          onClick={() => {
             setEditingRecord(undefined);
             setActiveTab(Tab.WORK);
          }}
          className={`flex-1 h-full flex items-center justify-center gap-2 transition-colors font-semibold ${
            activeTab === Tab.WORK 
              ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'
          }`}
        >
          <Wrench size={20} />
          <span>Trabajo</span>
        </button>
        <button
          onClick={() => setActiveTab(Tab.RECORDS)}
          className={`flex-1 h-full flex items-center justify-center gap-2 transition-colors font-semibold ${
            activeTab === Tab.RECORDS 
              ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' 
              : 'text-slate-500 hover:bg-slate-50 border-b-2 border-transparent'
          }`}
        >
          <FolderOpen size={20} />
          <span>Fichas</span>
        </button>
      </nav>

      {/* Main Content Area */}
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
    </div>
  );
};

export default App;