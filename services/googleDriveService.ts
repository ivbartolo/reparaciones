
// NOTE: In a real deployment, these would need to be valid credentials from Google Cloud Console
// Variables are injected via vite.config.ts define option
declare const process: {
  env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_API_KEY?: string;
  };
};

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '53444938082-3vvdk6jg6c69gl5dn6u82uls94auq345.apps.googleusercontent.com'; 
const API_KEY = process.env.GOOGLE_API_KEY || ''; 
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = async (): Promise<void> => {
  // We removed the simulation check to ensure the app ALWAYS attempts to initialize 
  // the Google clients, which is required to open the account picker menu later.
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Timeout waiting for Google scripts to load"));
      }
    }, 10000); // 10 second timeout

    const checkAndInit = () => {
      // Check if both scripts are loaded
      const gapiReady = typeof (window as any).gapi !== 'undefined';
      const googleReady = typeof (window as any).google !== 'undefined';

      if (gapiReady && !gapiInited) {
        (window as any).gapi.load('client', async () => {
          try {
            await (window as any).gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            gapiInited = true;
            if (gisInited && !resolved) {
              resolved = true;
              clearTimeout(timeout);
              resolve();
            }
          } catch (err) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              reject(err);
            }
          }
        });
      }

      if (googleReady && !gisInited) {
        try {
          tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Defined at request time
          });
          gisInited = true;
          if (gapiInited && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve();
          }
        } catch (err) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            reject(err);
          }
        }
      }

      // If not ready yet, check again in 100ms
      if (!resolved && (!gapiReady || !googleReady || !gapiInited || !gisInited)) {
        setTimeout(checkAndInit, 100);
      }
    };

    // Start checking
    checkAndInit();
  });
};

export const authenticateAndSync = async (folderName: string, photos: string[]): Promise<void> => {
  // This forces the app to call requestAccessToken, which opens the Google popup.
  
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
        // If initialization failed or scripts didn't load
        console.error("Google Drive client not initialized. Check your internet connection or Client ID.");
        reject("Google Drive client not initialized");
        return;
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        console.error("Auth Error:", resp);
        reject(resp);
        return; // Important: stop execution if error
      }
      try {
        await syncToDrive(folderName, photos);
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    // prompt: 'select_account' forces the Account Picker menu to open every time
    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};

const syncToDrive = async (folderName: string, photos: string[]) => {
  // Sanitize folder name to avoid issues with Google Drive
  // Remove or replace invalid characters
  const sanitizedFolderName = folderName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
    .trim()
    .substring(0, 100); // Limit length to 100 characters

  // 1. Create folder
  const folderId = await createFolder(sanitizedFolderName);

  // 2. Upload photos
  for (let i = 0; i < photos.length; i++) {
    // Simple progress log
    console.log(`Uploading photo ${i+1}/${photos.length}...`);
    await uploadFile(folderId, photos[i], `photo_${i + 1}.jpg`);
  }
};

const createFolder = async (name: string): Promise<string> => {
  const fileMetadata = {
    'name': name,
    'mimeType': 'application/vnd.google-apps.folder'
  };
  
  const response = await (window as any).gapi.client.drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  
  return response.result.id;
};

const uploadFile = async (folderId: string, base64Data: string, fileName: string) => {
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const contentType = 'image/jpeg';
  
  // Remove header if present
  const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const metadata = {
    'name': fileName,
    'parents': [folderId],
    'mimeType': contentType
  };

  const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + contentType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      '\r\n' +
      base64Content +
      close_delim;

  await (window as any).gapi.client.request({
    'path': '/upload/drive/v3/files',
    'method': 'POST',
    'params': {'uploadType': 'multipart'},
    'headers': {
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    'body': multipartRequestBody
  });
};
