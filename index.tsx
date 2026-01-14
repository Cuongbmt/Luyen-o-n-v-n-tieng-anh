import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Thêm shim một lần nữa ở mức module để đảm bảo các file import sau này không bị lỗi
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: { API_KEY: '' } };
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}