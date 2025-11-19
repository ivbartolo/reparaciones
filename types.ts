export interface RepairRecord {
  id?: number;
  licensePlate: string;
  date: string;
  photos: string[]; // Base64 strings
  notes: string;
  driveFolderId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DriveConfig {
  clientId: string;
  apiKey: string;
}

export enum Tab {
  WORK = 'trabajo',
  RECORDS = 'fichas'
}

export enum ViewMode {
  LIST = 'list',
  GRID = 'grid'
}