import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeAdvancedPWAFeatures } from "./services/pwa-advanced";

// Register Service Worker
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("SW registered:", reg.scope);
        // Save last sync time when online
        if (navigator.onLine) {
          localStorage.setItem("nexdisplay_last_sync", new Date().toISOString());
        }

        // Initialize advanced PWA features
        initializeAdvancedPWAFeatures().catch(err =>
          console.warn("Advanced PWA features initialization failed:", err)
        );

        // Listen for periodic sync updates
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data.type === "WIDGETS_UPDATED") {
            console.log("Widgets updated from background sync:", event.data.data);
            // Dispatch custom event for app to react
            window.dispatchEvent(new CustomEvent("nexdisplay:widgets-updated", {
              detail: event.data.data
            }));
          } else if (event.data.type === "UNITS_UPDATED") {
            console.log("Units updated from background sync:", event.data.data);
            window.dispatchEvent(new CustomEvent("nexdisplay:units-updated", {
              detail: event.data.data
            }));
          }
        });
      })
      .catch((err) => console.log("SW registration failed:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
