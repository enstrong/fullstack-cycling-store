import { loadRoute } from "./route-loaders";
import { preloadHero } from "./preload-hero";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

preloadHero(window.location.pathname, "high");
loadRoute(window.location.pathname).catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)