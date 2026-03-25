import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import nexLogo from "@/assets/nexdisplay-logo.png";

interface CalledTicket {
  id: string;
  ticket_number: string;
  ticket_type: string;
  counter_name: string;
  counter_number: number;
  called_at: string;
}

export default function QueueDisplay() {
  const { unitId } = useParams<{ unitId: string }>();
  const [currentTicket, setCurrentTicket] = useState<CalledTicket | null>(null);
  const [history, setHistory] = useState<CalledTicket[]>([]);
  const [now, setNow] = useState(new Date());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCalledRef = useRef<string | null>(null);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCalled = async () => {
    if (!unitId) return;
    const { data } = await supabase
      .from("tickets")
      .select("id, ticket_number, ticket_type, called_at, counter_id, counters(name, number)")
      .eq("unit_id", unitId)
      .in("status", ["called", "serving"])
      .order("called_at", { ascending: false })
      .limit(10);

    if (!data?.length) {
      setCurrentTicket(null);
      setHistory([]);
      return;
    }

    const mapped: CalledTicket[] = data.map((t: any) => ({
      id: t.id,
      ticket_number: t.ticket_number,
      ticket_type: t.ticket_type,
      counter_name: t.counters?.name ?? "",
      counter_number: t.counters?.number ?? 0,
      called_at: t.called_at,
    }));

    const latest = mapped[0];
    setCurrentTicket(latest);
    setHistory(mapped.slice(1, 6));

    // Play sound if new ticket
    if (latest && latest.id !== lastCalledRef.current) {
      lastCalledRef.current = latest.id;
      playBeep();
    }
  };

  const playBeep = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
      // Second beep
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.6);
      }, 300);
    } catch {}
  };

  useEffect(() => {
    fetchCalled();
    const channel = supabase
      .channel("queue-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `unit_id=eq.${unitId}` }, () => fetchCalled())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const typeColor = (type: string) => {
    switch (type) {
      case "preferencial": return "from-amber-500 to-orange-500";
      case "prioridade_especial": return "from-red-500 to-pink-500";
      case "emergencia": return "from-red-600 to-red-800";
      default: return "from-blue-500 to-cyan-500";
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "preferencial": return "PREFERENCIAL";
      case "prioridade_especial": return "PRIORIDADE";
      case "emergencia": return "EMERGÊNCIA";
      default: return "NORMAL";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222,47%,6%)] via-[hsl(222,40%,8%)] to-[hsl(222,47%,4%)] text-white flex flex-col overflow-hidden select-none cursor-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <img src={nexLogo} alt="NexDisplay" className="h-10 object-contain" />
        <div className="text-right">
          <p className="text-3xl font-bold font-mono tracking-wider">{formatTime(now)}</p>
          <p className="text-sm text-white/60 capitalize">{formatDate(now)}</p>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main - current ticket */}
        <div className="flex-1 flex items-center justify-center p-8">
          {currentTicket ? (
            <div className="text-center space-y-6 animate-in fade-in duration-500">
              <p className="text-2xl text-white/60 uppercase tracking-widest">Senha</p>
              <div className={`inline-block px-12 py-6 rounded-2xl bg-gradient-to-r ${typeColor(currentTicket.ticket_type)} shadow-2xl`}>
                <p className="text-8xl md:text-9xl font-black tracking-wider">{currentTicket.ticket_number}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xl text-white/80 uppercase tracking-wider">{typeLabel(currentTicket.ticket_type)}</p>
                <p className="text-3xl font-semibold">
                  Guichê <span className="text-gradient-nex font-black text-4xl">{currentTicket.counter_number}</span>
                </p>
                <p className="text-lg text-white/50">{currentTicket.counter_name}</p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-4xl text-white/30 font-light">Aguardando chamada...</p>
            </div>
          )}
        </div>

        {/* Sidebar - history */}
        <div className="w-80 border-l border-white/10 p-6 flex flex-col">
          <h3 className="text-sm uppercase tracking-widest text-white/40 mb-4">Últimas Chamadas</h3>
          <div className="space-y-3 flex-1">
            {history.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                <div>
                  <p className="font-mono font-bold text-lg">{t.ticket_number}</p>
                  <p className="text-xs text-white/40">{typeLabel(t.ticket_type)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">Guichê {t.counter_number}</p>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-white/20 text-sm text-center py-8">Sem chamadas anteriores</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-3 border-t border-white/10 flex items-center justify-center">
        <p className="text-xs text-white/30">NexDisplay — Gestão Inteligente</p>
      </footer>
    </div>
  );
}
