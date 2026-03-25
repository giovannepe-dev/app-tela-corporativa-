import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflinePage = () => {
  const lastSync = localStorage.getItem("nexdisplay_last_sync");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <WifiOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sem conexão</h1>
        <p className="text-muted-foreground">
          Você está offline. Verifique sua conexão com a internet e tente novamente.
        </p>
        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Última sincronização: {new Date(lastSync).toLocaleString("pt-BR")}
          </p>
        )}
        <Button
          onClick={() => window.location.reload()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar sincronizar
        </Button>
      </div>
    </div>
  );
};

export default OfflinePage;
