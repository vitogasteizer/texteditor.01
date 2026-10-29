
// Google Cloud Console-ის პარამეტრები გარემოს ცვლადებიდან
const CLIENT_ID: string = (typeof process !== 'undefined' && (process.env.VITE_GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_DRIVE_CLIENT_ID)) || '';
const API_KEY: string = (typeof process !== 'undefined' && (process.env.VITE_GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY)) || '';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare var gapi: any;
declare var google: any;

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

/**
 * ამოწმებს არის თუ არა Google Drive API და OAuth პარამეტრები გამართული
 */
export const isDriveConfigured = (): boolean => {
    return Boolean(
        API_KEY && 
        API_KEY.trim() !== '' && 
        !API_KEY.includes('YOUR_GOOGLE') && 
        CLIENT_ID && 
        CLIENT_ID.trim() !== '' && 
        !CLIENT_ID.includes('YOUR_GOOGLE')
    );
};

export const initGoogleDrive = (onInit: (isInited: boolean) => void) => {
    // თუ API Key ან Client ID არ არის კონფიგურირებული, არ ვგზავნით არავალიდურ მოთხოვნას Drive API-ზე
    if (!isDriveConfigured()) {
        onInit(false);
        return;
    }

    const gapiLoaded = () => {
        try {
            if (typeof gapi === 'undefined' || !gapi.load) {
                onInit(false);
                return;
            }
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    if (gisInited) onInit(true);
                } catch (initErr) {
                    console.warn('Google Drive gapi.client.init შეცდომა:', initErr);
                    gapiInited = false;
                    onInit(false);
                }
            });
        } catch (e) {
            console.warn('Google Drive gapi.load შეცდომა:', e);
            onInit(false);
        }
    };

    const gisLoaded = () => {
        try {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
                onInit(false);
                return;
            }
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
            });
            gisInited = true;
            if (gapiInited) onInit(true);
        } catch (gisErr) {
            console.warn('Google Drive OAuth ინიციალიზაციის შეცდომა:', gisErr);
            gisInited = false;
            onInit(false);
        }
    };

    // შევამოწმოთ სკრიპტების ჩატვირთვა
    if (typeof gapi !== 'undefined') gapiLoaded();
    if (typeof google !== 'undefined') gisLoaded();
};

export const handleAuthClick = (callback: (token: any) => void) => {
    if (!tokenClient) return;
    tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
            console.error('OAuth შეცდომა:', resp);
            return;
        }
        callback(resp);
    };

    if (typeof gapi === 'undefined' || !gapi.client || gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
};

export const handleSignOut = () => {
    if (typeof gapi === 'undefined' || !gapi.client) return;
    const token = gapi.client.getToken();
    if (token !== null) {
        if (typeof google !== 'undefined' && google.accounts?.oauth2) {
            google.accounts.oauth2.revoke(token.access_token);
        }
        gapi.client.setToken('');
    }
};

export const listDriveFiles = async () => {
    try {
        if (typeof gapi === 'undefined' || !gapi.client?.drive?.files) {
            return [];
        }
        const response = await gapi.client.drive.files.list({
            'pageSize': 20,
            'fields': 'files(id, name, modifiedTime)',
            'q': "mimeType = 'application/json' and trashed = false",
        });
        return response.result?.files || [];
    } catch (err) {
        console.error("Error listing files", err);
        return [];
    }
};

export const saveToDrive = async (doc: any) => {
    try {
        if (typeof gapi === 'undefined' || !gapi.client?.getToken) {
            throw new Error('Google Drive API არ არის ხელმისაწვდომი');
        }
        const tokenObj = gapi.client.getToken();
        if (!tokenObj || !tokenObj.access_token) {
            throw new Error('ავტორიზაცია არ არის გავლილი');
        }
        const accessToken = tokenObj.access_token;
        const fileContent = JSON.stringify(doc);
        const file = new Blob([fileContent], { type: 'application/json' });
        const metadata = {
            name: doc.name + '.json',
            mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        if (doc.googleDriveId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${doc.googleDriveId}?uploadType=multipart`;
            method = 'PATCH';
        }

        const response = await fetch(url, {
            method: method,
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form,
        });
        
        return await response.json();
    } catch (e) {
        console.error("Save to Drive error:", e);
        return null;
    }
};

export const loadFromDrive = async (fileId: string) => {
    try {
        if (typeof gapi === 'undefined' || !gapi.client?.drive?.files) {
            return null;
        }
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.result;
    } catch (err) {
        console.error("Error loading file", err);
        return null;
    }
};
