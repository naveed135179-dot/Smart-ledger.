import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { initDatabase, verifyDatabaseMigration } from './database';

async function startApp() {
  try {
    await initDatabase();
    console.info('SmartLedger SQLite initialized.');
    console.info('Database migration verification:', await verifyDatabaseMigration());
  } catch (error) {
    console.error('SQLite initialization failed. Continuing with existing storage.', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

startApp();
