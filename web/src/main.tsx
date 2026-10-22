import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';
import { registerServiceWorker } from './pwa/register-service-worker';
import { HomeHydration } from './seo/home-hydration';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (window.location.pathname === '/' && root.dataset.homeYear) {
  hydrateRoot(root, <HomeHydration year={Number(root.dataset.homeYear)}>{app}</HomeHydration>);
} else {
  createRoot(root).render(app);
}

registerServiceWorker();
