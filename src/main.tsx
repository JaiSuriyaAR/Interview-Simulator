import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Filter out benign Vite HMR WebSocket errors that can cause confusing "Unhandled Rejection" overlays
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.message?.includes('WebSocket closed without opened') ||
    event.reason.message?.includes('failed to connect to websocket')
  )) {
    event.preventDefault();
    // Silently consume these benign errors
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
