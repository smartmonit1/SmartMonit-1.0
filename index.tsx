import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource-variable/inter';
import '@fontsource/material-icons';
import './index.css';
import { initPWA } from './utils/pwa';

// Initialisation PWA immédiate avant le rendu React pour capter beforeinstallprompt sans délai
initPWA();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
