import { useState } from "react";
import { WifiOff, RefreshCw, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus, useInstallPrompt, useSWUpdate } from "@/hooks/use-pwa";
import { toast } from "sonner";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      Sem conexão com a internet
    </div>
  );
}

export function InstallBanner() {
  const { canInstall, isIOS, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!canInstall && !isIOS) return null;

  const handleInstall = async () => {
    if (isIOS) {
      toast.info("Toque em Compartilhar e depois em 'Adicionar à Tela de Início'", {
        duration: 6000,
        icon: <Share className="h-4 w-4" />,
      });
      return;
    }
    const accepted = await install();
    if (accepted) {
      toast.success("App instalado com sucesso!");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] bg-primary text-primary-foreground rounded-lg p-4 shadow-lg flex items-center justify-between gap-3 max-w-md mx-auto">
      <div className="flex items-center gap-3 min-w-0">
        <Download className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium truncate">
          {isIOS ? "Instale o NexDisplay no seu iPhone" : "Instalar NexDisplay"}
        </span>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDismissed(true)}
          className="text-xs"
        >
          Depois
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstall}
          className="text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          Instalar
        </Button>
      </div>
    </div>
  );
}

export function UpdateToast() {
  const { updateAvailable, applyUpdate } = useSWUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Atualização disponível</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Uma nova versão do app está pronta. Clique para atualizar agora.
        </p>
        <Button onClick={applyUpdate} className="w-full gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar agora
        </Button>
      </div>
    </div>
  );
}
