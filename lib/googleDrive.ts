import { 
  getAuth, 
  signInWithPopup, 
  signInWithCredential, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { app } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

const CLIENT_ID: string = (firebaseConfig as any)?.oAuthClientId || '696464881248-qfd563bcmq119cle0jm9nstbui1urhn5.apps.googleusercontent.com';

// In-memory token & user caching
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

/**
 * ამოწმებს და უზრუნველყოფს Google Identity Services (GIS) სკრიპტის ჩატვირთვას
 */
export const ensureGisLoaded = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
    return true;
  }

  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(Boolean(window.google?.accounts?.oauth2));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts >= 25) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    }
  });
};

/**
 * ამოწმებს არის თუ არა Google Drive კონფიგურირებული
 */
export const isDriveConfigured = (): boolean => Boolean(CLIENT_ID);

/**
 * Google Drive ინიციალიზაცია
 */
export const initGoogleDrive = (onInit: (isInited: boolean) => void) => {
  onInit(true);

  // დარწმუნდით რომ GIS სკრიპტი ჩატვირთულია ფონზე
  ensureGisLoaded().catch(() => {});

  onAuthStateChanged(auth, (user) => {
    cachedUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
  });
};

/**
 * Google ანგარიშით ავტორიზაცია Google Identity Services (GIS) ან Firebase Fallback-ით
 */
export const handleAuthClick = async (
  callback?: (token: string, user?: any) => void
): Promise<{ accessToken: string; user?: any }> => {
  const isGisReady = await ensureGisLoaded();

  // 1. ვცდილობთ პირდაპირ Google Identity Services (GIS) token client-ის გამოყენებას,
  // რომელიც პირდაპირ Google-ის OAuth ფანჯარას ხსნის და არ საჭიროებს Firebase-ის __/auth/handler დომენს
  if (isGisReady && window.google?.accounts?.oauth2) {
    return new Promise((resolve, reject) => {
      try {
        let isHandled = false;

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file',
          prompt: 'consent',
          callback: async (tokenResponse: any) => {
            if (isHandled) return;
            isHandled = true;

            if (tokenResponse.error) {
              console.error('Google Identity Services შეცდომა:', tokenResponse);
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
              return;
            }

            const token = tokenResponse.access_token;
            if (!token) {
              reject(new Error('Google Drive access token არ დაბრუნდა'));
              return;
            }

            cachedAccessToken = token;

            // ვუკავშირებთ Firebase Auth-საც (თუ მხარდაჭერილია)
            try {
              const credential = GoogleAuthProvider.credential(null, token);
              const userCred = await signInWithCredential(auth, credential);
              cachedUser = userCred.user;
            } catch (firebaseErr) {
              console.warn('Firebase Auth სინქრონიზაცია (Google Drive API იმუშავებს ტოკენით):', firebaseErr);
            }

            if (callback) {
              callback(token, cachedUser);
            }

            resolve({ accessToken: token, user: cachedUser });
          },
          error_callback: (err: any) => {
            if (isHandled) return;
            isHandled = true;
            console.error('Google Identity Services შეცდომის კოლბექი:', err);
            reject(new Error(err?.message || 'Google Drive ავტორიზაცია შეწყდა'));
          },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        console.warn('GIS შეცდომა, ვცდილობთ Firebase Auth პოპაპს:', err);
        fallbackFirebasePopup(callback).then(resolve).catch(reject);
      }
    });
  }

  // 2. Fallback: Firebase Auth signInWithPopup
  return fallbackFirebasePopup(callback);
};

const fallbackFirebasePopup = async (
  callback?: (token: string, user?: any) => void
): Promise<{ accessToken: string; user?: any }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Drive access token არ დაბრუნდა');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;

    if (callback) {
      callback(cachedAccessToken, result.user);
    }

    return { accessToken: cachedAccessToken, user: cachedUser };
  } catch (err: any) {
    console.error('Firebase Auth Popup შეცდომა:', err);
    throw err;
  }
};

/**
 * სისტემიდან გამოსვლა
 */
export const handleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    cachedUser = null;
  }
};

/**
 * Google Drive-ზე არსებული დოკუმენტების სიის წაკითხვა
 */
export const listDriveFiles = async (): Promise<any[]> => {
  if (!cachedAccessToken) {
    console.warn('Google Drive access token არ არის მეხსიერებაში');
    return [];
  }

  try {
    const query = encodeURIComponent("trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,modifiedTime,size)&q=${query}&orderBy=modifiedTime desc`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Drive list error:', response.status, errText);
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error('Error listing files from Google Drive:', err);
    return [];
  }
};

/**
 * დოკუმენტის შენახვა Google Drive-ზე
 */
export const saveToDrive = async (doc: any): Promise<any> => {
  if (!cachedAccessToken) {
    throw new Error('Google Drive-ზე შესანახად გთხოვთ გაიაროთ ავტორიზაცია Google-ით.');
  }

  const fileContent = JSON.stringify(doc);
  const fileName = doc.name && doc.name.endsWith('.json') ? doc.name : `${doc.name || 'document'}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelim;

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (doc.googleDriveId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${doc.googleDriveId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive შენახვის შეცდომა (${response.status}): ${errorText}`);
  }

  return await response.json();
};

/**
 * დოკუმენტის ჩატვირთვა Google Drive-იდან
 */
export const loadFromDrive = async (fileId: string): Promise<any> => {
  if (!cachedAccessToken) {
    throw new Error('Google Drive-იდან ჩასატვირთად გთხოვთ გაიაროთ ავტორიზაცია Google-ით.');
  }

  // შევამოწმოთ ფაილის მეტამონაცემები
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });
  const meta = metaRes.ok ? await metaRes.json() : null;

  // თუ Google Doc-ია, გამოვიტანოთ როგორც HTML
  if (meta?.mimeType === 'application/vnd.google-apps.document') {
    const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`, {
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
    });
    if (exportRes.ok) {
      const html = await exportRes.text();
      return {
        id: `gdoc_${fileId}`,
        name: meta.name || 'Google Doc',
        content: html,
        updatedAt: Date.now(),
        createdAt: Date.now(),
        googleDriveId: fileId,
      };
    }
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Drive ფაილის ჩატვირთვა ვერ მოხერხდა (${response.status})`);
  }

  const rawText = await response.text();
  try {
    const parsed = JSON.parse(rawText);
    return parsed;
  } catch {
    return {
      id: `file_${fileId}`,
      name: meta?.name || 'Drive Document',
      content: rawText.startsWith('<') ? rawText : `<p>${rawText.replace(/\n/g, '<br>')}</p>`,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      googleDriveId: fileId,
    };
  }
};

/**
 * დოკუმენტის წაშლა Google Drive-იდან
 */
export const deleteFromDrive = async (fileId: string): Promise<boolean> => {
  if (!cachedAccessToken) return false;

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    });
    return response.ok;
  } catch (err) {
    console.error('Google Drive-იდან წაშლის შეცდომა:', err);
    return false;
  }
};

/**
 * Access Token-ის წაკითხვა
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};
