import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { app } from './firebase';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// Google Drive file scope as configured via set_up_oauth
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token & user caching (never persisted in localStorage as mandated by security guidelines)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

/**
 * ამოწმებს არის თუ არა Google Drive კონფიგურირებული
 */
export const isDriveConfigured = (): boolean => true;

/**
 * Google Drive ინიციალიზაცია Firebase Auth-ის მეშვეობით
 */
export const initGoogleDrive = (onInit: (isInited: boolean) => void) => {
  onInit(true);

  onAuthStateChanged(auth, (user) => {
    cachedUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
  });
};

/**
 * Google ანგარიშით ავტორიზაცია და Google Drive Access Token-ის მიღება
 */
export const handleAuthClick = async (callback?: (token: string, user: User) => void): Promise<{ user: User; accessToken: string }> => {
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

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In შეცდომა:', error);
    throw error;
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
    const query = encodeURIComponent("trashed = false and (mimeType = 'application/json' or name contains '.json')");
    const url = `https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,modifiedTime,size)&q=${query}`;
    
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
 * დოკუმენტის შენახვა Google Drive-ზე (Create ან Update)
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

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Drive ფაილის ჩატვირთვა ვერ მოხერხდა (${response.status})`);
  }

  return await response.json();
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
