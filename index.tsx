// Shim process for environments where it is missing to prevent ReferenceErrors
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: { API_KEY: '' } };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Critical error: Root element for React application not found.");
}