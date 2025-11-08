export interface VehicleRecord {
  id: string;
  matricula: string;
  licensePlateImage: string; // base64 data URL
  secondaryImages: string[]; // array of base64 data URLs
  notes: string;
  createdAt: Date;
  driveFolderId?: string;
}