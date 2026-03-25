import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, ListOrdered, Hash, Monitor as MonitorIcon, MapPin, Volume2, Pencil, Check, X } from "lucide-react";

const announceTicket = (ticketNumber: string, counterName: string) => {
  // Play a chime sound first
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);

    // Second tone
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc2.start(audioCtx.currentTime + 0.15);
    osc2.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    // Audio context not available
  }

  // Voice announcement after chime
  setTimeout(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance(
        `Senha ${ticketNumber}, dirija-se ao ${counterName}`
      );
      msg.lang = "pt-BR";
      msg.rate = 0.9;
      msg.pitch = 1;
      msg.volume = 1;
      // Try to find a Portuguese voice
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.startsWith("pt"));
      if (ptVoice) msg.voice = ptVoice;
      window.speechSynthesis.speak(msg);
    }
  }, 700);
};

export default function QueueManagement() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [queueDialog, setQueueDialog] = useState(false);
  const [counterDialog, setCounterDialog] = useState(false);
  const [queueForm, setQueueForm] = useState({ name: "", prefix: "A", priority_mode: "preferencial_first", alternation_ratio: 3 });
  const [counterForm, setCounterForm] = useState({ name: "", number: 1 });

  const cid = profile?.company_id;

  const fetchData = async () => {
    if (!cid) return;
    const [uRes, qRes, cRes] = await Promise.all([
      supabase.from("units").select("id, name").eq("company_id", cid),
      supabase.from("queues").select("*").eq("company_id", cid),
      supabase.from("counters").select("*").eq("company_id", cid),
    ]);
    setUnits(uRes.data ?? []);
    setQueues(qRes.data ?? []);
    setCounters(cRes.data ?? []);
    if (!selectedUnit && uRes.data?.length) setSelectedUnit(uRes.data[0].id);
  };

  useEffect(() => { fetchData(); }, [cid]);

  const filteredQueues = queues.filter(q => q.unit_id === selectedUnit);
  const filteredCounters = counters.filter(c => c.unit_id === selectedUnit);

  const createQueue = async () => {
    if (!cid || !selectedUnit || !queueForm.name.trim()) return;
    const { error } = await supabase.from("queues").insert({
      company_id: cid,
      unit_id: selectedUnit,
      name: queueForm.name,
      prefix: queueForm.prefix,
      priority_mode: queueForm.priority_mode,
      alternation_ratio: queueForm.alternation_ratio,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Fila criada!" }); setQueueDialog(false); setQueueForm({ name: "", prefix: "A", priority_mode: "preferencial_first", alternation_ratio: 3 }); fetchData(); }
  };

  const createCounter = async () => {
    if (!cid || !selectedUnit || !counterForm.name.trim()) return;
    const { error } = await supabase.from("counters").insert({
      company_id: cid,
      unit_id: selectedUnit,
      name: counterForm.name,
      number: counterForm.number,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Guichê criado!" }); setCounterDialog(false); setCounterForm({ name: "", number: 1 }); fetchData(); }
  };

  const deleteQueue = async (id: string) => { await supabase.from("queues").delete().eq("id", id); fetchData(); };
  const deleteCounter = async (id: string) => { await supabase.from("counters").delete().eq("id", id); fetchData(); };

  const [editingQueue, setEditingQueue] = useState<string | null>(null);
  const [editingQueueName, setEditingQueueName] = useState("");
  const [editingCounter, setEditingCounter] = useState<string | null>(null);
  const [editingCounterName, setEditingCounterName] = useState("");

  const saveQueueName = async (id: string) => {
    if (!editingQueueName.trim()) return;
    const { error } = await supabase.from("queues").update({ name: editingQueueName.trim() }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Nome atualizado!" }); fetchData(); }
    setEditingQueue(null);
  };

  const saveCounterName = async (id: string) => {
    if (!editingCounterName.trim()) return;
    const { error } = await supabase.from("counters").update({ name: editingCounterName.trim() }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Nome atualizado!" }); fetchData(); }
    setEditingCounter(null);
  };

  if (!units.length) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold">Chamador de Senhas</h1><p className="text-muted-foreground">Configure filas e guichês</p></div>
        <Card className="bg-card border-border"><CardContent className="flex flex-col items-center py-16">
          <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Crie uma unidade primeiro</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Filas e guichês são organizados por unidade.</p>
          <Button className="gradient-nex text-white" onClick={() => navigate("/admin/units")}>
            <MapPin className="h-4 w-4 mr-2" /> Ir para Unidades
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">Chamador de Senhas</h1><p className="text-muted-foreground">Configure filas e guichês</p></div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Unidade:</Label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="queues">
        <TabsList>
          <TabsTrigger value="queues"><ListOrdered className="h-4 w-4 mr-2" />Filas</TabsTrigger>
          <TabsTrigger value="counters"><Hash className="h-4 w-4 mr-2" />Guichês</TabsTrigger>
          <TabsTrigger value="operator"><MonitorIcon className="h-4 w-4 mr-2" />Operador</TabsTrigger>
        </TabsList>

        <TabsContent value="queues" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={queueDialog} onOpenChange={setQueueDialog}>
              <DialogTrigger asChild><Button className="gradient-nex text-white"><Plus className="h-4 w-4 mr-2" />Nova Fila</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Fila</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Recepção" value={queueForm.name} onChange={e => setQueueForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Prefixo</Label><Input placeholder="Ex: A" value={queueForm.prefix} onChange={e => setQueueForm(f => ({ ...f, prefix: e.target.value.toUpperCase() }))} maxLength={3} /></div>
                  <div className="space-y-2">
                    <Label>Modo de prioridade</Label>
                    <Select value={queueForm.priority_mode} onValueChange={v => setQueueForm(f => ({ ...f, priority_mode: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preferencial_first">Preferencial sempre primeiro</SelectItem>
                        <SelectItem value="alternation">Alternância (X normais : 1 preferencial)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {queueForm.priority_mode === "alternation" && (
                    <div className="space-y-2">
                      <Label>Razão (normais por preferencial)</Label>
                      <Input type="number" min={1} max={10} value={queueForm.alternation_ratio} onChange={e => setQueueForm(f => ({ ...f, alternation_ratio: parseInt(e.target.value) || 3 }))} />
                    </div>
                  )}
                  <Button onClick={createQueue} className="w-full gradient-nex text-white">Criar Fila</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {filteredQueues.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="flex flex-col items-center py-12">
              <p className="text-muted-foreground">Nenhuma fila nesta unidade.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQueues.map(q => (
                <Card key={q.id} className="bg-card border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    {editingQueue === q.id ? (
                      <div className="flex items-center gap-1 flex-1 mr-2">
                        <Input className="h-7 text-sm" value={editingQueueName} onChange={e => setEditingQueueName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveQueueName(q.id)} autoFocus />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveQueueName(q.id)}><Check className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingQueue(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <CardTitle className="text-base flex items-center gap-1">
                        {q.name}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingQueue(q.id); setEditingQueueName(q.name); }}><Pencil className="h-3 w-3" /></Button>
                      </CardTitle>
                    )}
                    <Badge variant="secondary">{q.prefix}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">
                      {q.priority_mode === "preferencial_first" ? "Preferencial primeiro" : `Alternância ${q.alternation_ratio}:1`}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => deleteQueue(q.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="counters" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={counterDialog} onOpenChange={setCounterDialog}>
              <DialogTrigger asChild><Button className="gradient-nex text-white"><Plus className="h-4 w-4 mr-2" />Novo Guichê</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Guichê</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Guichê 1" value={counterForm.name} onChange={e => setCounterForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Número</Label><Input type="number" min={1} value={counterForm.number} onChange={e => setCounterForm(f => ({ ...f, number: parseInt(e.target.value) || 1 }))} /></div>
                  <Button onClick={createCounter} className="w-full gradient-nex text-white">Criar Guichê</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {filteredCounters.length === 0 ? (
            <Card className="bg-card border-border"><CardContent className="flex flex-col items-center py-12">
              <p className="text-muted-foreground">Nenhum guichê nesta unidade.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCounters.map(c => (
                <Card key={c.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      {editingCounter === c.id ? (
                        <div className="flex items-center gap-1">
                          <Input className="h-7 text-sm" value={editingCounterName} onChange={e => setEditingCounterName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveCounterName(c.id)} autoFocus />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveCounterName(c.id)}><Check className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCounter(null)}><X className="h-3 w-3" /></Button>
                        </div>
                      ) : (
                        <p className="font-semibold flex items-center gap-1">
                          {c.name}
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingCounter(c.id); setEditingCounterName(c.name); }}><Pencil className="h-3 w-3" /></Button>
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">Nº {c.number}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteCounter(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="operator">
          <OperatorPanel unitId={selectedUnit} companyId={cid!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========================
// OPERATOR PANEL (inline)
// ========================
function OperatorPanel({ unitId, companyId }: { unitId: string; companyId: string }) {
  const { user } = useAuth();
  const [queues, setQueues] = useState<any[]>([]);
  const [counters, setCounters] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedCounter, setSelectedCounter] = useState("");
  const [waitingTickets, setWaitingTickets] = useState<any[]>([]);
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [issueType, setIssueType] = useState<string>("normal");

  const fetchBase = async () => {
    const [qRes, cRes] = await Promise.all([
      supabase.from("queues").select("*").eq("unit_id", unitId).eq("is_active", true),
      supabase.from("counters").select("*").eq("unit_id", unitId).eq("is_active", true),
    ]);
    setQueues(qRes.data ?? []);
    setCounters(cRes.data ?? []);
    if (!selectedQueue && qRes.data?.length) setSelectedQueue(qRes.data[0].id);
    if (!selectedCounter && cRes.data?.length) setSelectedCounter(cRes.data[0].id);
  };

  const fetchTickets = async () => {
    if (!selectedQueue) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("queue_id", selectedQueue)
      .in("status", ["waiting", "called", "serving"])
      .order("created_at", { ascending: true });
    const tickets = data ?? [];
    setWaitingTickets(tickets.filter(t => t.status === "waiting"));
    const serving = tickets.find(t => t.status === "serving" || t.status === "called");
    setCurrentTicket(serving ?? null);
  };

  useEffect(() => { fetchBase(); }, [unitId]);
  useEffect(() => { fetchTickets(); }, [selectedQueue]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("tickets-operator")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedQueue]);

  const issueTicket = async () => {
    if (!selectedQueue || !companyId) return;
    const { data: ticketNumber } = await supabase.rpc("get_next_ticket_number", { _queue_id: selectedQueue });
    if (!ticketNumber) { toast({ title: "Erro ao gerar número", variant: "destructive" }); return; }
    const { error } = await supabase.from("tickets").insert({
      company_id: companyId,
      unit_id: unitId,
      queue_id: selectedQueue,
      ticket_number: ticketNumber,
      ticket_type: issueType as any,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: `Senha ${ticketNumber} emitida!` });
  };

  const [normalsSincePref, setNormalsSincePref] = useState(0);

  const callNext = async () => {
    if (!selectedCounter || !waitingTickets.length) return;
    const queue = queues.find(q => q.id === selectedQueue);
    let next: any;
    const prefs = waitingTickets.filter(t => t.ticket_type !== "normal");
    const normals = waitingTickets.filter(t => t.ticket_type === "normal");

    if (queue?.priority_mode === "preferencial_first") {
      // Preferenciais sempre primeiro
      next = prefs.length > 0 ? prefs[0] : normals[0];
    } else if (queue?.priority_mode === "alternation") {
      const ratio = queue.alternation_ratio ?? 3;
      if (prefs.length > 0 && (normalsSincePref >= ratio || normals.length === 0)) {
        next = prefs[0];
        setNormalsSincePref(0);
      } else if (normals.length > 0) {
        next = normals[0];
        setNormalsSincePref(prev => prev + 1);
      } else {
        next = prefs[0];
        setNormalsSincePref(0);
      }
    } else {
      next = waitingTickets[0];
    }

    if (!next) return;

    // If there's a current ticket being served, complete it
    if (currentTicket) {
      await supabase.from("tickets").update({ status: "completed" as any, completed_at: new Date().toISOString() }).eq("id", currentTicket.id);
    }

    const { error } = await supabase.from("tickets").update({
      status: "called" as any,
      called_at: new Date().toISOString(),
      counter_id: selectedCounter,
      called_by: user?.id,
    }).eq("id", next.id);

    if (!error) {
      await supabase.from("ticket_events").insert({
        ticket_id: next.id,
        event_type: "called",
        counter_id: selectedCounter,
        performed_by: user?.id,
      });
      const cName = counters.find(c => c.id === selectedCounter)?.name ?? "guichê";
      announceTicket(next.ticket_number, cName);
      toast({ title: `Chamando ${next.ticket_number} → ${cName}` });
    }
  };

  const repeatCall = async () => {
    if (!currentTicket) return;
    await supabase.from("ticket_events").insert({
      ticket_id: currentTicket.id,
      event_type: "recalled",
      counter_id: selectedCounter,
      performed_by: user?.id,
    });
    // Re-trigger realtime by touching updated_at
    await supabase.from("tickets").update({ called_at: new Date().toISOString() }).eq("id", currentTicket.id);
    const cName = counters.find(c => c.id === selectedCounter)?.name ?? "guichê";
    announceTicket(currentTicket.ticket_number, cName);
    toast({ title: `Rechamando ${currentTicket.ticket_number} → ${cName}` });
  };

  const skipTicket = async () => {
    if (!currentTicket) return;
    await supabase.from("tickets").update({ status: "skipped" as any }).eq("id", currentTicket.id);
    await supabase.from("ticket_events").insert({
      ticket_id: currentTicket.id,
      event_type: "skipped",
      performed_by: user?.id,
    });
    setCurrentTicket(null);
    toast({ title: "Senha pulada" });
  };

  const completeTicket = async () => {
    if (!currentTicket) return;
    await supabase.from("tickets").update({ status: "completed" as any, completed_at: new Date().toISOString() }).eq("id", currentTicket.id);
    await supabase.from("ticket_events").insert({
      ticket_id: currentTicket.id,
      event_type: "completed",
      performed_by: user?.id,
    });
    setCurrentTicket(null);
    toast({ title: "Atendimento finalizado" });
  };

  const counterName = counters.find(c => c.id === selectedCounter)?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Fila</Label>
          <Select value={selectedQueue} onValueChange={setSelectedQueue}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Fila" /></SelectTrigger>
            <SelectContent>{queues.map(q => <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Guichê</Label>
          <Select value={selectedCounter} onValueChange={setSelectedCounter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Guichê" /></SelectTrigger>
            <SelectContent>{counters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emissão */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Emitir Senha</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="preferencial">Preferencial</SelectItem>
                <SelectItem value="prioridade_especial">Prioridade Especial</SelectItem>
                <SelectItem value="emergencia">Emergência</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={issueTicket} className="w-full gradient-nex text-white" size="lg">
              Emitir Senha
            </Button>
          </CardContent>
        </Card>

        {/* Senha atual */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Senha Atual</CardTitle></CardHeader>
          <CardContent>
            {currentTicket ? (
              <div className="text-center space-y-3">
                <p className="text-4xl font-bold text-gradient-nex">{currentTicket.ticket_number}</p>
                <Badge variant={currentTicket.ticket_type === "normal" ? "secondary" : "default"}
                  className={currentTicket.ticket_type !== "normal" ? "gradient-nex text-white" : ""}>
                  {currentTicket.ticket_type}
                </Badge>
                <p className="text-sm text-muted-foreground">{counterName}</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" variant="outline" onClick={repeatCall}>Rechamar</Button>
                  <Button size="sm" variant="outline" onClick={skipTicket}>Pular</Button>
                  <Button size="sm" className="gradient-nex text-white" onClick={completeTicket}>Finalizar</Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">Nenhuma senha em atendimento</p>
            )}
          </CardContent>
        </Card>

        {/* Fila de espera */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fila de Espera</CardTitle>
            <Badge variant="secondary">{waitingTickets.length}</Badge>
          </CardHeader>
          <CardContent>
            {waitingTickets.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Fila vazia</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {waitingTickets.slice(0, 20).map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="font-mono text-sm font-semibold">{t.ticket_number}</span>
                    <Badge variant={t.ticket_type === "normal" ? "secondary" : "default"}
                      className={t.ticket_type !== "normal" ? "bg-primary/20 text-primary border-primary/30 text-xs" : "text-xs"}>
                      {t.ticket_type === "normal" ? "N" : t.ticket_type === "preferencial" ? "P" : "E"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={callNext} className="w-full mt-4 gradient-nex text-white" size="lg" disabled={!waitingTickets.length}>
              Chamar Próxima
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
