import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, RefreshCw, Share2, Zap } from 'lucide-react';
import { useAdvancedPWA } from '@/hooks/use-advanced-pwa';
import { toast } from '@/hooks/use-toast';

/**
 * Component to manage advanced PWA features
 * - Push notifications
 * - Background sync
 * - Share target
 * - Periodic sync
 */
export function AdvancedPWASettings() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    enablePushNotifications,
    disablePushNotifications,
    syncWidgets,
    syncUnits,
  } = useAdvancedPWA();

  // NOTE: Replace with your actual VAPID public key from your backend
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

  const handleTogglePushNotifications = async () => {
    setLoading(true);
    try {
      if (pushEnabled) {
        const success = await disablePushNotifications();
        if (success) {
          setPushEnabled(false);
          toast({ title: 'Notificações desativadas' });
        }
      } else {
        if (!VAPID_PUBLIC_KEY) {
          toast({
            title: 'Erro',
            description: 'Chave VAPID não configurada',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const success = await enablePushNotifications(VAPID_PUBLIC_KEY);
        if (success) {
          setPushEnabled(true);
          toast({ title: 'Notificações ativadas' });
        } else {
          toast({
            title: 'Erro',
            description: 'Falha ao ativar notificações',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWidgets = async () => {
    setLoading(true);
    try {
      const success = await syncWidgets({ lastSync: new Date().toISOString() });
      if (success) {
        toast({ title: 'Sincronização agendada', description: 'Widgets serão sincronizados quando online' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUnits = async () => {
    setLoading(true);
    try {
      const success = await syncUnits({ lastSync: new Date().toISOString() });
      if (success) {
        toast({ title: 'Sincronização agendada', description: 'Unidades serão sincronizadas quando online' });
      }
    } finally {
      setLoading(false);
    }
  };

  const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (!isInstalled) {
    return null; // Only show for installed PWA
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Recursos Avançados da PWA
          </CardTitle>
          <CardDescription>
            Gerencie notificações, sincronização em background e mais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Notificações Push</p>
                <p className="text-sm text-muted-foreground">
                  Receba alertas em tempo real
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant={pushEnabled ? 'destructive' : 'default'}
              onClick={handleTogglePushNotifications}
              disabled={loading}
            >
              {pushEnabled ? 'Desativar' : 'Ativar'}
            </Button>
          </div>

          {/* Background Sync - Widgets */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Sincronizar Widgets</p>
                <p className="text-sm text-muted-foreground">
                  Sincronizar quando reconectar à internet
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncWidgets}
              disabled={loading}
            >
              Sincronizar
            </Button>
          </div>

          {/* Background Sync - Units */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Sincronizar Unidades</p>
                <p className="text-sm text-muted-foreground">
                  Sincronizar quando reconectar à internet
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncUnits}
              disabled={loading}
            >
              Sincronizar
            </Button>
          </div>

          {/* Share Target Info */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Compartilhamento</p>
                <p className="text-sm text-muted-foreground">
                  Compartilhe conteúdo com o app
                </p>
              </div>
            </div>
            <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
              Ativo
            </span>
          </div>

          {/* Info */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Nota:</strong> A sincronização em background funciona mesmo quando o app está fechado.
              Periodic sync requer configuração no servidor.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
