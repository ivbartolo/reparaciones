const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    google?: any;
  }
}

let scriptPromise: Promise<void> | null = null;
let tokenClient: any = null;
let accessToken: string | null = null;

const ensureBrowserEnvironment = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('La integración con Google Drive solo está disponible en el navegador.');
  }
};

const loadGoogleIdentityScript = async () => {
  ensureBrowserEnvironment();

  if (scriptPromise) {
    return scriptPromise;
  }

  if (document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`)) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

const initTokenClient = async () => {
  await loadGoogleIdentityScript();

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID no está configurada en las variables de entorno.');
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services no está disponible en esta página.');
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {},
  });
};

const requestAccessToken = async (): Promise<string> => {
  if (!tokenClient) {
    await initTokenClient();
  }

  return new Promise<string>((resolve, reject) => {
    tokenClient.callback = (response: any) => {
      if (response.error) {
        reject(new Error(`No se pudo obtener el token de acceso de Google Drive: ${response.error}`));
        return;
      }
      accessToken = response.access_token;
      resolve(accessToken);
    };

    tokenClient.requestAccessToken({
      prompt: accessToken ? '' : 'consent',
    });
  });
};

const sanitizeFolderName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Carpeta_Vehiculo';
  }
  return trimmed.replace(/[\\/:*?"<>|]/g, '_');
};

const findExistingFolder = async (folderName: string, token: string): Promise<string | null> => {
  const query = encodeURIComponent(
    `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  const response = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name)&spaces=drive`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al buscar la carpeta en Google Drive.');
  }

  const result = await response.json();
  if (result.files && result.files.length > 0) {
    return result.files[0].id as string;
  }
  return null;
};

const createDriveFolder = async (folderName: string, token: string): Promise<string> => {
  const response = await fetch(DRIVE_FILES_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`No se pudo crear la carpeta en Google Drive: ${message}`);
  }

  const data = await response.json();
  return data.id as string;
};

const ensureDriveFolder = async (folderName: string, token: string) => {
  const existingId = await findExistingFolder(folderName, token);
  if (existingId) {
    return existingId;
  }
  return createDriveFolder(folderName, token);
};

export interface DriveUploadItem {
  file: Blob;
  name: string;
}

const uploadFileToDrive = async (folderId: string, item: DriveUploadItem, token: string) => {
  const metadata = {
    name: item.name,
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', item.file, item.name);

  const response = await fetch(DRIVE_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error al subir un archivo a Google Drive: ${errorText}`);
  }
};

export const uploadVehicleAssetsToDrive = async (
  rawFolderName: string,
  items: DriveUploadItem[]
): Promise<string> => {
  if (items.length === 0) {
    throw new Error('No hay archivos para subir a Google Drive.');
  }

  const token = await requestAccessToken();
  const folderName = sanitizeFolderName(rawFolderName);
  const folderId = await ensureDriveFolder(folderName, token);

  for (const item of items) {
    await uploadFileToDrive(folderId, item, token);
  }

  return folderId;
};


