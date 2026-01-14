import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Đảm bảo shim một lần nữa bên trong module
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: { API_KEY: '' } };
}

const container = document.getElementById('root');

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Không tìm thấy phần tử root!");
}