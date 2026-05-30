import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Add Google Sheets Scope
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleUserInfo {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

// Check for cached token or retrieve in-memory token
export const initGoogleAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Login Google Sheets gagal:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getCachedAccessToken = () => cachedAccessToken;

// Google Sheets API integrations
export interface SyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  successCount: number;
}

// Create a new spreadsheet with header rows
export const createNewSpreadsheet = async (accessToken: string, title = 'Laporan Absensi PT SPR HRIS'): Promise<string> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize spreadsheet with structured headers
  await updateSheetHeaders(accessToken, spreadsheetId);

  return spreadsheetId;
};

// Help helper to write column headers on row 1
export const updateSheetHeaders = async (accessToken: string, spreadsheetId: string) => {
  const headers = [
    ['Nama Karyawan', 'Departemen', 'Jabatan', 'Tanggal', 'Shift', 'Jam Masuk', 'Jam Keluar', 'Durasi', 'Status Kehadiran', 'Note / Keterangan', 'Status Kerja']
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:K1?valueInputOption=USER_ENTERED`;
  await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: headers
    })
  });
};

// Sync records directly by clearing the sheet and repopulating all (to guarantee accurate state)
export const syncAllRecordsToSheet = async (accessToken: string, spreadsheetId: string, records: any[]): Promise<number> => {
  // First clear Sheet1!A2:K10000
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:K10000:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (records.length === 0) return 0;

  // Map structured array values
  const values = records.map(r => [
    r.nama || '',
    r.departemen || '',
    r.jabatan || '',
    r.date || '',
    r.shift || '',
    r.checkInTime || '',
    r.checkOutTime || '',
    r.duration || '',
    r.status || '',
    r.note || '',
    r.workStatus || ''
  ]);

  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2?valueInputOption=USER_ENTERED`;
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal mengirimkan sinkronasi baris data absensi ke Google Sheet');
  }

  return records.length;
};
