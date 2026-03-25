import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CalledTicket {
  id: string;
  ticket_number: string;
  ticket_type: string;
  counter_name: string;
  counter_number: number;
  called_at: string;
}

const typeColor: Record<string, string> = {
  preferencial: "text-amber-400",
  prioridade_especial: "text-red-400",
  emergencia: "text-red-500",
  normal: "text-blue-400",
};

const typeLabel: Record<string, string> = {
  preferencial: "PREFERENCIAL",
  prioridade_especial: "PRIORIDADE",
  emergencia: "EMERGÊNCIA",
  normal: "NORMAL",
};

export default function QueueWidgetPlayer({ props }: { props: Record<string, any> }) {
  const unitId = props.unitId;
  const showHistory = props.showHistory !== false;
  const historyCount = props.historyCount || 5;

  const [currentTicket, setCurrentTicket] = useState<CalledTicket | null>(null);
  const [history, setHistory] = useState<CalledTicket[]>([]);
  const lastCalledRef = useRef<string | null>(null);

  const playBeepAndDuck = async () => {
    // Dispatch event to duck other audio
    window.dispatchEvent(new CustomEvent("queue-call-start"));

    try {
      const ctx = new AudioContext();
      await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
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
        gain2.gain.setValueAtTime(0.4, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.6);
      }, 300);

      // Restore audio after beep finishes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("queue-call-end"));
      }, 2500);
    } catch {
      // Restore even if beep fails
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("queue-call-end"));
      }, 500);
    }
  };

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
    setHistory(mapped.slice(1, historyCount + 1));

    if (latest && latest.id !== lastCalledRef.current) {
      lastCalledRef.current = latest.id;
      playBeepAndDuck();
    }
  };

  useEffect(() => {
    if (!unitId) return;
    fetchCalled();
    const channel = supabase
      .channel(`queue-player-${unitId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `unit_id=eq.${unitId}` }, () => fetchCalled())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [unitId]);

  if (!unitId) {
    return (
      <div className="h-full w-full rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center justify-center">
        <p className="text-sm text-white/40">Configure a unidade no painel de propriedades</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col overflow-hidden">
      <p className="text-sm text-white/40 uppercase tracking-widest mb-2">Chamador</p>
      <div className="flex-1 flex items-center justify-center min-h-0">
        {currentTicket ? (
          <div className="text-center">
            <p className={`text-5xl font-black ${typeColor[currentTicket.ticket_type] || "text-blue-400"}`}>
              {currentTicket.ticket_number}
            </p>
            <p className="text-xs text-white/50 mt-1 uppercase">
              {typeLabel[currentTicket.ticket_type] || "NORMAL"}
            </p>
            <p className="text-lg text-white/60 mt-2">
              Guichê {currentTicket.counter_number}
            </p>
          </div>
        ) : (
          <p className="text-white/30 text-sm">Aguardando...</p>
        )}
      </div>
      {showHistory && history.length > 0 && (
        <div className="space-y-1 mt-2">
          {history.map(t => (
            <div key={t.id} className="flex justify-between p-1.5 rounded bg-white/5 text-xs">
              <span className="font-mono">{t.ticket_number}</span>
              <span className="text-white/40">Guichê {t.counter_number}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
