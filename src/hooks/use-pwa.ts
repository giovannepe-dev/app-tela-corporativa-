import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === "accepted";
  };

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    isIOS: isIOS && !isInstalled,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return isOnline;
}

export function useSWUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // --- SW-based update detection ---
    if ("serviceWorker" in navigator) {
      const checkForWaiting = (reg: ServiceWorkerRegistration) => {
        if (reg.waiting) {
          setUpdateAvailable(true);
          setWaitingWorker(reg.waiting);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              setWaitingWorker(newWorker);
            }
          });
        });
      };

      navigator.serviceWorker.ready.then((reg) => {
        checkForWaiting(reg);
        const interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 30 * 1000);
        return () => clearInterval(interval);
      });

      let refreshing = false;
      const onControllerChange = () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    }

    // --- ETag polling: detect new deployments for all logged-in users ---
    let lastEtag: string | null = null;

    const checkDeployment = async () => {
      try {
        const res = await fetch("/?_check=" + Date.now(), {
          method: "HEAD",
          cache: "no-store",
        });
        const etag = res.headers.get("etag") || res.headers.get("last-modified") || "";
        if (!etag) return;

        if (lastEtag === null) {
          lastEtag = etag;
        } else if (lastEtag !== etag) {
          setUpdateAvailable(true);
        }
      } catch {
        // ignore
      }
    };

    checkDeployment();
    const deployInterval = setInterval(checkDeployment, 30 * 1000);

    return () => {
      clearInterval(deployInterval);
    };
  }, []);

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage("SKIP_WAITING");
      // controllerchange listener will reload
    } else {
      // No SW waiting, just hard reload
      window.location.reload();
    }
  };

  return { updateAvailable, applyUpdate };
}
