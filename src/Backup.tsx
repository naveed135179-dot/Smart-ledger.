import { useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FILE_NAME = 'SmartLedger-Backup.json';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

function createBackup() {
  const data: Record<string, string> = {};

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('smartledger-')) {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }
  });

  return {
    app: 'SmartLedger',
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

function validateBackup(backup: any) {
  if (
    backup?.app !== 'SmartLedger' ||
    !backup.data ||
    typeof backup.data !== 'object' ||
    Array.isArray(backup.data)
  ) {
    throw new Error('Invalid SmartLedger backup.');
  }

  const entries = Object.entries(backup.data) as [string, unknown][];

  if (
    entries.length === 0 ||
    entries.some(([key, value]) =>
      !key.startsWith('smartledger-') || typeof value !== 'string'
    )
  ) {
    throw new Error('Backup data is invalid or empty.');
  }

  entries.forEach(([, value]) => JSON.parse(value as string));
  return entries as [string, string][];
}

function restoreData(backup: any) {
  const entries = validateBackup(backup);

  if (!window.confirm(
    'Restore this backup? Current SmartLedger data will be replaced.'
  )) return false;

  const oldData: Record<string, string> = {};

  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('smartledger-')) {
      oldData[key] = localStorage.getItem(key) || '';
    }
  });

  try {
    Object.keys(oldData).forEach(key => localStorage.removeItem(key));
    entries.forEach(([key, value]) => localStorage.setItem(key, value));
  } catch (error) {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('smartledger-')) localStorage.removeItem(key);
    });

    Object.entries(oldData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });

    throw error;
  }

  return true;
}

async function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(
      new Error('Could not load Google sign-in. Check your internet connection.')
    );
    document.head.appendChild(script);
  });
}

export default function Backup() {
  const [message, setMessage] = useState('');
  const [keyCount, setKeyCount] = useState(0);
  const [accessToken, setAccessToken] = useState('');
  const [busy, setBusy] = useState(false);
  const tokenClient = useRef<any>(null);

  const downloadBackup = () => {
    try {
      const backup = createBackup();
      const count = Object.keys(backup.data).length;
      setKeyCount(count);

      if (!count) {
        setMessage('No SmartLedger records found.');
        return;
      }

      const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: 'application/json' }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = FILE_NAME;
      link.click();
      URL.revokeObjectURL(url);

      setMessage(`Local backup created. ${count} categories saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup failed.');
    }
  };

  const restoreLocal = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text());

      if (restoreData(backup)) {
        setMessage('Local backup restored. Refresh the app.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed.');
    }

    event.target.value = '';
  };

  const connectGoogle = async () => {
    try {
      if (!CLIENT_ID) {
        throw new Error('Google Client ID is missing from the .env file.');
      }

      await loadGoogleIdentity();

      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            setMessage('Google connection failed: ' + response.error);
            return;
          }

          setAccessToken(response.access_token);
          setMessage('Google account connected successfully.');
        }
      });

      tokenClient.current.requestAccessToken();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google connection failed.');
    }
  };

  const backupToDrive = async () => {
    if (!accessToken) {
      setMessage('Connect your Google account first.');
      return;
    }

    setBusy(true);

    try {
      const backup = createBackup();

      if (!Object.keys(backup.data).length) {
        throw new Error('No SmartLedger records found.');
      }

      const search = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=' +
        encodeURIComponent("name='" + FILE_NAME + "' and trashed=false") +
        '&pageSize=10&orderBy=modifiedTime desc&fields=files(id,name)',
        {
          headers: { Authorization: 'Bearer ' + accessToken }
        }
      );

      if (!search.ok) throw new Error('Could not check Google Drive files.');

      const result = await search.json();
      const existing = result.files?.[0];

      const metadata = {
        name: FILE_NAME,
        mimeType: 'application/json'
      };

      const boundary = 'smartledger_boundary';
      const body =
        '--' + boundary + '\r\n' +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) + '\r\n' +
        '--' + boundary + '\r\n' +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(backup, null, 2) + '\r\n' +
        '--' + boundary + '--';

      const url = existing
        ? 'https://www.googleapis.com/upload/drive/v3/files/' +
          existing.id + '?uploadType=multipart'
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

      const upload = await fetch(url, {
        method: existing ? 'PATCH' : 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'multipart/related; boundary=' + boundary
        },
        body
      });

      if (!upload.ok) {
        throw new Error('Google Drive upload failed. Reconnect your account and try again.');
      }

      setMessage('Backup successfully saved to Google Drive.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloud backup failed.');
    } finally {
      setBusy(false);
    }
  };

  const restoreFromDrive = async () => {
    if (!accessToken) {
      setMessage('Connect your Google account first.');
      return;
    }

    setBusy(true);

    try {
      const search = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=' +
        encodeURIComponent("name='" + FILE_NAME + "' and trashed=false") +
        '&pageSize=10&orderBy=modifiedTime desc&fields=files(id,name)',
        {
          headers: { Authorization: 'Bearer ' + accessToken }
        }
      );

      if (!search.ok) throw new Error('Could not search Google Drive.');

      const result = await search.json();
      const file = result.files?.[0];

      if (!file) throw new Error('No SmartLedger backup found in this Google account.');

      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media',
        {
          headers: { Authorization: 'Bearer ' + accessToken }
        }
      );

      if (!response.ok) throw new Error('Could not download the cloud backup.');

      const backup = await response.json();

      if (restoreData(backup)) {
        setMessage('Google Drive backup restored. Refresh the app.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cloud restore failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backup-card">
      <h2>Backup & Restore</h2>
      <p>Protect your SmartLedger business data.</p>

      <section style={{ padding: 18, border: '1px solid #ddd', borderRadius: 10, marginBottom: 18 }}>
        <h3>Google Drive Backup</h3>
        <p>Connect your Google account to save your records online.</p>

        <button onClick={connectGoogle} disabled={busy}>
          {accessToken ? 'Google Account Connected' : 'Connect Google Account'}
        </button>

        <p>
          <button onClick={backupToDrive} disabled={busy || !accessToken}>
            Backup to Google Drive
          </button>
        </p>

        <button onClick={restoreFromDrive} disabled={busy || !accessToken}>
          Restore from Google Drive
        </button>
      </section>

      <section style={{ padding: 18, border: '1px solid #ddd', borderRadius: 10, marginBottom: 18 }}>
        <h3>Download Local Backup</h3>
        <p>Save all SmartLedger business records to a JSON file.</p>
        <button onClick={downloadBackup}>Download Backup</button>
        <p>Storage categories found: {keyCount}</p>
      </section>

      <section style={{ padding: 18, border: '1px solid #ddd', borderRadius: 10 }}>
        <h3>Restore Local Backup</h3>
        <p>Restore your records from a previous JSON backup.</p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={restoreLocal}
        />
      </section>

      {busy && <p>Processing backup...</p>}
      {message && <p>{message}</p>}
    </div>
  );
}
