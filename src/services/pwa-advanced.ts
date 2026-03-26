/**
 * Advanced PWA Features
 * - Web Push Notifications
 * - Background Sync
 * - Periodic Background Sync
 * - Protocol Handlers
 * - Share Target
 */

// ==============================================================
// 1. PUSH NOTIFICATIONS
// ==============================================================

interface PushSubscriptionOptions {
  vapidPublicKey: string;
}

/**
 * Request permission and subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  options: PushSubscriptionOptions
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push Notifications not supported');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Already subscribed to push');
      return existingSubscription;
    }

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: options.vapidPublicKey,
    });

    console.log('Subscribed to push notifications:', subscription.endpoint);

    // TODO: Send subscription to your backend
    // await fetch('/api/subscribe-push', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription),
    // });

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (err) {
    console.error('Unsubscribe failed:', err);
    return false;
  }
}

// ==============================================================
// 2. BACKGROUND SYNC
// ==============================================================

interface SyncTask {
  tag: string;
  data?: Record<string, any>;
}

/**
 * Register a background sync task
 * Task will run in Service Worker when network is available
 */
export async function registerBackgroundSync(task: SyncTask): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Store task data in IndexedDB for Service Worker to retrieve
    if (task.data) {
      await saveSyncTaskData(task.tag, task.data);
    }

    // Register sync
    await registration.sync.register(task.tag);
    console.log(`Background sync registered: ${task.tag}`);
    return true;
  } catch (err) {
    console.error('Background sync registration failed:', err);
    return false;
  }
}

/**
 * Save sync task data to IndexedDB
 */
async function saveSyncTaskData(tag: string, data: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nexdisplay-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      store.put({ tag, data, timestamp: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'tag' });
      }
    };
  });
}

/**
 * Get sync task data from IndexedDB
 */
export async function getSyncTaskData(tag: string): Promise<Record<string, any> | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nexdisplay-sync', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('tasks', 'readonly');
      const store = tx.objectStore('tasks');
      const getRequest = store.get(tag);

      getRequest.onsuccess = () => {
        resolve(getRequest.result?.data ?? null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

// ==============================================================
// 3. PERIODIC BACKGROUND SYNC
// ==============================================================

interface PeriodicSyncOptions {
  minInterval: number; // milliseconds (minimum 15 minutes on most browsers)
}

/**
 * Register periodic background sync
 * Task will run periodically even when app is closed
 */
export async function registerPeriodicSync(
  tag: string,
  options: PeriodicSyncOptions
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Periodic Background Sync not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // @ts-ignore - periodicSync is not in TypeScript yet
    await registration.periodicSync.register(tag, { minInterval: options.minInterval });
    console.log(`Periodic sync registered: ${tag}`);
    return true;
  } catch (err) {
    console.error('Periodic sync registration failed:', err);
    return false;
  }
}

/**
 * Unregister periodic sync
 */
export async function unregisterPeriodicSync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    // @ts-ignore
    await registration.periodicSync.unregister(tag);
    console.log(`Periodic sync unregistered: ${tag}`);
    return true;
  } catch (err) {
    console.error('Periodic sync unregister failed:', err);
    return false;
  }
}

// ==============================================================
// 4. SHOW LOCAL NOTIFICATION
// ==============================================================

export interface NotificationOptions {
  title: string;
  options?: NotificationOptions;
}

/**
 * Show a local notification
 */
export async function showNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not available');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      ...options,
    });
  } catch (err) {
    console.error('Failed to show notification:', err);
  }
}

// ==============================================================
// 5. PROTOCOL HANDLERS
// ==============================================================

/**
 * Handle protocol URLs (e.g., nexdisplay://widget/123)
 * Called when app handles custom protocol
 */
export function handleProtocolUrl(url: string): void {
  try {
    const protocolUrl = new URL(url);
    const params = new URLSearchParams(protocolUrl.search);

    const action = params.get('action');
    const protocol = params.get('protocol');

    if (protocol) {
      // Parse nexdisplay://action/param format
      const parts = protocol.split('/');
      const [actionType, ...args] = parts;

      console.log(`Protocol handler: ${actionType}`, args);

      switch (actionType) {
        case 'widget':
          // Navigate to widget: nexdisplay://widget/123
          window.location.href = `/?widget=${args[0]}`;
          break;
        case 'unit':
          // Navigate to unit: nexdisplay://unit/456
          window.location.href = `/?unit=${args[0]}`;
          break;
        default:
          console.warn(`Unknown protocol action: ${actionType}`);
      }
    }

    if (action === 'new-note') {
      window.location.href = '/?action=new-note';
    }
  } catch (err) {
    console.error('Protocol handler error:', err);
  }
}

// ==============================================================
// 6. SHARE TARGET
// ==============================================================

/**
 * Get shared data from Web Share API
 */
export function getSharedData(): Record<string, any> | null {
  const params = new URLSearchParams(window.location.search);

  if (!params.has('action') || params.get('action') !== 'share') {
    return null;
  }

  return {
    title: params.get('title'),
    text: params.get('text'),
    url: params.get('url'),
    image: params.get('image'),
  };
}

// ==============================================================
// 7. INITIALIZE ADVANCED FEATURES
// ==============================================================

export async function initializeAdvancedPWAFeatures(): Promise<void> {
  // Handle protocol URLs
  if (window.location.search.includes('protocol')) {
    handleProtocolUrl(window.location.href);
  }

  // Handle share targets
  const sharedData = getSharedData();
  if (sharedData) {
    console.log('Shared data received:', sharedData);
    // TODO: Process shared data
  }

  // Register periodic sync (every 15 minutes - minimum allowed)
  try {
    await registerPeriodicSync('sync-widgets', { minInterval: 15 * 60 * 1000 });
    await registerPeriodicSync('sync-units', { minInterval: 15 * 60 * 1000 });
  } catch (err) {
    console.log('Periodic sync unavailable (browser may not support it)');
  }

  console.log('Advanced PWA features initialized');
}
