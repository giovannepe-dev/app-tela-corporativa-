import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { Download, Clock, Users, TrendingUp, Hash, BarChart3 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Ticket {
  id: string;
  ticket_number: string;
  ticket_type: string;
  status: string;
  created_at: string;
  called_at: string | null;
  served_at: string | null;
  completed_at: string | null;
  counter_id: string | null;
  queue_id: string;
}

export default function QueueReports() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [queues, setQueues] = useState<{ id: string; name: string; unit_id: string }[]>([]);
  const [counters, setCounters] = useState<{ id: string; name: string; number: number }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [period, setPeriod] = useState<string>("7");
  const [loading, setLoading] = useState(true);

  const cid = profile?.company_id;

  useEffect(() => {
    if (!cid) return;
    Promise.all([
      supabase.from("queues").select("id, name, unit_id").eq("company_id", cid),
      supabase.from("counters").select("id, name, number").eq("company_id", cid),
      supabase.from("units").select("id, name").eq("company_id", cid),
    ]).then(([qRes, cRes, uRes]) => {
      setQueues(qRes.data ?? []);
      setCounters(cRes.data ?? []);
      setUnits(uRes.data ?? []);
    });
  }, [cid]);

  useEffect(() => {
    if (!cid) return;
    setLoading(true);
    const from = startOfDay(subDays(new Date(), parseInt(period))).toISOString();
    const to = endOfDay(new Date()).toISOString();

    supabase
      .from("tickets")
      .select("id, ticket_number, ticket_type, status, created_at, called_at, served_at, completed_at, counter_id, queue_id")
      .eq("company_id", cid)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setTickets(data ?? []);
        setLoading(false);
      });
  }, [cid, period]);

  const filteredTickets = useMemo(() => {
    if (selectedUnit === "all") return tickets;
    const unitQueues = queues.filter(q => q.unit_id === selectedUnit).map(q => q.id);
    return tickets.filter(t => unitQueues.includes(t.queue_id));
  }, [tickets, selectedUnit, queues]);

  // Stats
  const totalTickets = filteredTickets.length;
  const completedTickets = filteredTickets.filter(t => t.status === "completed");
  const skippedTickets = filteredTickets.filter(t => t.status === "skipped");

  const avgWaitTime = useMemo(() => {
    const withWait = completedTickets.filter(t => t.called_at);
    if (!withWait.length) return 0;
    const total = withWait.reduce((sum, t) => {
      return sum + differenceInMinutes(new Date(t.called_at!), new Date(t.created_at));
    }, 0);
    return Math.round(total / withWait.length);
  }, [completedTickets]);

  const avgServiceTime = useMemo(() => {
    const withService = completedTickets.filter(t => t.called_at && t.completed_at);
    if (!withService.length) return 0;
    const total = withService.reduce((sum, t) => {
      return sum + differenceInMinutes(new Date(t.completed_at!), new Date(t.called_at!));
    }, 0);
    return Math.round(total / withService.length);
  }, [completedTickets]);

  // By type
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTickets.forEach(t => { map[t.ticket_type] = (map[t.ticket_type] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: typeLabel(name), value }));
  }, [filteredTickets]);

  // By counter
  const byCounter = useMemo(() => {
    const map: Record<string, number> = {};
    completedTickets.forEach(t => {
      if (t.counter_id) {
        const c = counters.find(c => c.id === t.counter_id);
        const label = c ? c.name : "Sem guichê";
        map[label] = (map[label] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [completedTickets, counters]);

  // By day
  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTickets.forEach(t => {
      const day = format(new Date(t.created_at), "dd/MM", { locale: ptBR });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTickets]);

  // By hour
  const byHour = useMemo(() => {
    const map: Record<number, number> = {};
    filteredTickets.forEach(t => {
      const h = new Date(t.created_at).getHours();
      map[h] = (map[h] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, i) => ({
      name: `${i}h`,
      value: map[i] || 0,
    }));
  }, [filteredTickets]);

  const COLORS = ["hsl(213, 94%, 52%)", "hsl(190, 100%, 50%)", "hsl(45, 100%, 50%)", "hsl(0, 72%, 55%)"];

  const exportCSV = () => {
    const headers = ["Senha", "Tipo", "Status", "Criada em", "Chamada em", "Concluída em", "Guichê"];
    const rows = filteredTickets.map(t => [
      t.ticket_number,
      typeLabel(t.ticket_type),
      t.status,
      format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      t.called_at ? format(new Date(t.called_at), "dd/MM/yyyy HH:mm") : "",
      t.completed_at ? format(new Date(t.completed_at), "dd/MM/yyyy HH:mm") : "",
      counters.find(c => c.id === t.counter_id)?.name || "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-senhas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise de desempenho do chamador de senhas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Unidade:</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Período:</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!filteredTickets.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total de Senhas" value={totalTickets} icon={Hash} />
        <KPICard title="Tempo Médio Espera" value={`${avgWaitTime} min`} icon={Clock} />
        <KPICard title="Tempo Médio Atendimento" value={`${avgServiceTime} min`} icon={TrendingUp} />
        <KPICard title="Senhas Puladas" value={skippedTickets.length} icon={Users} />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando dados...</p>
      ) : totalTickets === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-16">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Sem dados no período</h3>
            <p className="text-sm text-muted-foreground">Emita senhas para visualizar os relatórios.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volume por dia */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Volume por Dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 20%)" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8, color: "hsl(210, 30%, 92%)" }} />
                  <Bar dataKey="value" name="Senhas" fill="hsl(213, 94%, 52%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Por tipo */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Por Tipo de Senha</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8, color: "hsl(210, 30%, 92%)" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Por hora */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Distribuição por Hora</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 20%)" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8, color: "hsl(210, 30%, 92%)" }} />
                  <Line type="monotone" dataKey="value" name="Senhas" stroke="hsl(190, 100%, 50%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Por guichê */}
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Desempenho por Guichê</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCounter} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 20%)" />
                  <XAxis type="number" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 12 }} width={100} />
                  <Tooltip contentStyle={{ background: "hsl(222, 40%, 10%)", border: "1px solid hsl(222, 25%, 16%)", borderRadius: 8, color: "hsl(210, 30%, 92%)" }} />
                  <Bar dataKey="value" name="Atendimentos" fill="hsl(190, 100%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, icon: Icon }: { title: string; value: string | number; icon: any }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    normal: "Normal",
    preferencial: "Preferencial",
    prioridade_especial: "Prioridade Especial",
    emergencia: "Emergência",
  };
  return map[type] || type;
}
