import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function DevicePairing() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"generating" | "waiting" | "paired" | "error">("generating");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Check if device is already paired
  useEffect(() => {
    const checkIfPaired = async () => {
      try {
        console.log("🔍 Checking if device is already paired...");

        // Get device_token from localStorage if exists
        const storedToken = localStorage.getItem("device_token");
        if (storedToken) {
          console.log("✅ Device already paired, redirecting to player:", storedToken);
          window.location.href = `/player/${storedToken}`;
          return;
        }
      } catch (err) {
        console.warn("⚠️ Check paired failed:", err);
      }
    };

    checkIfPaired();
  }, []);

  // Poll for pairing status
  useEffect(() => {
    if (!deviceId || status === "paired") return;

    const pollForPairing = async () => {
      try {
        const response = await fetch(
          "https://qbxovcazqpgigrkirhwh.supabase.co/functions/v1/device-pairing",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check", device_id: deviceId }),
          }
        );

        const data = await response.json();
        console.log("🔍 Polling status:", data);

        if (data.paired && data.device_token) {
          console.log("✅ Device paired! Token:", data.device_token);
          localStorage.setItem("device_token", data.device_token);
          setStatus("paired");
          window.location.href = `/player/${data.device_token}`;
        }
      } catch (err) {
        console.warn("⚠️ Polling error:", err);
      }
    };

    const pollTimer = setInterval(pollForPairing, 3000);
    return () => clearInterval(pollTimer);
  }, [deviceId, status]);

  // Generate initial code and register in database
  useEffect(() => {
    const registerCode = async () => {
      const newCode = generatePairingCode();
      setCode(newCode);
      setTimeLeft(900);

      try {
        console.log("📝 Registering pairing code:", newCode);

        // Try using Supabase functions invoke (better for mobile)
        try {
          console.log("🔄 Registering code via fetch...");
          const response = await fetch(
            "https://qbxovcazqpgigrkirhwh.supabase.co/functions/v1/tv-register",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pairing_code: newCode }),
            }
          );

          const data = await response.json();
          console.log("📊 Register response:", { status: response.status, data });

          if (!response.ok) {
            throw new Error(data?.error || response.statusText);
          }

          console.log("✅ Pairing code registered:", newCode, "Device ID:", data?.id);
          if (data?.id) {
            setDeviceId(data.id);
            localStorage.setItem("device_id", data.id);
          }
          setStatus("waiting");
        } catch (err: any) {
          console.error("❌ Register failed:", err?.message);
          setStatus("error");
        }
      } catch (err: any) {
        console.error("❌ Register failed:", err?.message);
        console.error("Full error:", err);
        setStatus("error");
      }
    };

    registerCode();
  }, []);

  // Countdown timer for code expiration
  useEffect(() => {
    if (status !== "waiting") return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Code expired, regenerate
          const refreshCode = async () => {
            const newCode = generatePairingCode();
            setCode(newCode);

            try {
              console.log("🔄 Refreshing pairing code:", newCode);
              const response = await fetch(
                "https://qbxovcazqpgigrkirhwh.supabase.co/functions/v1/tv-register",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pairing_code: newCode }),
                }
              );

              const data = await response.json();
              if (!response.ok) {
                throw new Error(data?.error || response.statusText);
              }
              console.log("🎯 Pairing code refreshed:", newCode, "Device ID:", data?.id);
              if (data?.id) {
                setDeviceId(data.id);
                localStorage.setItem("device_id", data.id);
              }
            } catch (err) {
              console.error("❌ Code refresh error:", err);
            }
          };

          refreshCode();
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
              <p className="text-white/40 text-sm mt-6">Expira em: {formatTime(timeLeft)}</p>
              {deviceId && <p className="text-white/20 text-xs mt-4">ID: {deviceId.slice(0, 8)}...</p>}
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
              onClick={() => {
                const newCode = generatePairingCode();
                setCode(newCode);
                setStatus("waiting");
                setTimeLeft(900);
              }}
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
