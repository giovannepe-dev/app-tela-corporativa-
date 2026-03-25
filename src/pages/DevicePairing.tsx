import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function DevicePairing() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState<"generating" | "waiting" | "paired" | "error">("generating");

  const registerDevice = useCallback(async () => {
    const pairingCode = generatePairingCode();
    setCode(pairingCode);

    const stored = localStorage.getItem("nexdisplay_device_id");

    try {
      const { data, error } = await supabase.functions.invoke("device-pairing", {
        body: {
          action: "register",
          device_id: stored || undefined,
          pairing_code: pairingCode,
        },
      });

      if (error || !data?.id) {
        // If stored device_id failed, try without it
        if (stored) {
          localStorage.removeItem("nexdisplay_device_id");
          const { data: newData, error: newError } = await supabase.functions.invoke("device-pairing", {
            body: {
              action: "register",
              pairing_code: pairingCode,
            },
          });
          if (newError || !newData?.id) {
            setStatus("error");
            return;
          }
          localStorage.setItem("nexdisplay_device_id", newData.id);
          setDeviceId(newData.id);
          setStatus("waiting");
          return;
        }
        setStatus("error");
        return;
      }

      localStorage.setItem("nexdisplay_device_id", data.id);
      setDeviceId(data.id);
      setStatus("waiting");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    registerDevice();
  }, [registerDevice]);

  // Listen for pairing (company_id changes from placeholder)
  useEffect(() => {
    if (!deviceId) return;
    const channel = supabase
      .channel(`pairing-${deviceId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "devices",
        filter: `id=eq.${deviceId}`,
      }, (payload: any) => {
        const updated = payload.new;
        if (updated.company_id && updated.company_id !== "00000000-0000-0000-0000-000000000000") {
          setStatus("paired");
          setTimeout(() => {
            if (updated.device_token) {
              navigate(`/player/${updated.device_token}`);
            }
          }, 2000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId, navigate]);

  // Refresh code every 14 minutes
  useEffect(() => {
    if (status !== "waiting") return;
    const interval = setInterval(() => {
      registerDevice();
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, [status, registerDevice]);

  // Heartbeat while waiting
  useEffect(() => {
    if (!deviceId || status === "paired") return;
    const ping = () => {
      supabase.functions.invoke("device-pairing", {
        body: { action: "heartbeat", device_id: deviceId },
      });
    };
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [deviceId, status]);

  return (
    <div className="h-screen w-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-center max-w-lg mx-auto px-8">
        <h1 className="text-white text-3xl font-bold mb-2">NexDisplay</h1>
        <p className="text-white/40 text-sm mb-12">Sistema de Sinalização Digital</p>

        {status === "generating" && (
          <div className="flex items-center justify-center">
            <div className="h-10 w-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {status === "waiting" && (
          <>
            <p className="text-white/60 text-lg mb-6">Digite este código no painel de administração</p>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
              <p className="text-white/40 text-xs uppercase tracking-[0.2em] mb-4">Código de Pareamento</p>
              <p className="text-6xl font-mono font-black text-blue-400 tracking-[0.4em] select-all">{code}</p>
            </div>
            <div className="space-y-2">
              <p className="text-white/30 text-sm">Aguardando pareamento...</p>
              <div className="flex items-center justify-center gap-1">
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
            <p className="text-white/20 text-xs mt-8">O código expira em 15 minutos e será renovado automaticamente</p>
          </>
        )}

        {status === "paired" && (
          <div className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 text-xl font-bold">Pareado com sucesso!</p>
            <p className="text-white/40 text-sm">Redirecionando para o player...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <p className="text-red-400 text-lg">Erro ao gerar código</p>
            <button
              onClick={() => { setStatus("generating"); registerDevice(); }}
              className="text-blue-400 text-sm underline"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
