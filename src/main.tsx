import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
      })
      .catch((err) => console.log("SW registration failed:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
