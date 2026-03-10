
// REPLACE THESE WITH YOUR OWN VALUES FROM GOOGLE CLOUD CONSOLE
// https://console.cloud.google.com/
// 1. Create a project
// 2. Enable "Google Drive API"
// 3. Create OAuth 2.0 Client ID (Application type: Web application)
// 4. Create API Key
const CLIENT_ID = 'YOUR_GOOGLE_CLOUD_CLIENT_ID.apps.googleusercontent.com'; // <--- REPLACE THIS
const API_KEY = 'YOUR_GOOGLE_CLOUD_API_KEY'; // <--- REPLACE THIS

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare var gapi: any;
declare var google: any;

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = (onInit: (isInited: boolean) => void) => {
    const gapiLoaded = () => {
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            gapiInited = true;
            if (gisInited) onInit(true);
        });
    };

    const gisLoaded = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined later
        });
        gisInited = true;
        if (gapiInited) onInit(true);
    };

    // Check if script tags are loaded
    if (typeof gapi !== 'undefined') gapiLoaded();
    if (typeof google !== 'undefined') gisLoaded();
};

export const handleAuthClick = (callback: (token: any) => void) => {
    if (!tokenClient) return;
    tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        callback(resp);
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
};

export const handleSignOut = () => {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
};

export const listDriveFiles = async () => {
    try {
        const response = await gapi.client.drive.files.list({
            'pageSize': 20,
            'fields': 'files(id, name, modifiedTime)',
            'q': "mimeType = 'application/json' and trashed = false",
        });
        return response.result.files;
    } catch (err) {
        console.error("Error listing files", err);
        return [];
    }
};

export const saveToDrive = async (doc: any) => {
    const fileContent = JSON.stringify(doc);
    const file = new Blob([fileContent], { type: 'application/json' });
    const metadata = {
        name: doc.name + '.json', // Append .json for clarity in Drive
        mimeType: 'application/json',
    };

    const accessToken = gapi.client.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    // If doc has a googleDriveId, we update instead of create
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
};

export const loadFromDrive = async (fileId: string) => {
    try {
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        return response.result; // This should be the JSON content
    } catch (err) {
        console.error("Error loading file", err);
        return null;
    }
};
