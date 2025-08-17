// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.jsx'

// CSS global
import './index.css'
// CSS da barra inferior (mobile/PWA)
import './components/mobile/bottom-tabs.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// Registro do Service Worker (após o render)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registrado:', reg.scope);

        // Detecta quando um novo SW é encontrado
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // "installed" com controller ativo → há update pronto para aplicar
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Dispara evento global para o ReloadPrompt.jsx mostrar o banner
              window.dispatchEvent(new Event('sw.updated'));
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Falha no registro:', err));
  });
}
