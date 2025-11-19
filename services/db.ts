import Dexie, { Table } from 'dexie';
import { RepairRecord } from '../types';

class RepairDatabase extends Dexie {
  repairs!: Table<RepairRecord, number>;

  constructor() {
    super('RepairDatabase');
    // We define the schema, but rely on in-memory sorting for robustness
    // Cast to any to avoid TS errors with Dexie types in this environment
    (this as any).version(2).stores({
      repairs: '++id, licensePlate, date, createdAt, updatedAt'
    });
  }
}

export const db = new RepairDatabase();

export const saveRepair = async (repair: RepairRecord): Promise<number> => {
  if (repair.id) {
    await db.repairs.update(repair.id, {
      ...repair,
      updatedAt: Date.now()
    });
    return repair.id;
  } else {
    // Remove id if it's undefined to ensure auto-increment works cleanly
    const { id, ...newRecord } = repair;
    return await db.repairs.add({
      ...newRecord,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as RepairRecord);
  }
};

export const getAllRepairs = async (): Promise<RepairRecord[]> => {
  // Retrieve all records and sort in memory. 
  // This avoids "KeyPath not indexed" errors if the DB schema update fails to propagate 
  // correctly in the browser's IndexedDB implementation.
  const repairs = await db.repairs.toArray();
  return repairs.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const deleteRepair = async (id: number): Promise<void> => {
  await db.repairs.delete(id);
};