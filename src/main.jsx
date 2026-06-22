import { createRoot } from "react-dom/client";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";
import { registerSW } from 'virtual:pwa-register';

// Limpiar automáticamente service workers antiguos con conflictos de caché en localhost
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      Promise.all(registrations.map(r => r.unregister())).then(() => {
        console.log("Service Workers obsoletos desregistrados para evitar conflictos.");
        registerSW({ immediate: true });
      });
    } else {
      registerSW({ immediate: true });
    }
  }).catch(() => {
    registerSW({ immediate: true });
  });
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")).render(
  <>
    <Toaster position="top-right" reverseOrder={false} />
    <App />
  </>
);
