import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing Firebase app instance or initialize
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider configured with Google Drive scopes
const driveProvider = new GoogleAuthProvider();
driveProvider.addScope('https://www.googleapis.com/auth/drive');
driveProvider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (SECURITY: Never stored in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveBackupFile {
  id: string;
  name: string;
  size?: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
}

/**
 * Initialize Drive Auth listener. Call on mount.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google Drive scopes via popup
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive OAuth access token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out of Google Drive and clear token
 */
export const signOutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Get the in-memory access token
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Upload an ERP backup file to user's Google Drive using multipart upload
 */
export const uploadBackupToGoogleDrive = async (
  fileName: string,
  content: string,
  mimeType: string = 'application/json'
): Promise<DriveBackupFile> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google Drive is not connected. Please connect your Google account first.');
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: 'Automated Multi-Company ERP Enterprise Database Backup',
    properties: {
      erpSystem: 'MultiCompanyERP',
      backupType: fileName.endsWith('.sql') ? 'sql' : 'json',
      timestamp: new Date().toISOString(),
    },
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType,createdTime,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Google Drive upload failed with status ${response.status}`
    );
  }

  const result: DriveBackupFile = await response.json();
  return result;
};

/**
 * List ERP backups stored in user's Google Drive
 */
export const listDriveBackups = async (): Promise<DriveBackupFile[]> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google Drive is not connected');
  }

  const query = encodeURIComponent("name contains 'erp_' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,mimeType,createdTime,modifiedTime,webViewLink)&orderBy=createdTime desc&pageSize=25`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to list files from Google Drive (status ${response.status})`
    );
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Download a backup file's raw text content from Google Drive
 */
export const downloadBackupContentFromDrive = async (fileId: string): Promise<string> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google Drive is not connected');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file from Google Drive (status ${response.status})`);
  }

  return await response.text();
};

/**
 * Delete a backup file from Google Drive (User confirmation must be verified before calling)
 */
export const deleteBackupFromDrive = async (fileId: string): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('Google Drive is not connected');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete file from Google Drive (status ${response.status})`);
  }
};
