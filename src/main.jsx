import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { registerServiceWorker } from './offline/registerServiceWorker';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </HashRouter>
  </StrictMode>
);

if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    registerServiceWorker({ baseUrl: import.meta.env.BASE_URL }).catch((error) => {
      console.error('離線快取安裝失敗', error);
    });
  }, { once: true });
}
