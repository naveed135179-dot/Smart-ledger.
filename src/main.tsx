import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './index.css';
import App from './App.tsx';
import { initDatabase, verifyDatabaseMigration } from './database';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

async function startDatabase() {
  if (!Capacitor.isNativePlatform()) {
    console.info('Browser preview: using LocalStorage.');
    return;
  }

  try {
    await initDatabase();
    console.info('SmartLedger SQLite initialized.');
    console.info(
      'Database migration verification:',
      await verifyDatabaseMigration()
    );
  } catch (error) {
    console.error('SQLite initialization failed:', error);
  }
}

void startDatabase();
