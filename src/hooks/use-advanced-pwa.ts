import { useEffect, useCallback } from 'react';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  registerBackgroundSync,
  showNotification,
  getSharedData,
} from '@/services/pwa-advanced';

/**
 * Hook for managing advanced PWA features
 * - Push notifications
 * - Background sync
 * - Share target
 */
export function useAdvancedPWA() {
  // Request push notification permission and subscribe
  const enablePushNotifications = useCallback(async (vapidPublicKey: string) => {
    try {
      const subscription = await subscribeToPushNotifications({ vapidPublicKey });
      if (subscription) {
        await showNotification('Notificações ativadas', {
          body: 'Você receberá atualizações do NEXDISPLAY',
          tag: 'notification-enabled',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to enable push notifications:', err);
      return false;
    }
  }, []);

  // Disable push notifications
  const disablePushNotifications = useCallback(async () => {
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        await showNotification('Notificações desativadas', {
          tag: 'notification-disabled',
        });
      }
      return success;
    } catch (err) {
      console.error('Failed to disable push notifications:', err);
      return false;
    }
  }, []);

  // Sync widgets data when online
  const syncWidgets = useCallback(async (widgetData: any) => {
    try {
      const success = await registerBackgroundSync({
        tag: 'sync-widgets',
        data: widgetData,
      });
      if (success) {
        await showNotification('Sincronização agendada', {
          body: 'Widgets serão sincronizados',
        });
      }
      return success;
    } catch (err) {
      console.error('Failed to sync widgets:', err);
      return false;
    }
  }, []);

  // Sync units data when online
  const syncUnits = useCallback(async (unitData: any) => {
    try {
      const success = await registerBackgroundSync({
        tag: 'sync-units',
        data: unitData,
      });
      if (success) {
        await showNotification('Sincronização agendada', {
          body: 'Unidades serão sincronizadas',
        });
      }
      return success;
    } catch (err) {
      console.error('Failed to sync units:', err);
      return false;
    }
  }, []);

  // Listen for shared data
  const getShared = useCallback(() => {
    return getSharedData();
  }, []);

  // Listen for background sync updates
  useEffect(() => {
    const handleWidgetsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Widgets updated from background sync:', customEvent.detail);
      // App can listen to this event and update UI
    };

    const handleUnitsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Units updated from background sync:', customEvent.detail);
    };

    window.addEventListener('nexdisplay:widgets-updated', handleWidgetsUpdated);
    window.addEventListener('nexdisplay:units-updated', handleUnitsUpdated);

    return () => {
      window.removeEventListener('nexdisplay:widgets-updated', handleWidgetsUpdated);
      window.removeEventListener('nexdisplay:units-updated', handleUnitsUpdated);
    };
  }, []);

  return {
    enablePushNotifications,
    disablePushNotifications,
    syncWidgets,
    syncUnits,
    getShared,
    showNotification,
  };
}
