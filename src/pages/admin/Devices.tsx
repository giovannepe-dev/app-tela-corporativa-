import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Monitor, Wifi, WifiOff, Trash2, MapPin, Layers, ExternalLink,
  Copy, ListVideo, Link2, AlertTriangle, Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Device {
  id: string;
  name: string;
  location: string | null;
  status: string;
  orientation: string;
  resolution: string;
  last_seen: string | null;
  unit_id: string | null;
  tags: string[];
  device_token: string | null;
  active_screen_id: string | null;
  active_playlist_id: string | null;
  pairing_code: string | null;
  pairing_expires_at: string | null;
  units?: { name: string } | null;
}

function getStatusInfo(device: Device) {
  if (device.status === "pairing") return { label: "Pareando", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Link2 };
  if (!device.last_seen) return { label: "Nunca visto", color: "", icon: WifiOff };

  const lastSeen = new Date(device.last_seen);
  const diffMs = Date.now() - lastSeen.getTime();
  const diffMin = diffMs / 60000;

  if (diffMin < 2) return { label: "Online", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Wifi };
  if (diffMin < 10) return { label: "Instável", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertTriangle };
  return { label: "Offline", color: "", icon: WifiOff };
}

export default function Devices() {
  const { profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [screens, setScreens] = useState<{ id: string; name: string }[]>([]);
  const [playlistsList, setPlaylistsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [pairing, setPairing] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", unit_id: "", orientation: "landscape", resolution: "1920x1080" });

  const fetchDevices = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("devices")
      .select("id, name, location, status, orientation, resolution, last_seen, unit_id, tags, device_token, active_screen_id, active_playlist_id, pairing_code, pairing_expires_at, units(name)")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    setDevices((data as any) ?? []);
    setLoading(false);
  };

  const fetchUnits = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("units").select("id, name").eq("company_id", profile.company_id);
    setUnits(data ?? []);
  };

  const fetchScreens = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("screens").select("id, name").eq("company_id", profile.company_id);
    setScreens(data ?? []);
  };

  const fetchPlaylistsList = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("playlists").select("id, name").eq("company_id", profile.company_id);
    setPlaylistsList(data ?? []);
  };

  useEffect(() => {
    fetchDevices();
    fetchUnits();
    fetchScreens();
    fetchPlaylistsList();

    const channel = supabase
      .channel("devices-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => fetchDevices())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.company_id]);

  // Refresh status every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => [...prev]); // Force re-render for time-based status
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!profile?.company_id || !form.name.trim()) return;
    const { error } = await supabase.from("devices").insert({
      company_id: profile.company_id,
      name: form.name,
      location: form.location || null,
      unit_id: form.unit_id || null,
      orientation: form.orientation as any,
      resolution: form.resolution,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Dispositivo criado!" });
      setDialogOpen(false);
      setForm({ name: "", location: "", unit_id: "", orientation: "landscape", resolution: "1920x1080" });
      fetchDevices();
    }
  };

  const handlePairDevice = async () => {
    if (!pairCode.trim()) return;
    setPairing(true);

    const code = pairCode.trim().toUpperCase();

    try {
      const { data, error } = await supabase.functions.invoke("device-pairing", {
        body: { action: "pair", pairing_code: code },
      });

      if (error || data?.error) {
        toast({ title: "Erro ao parear", description: data?.error || error?.message || "Código inválido ou expirado.", variant: "destructive" });
      } else {
        toast({ title: "Dispositivo pareado com sucesso!" });
        setPairDialogOpen(false);
        setPairCode("");
        fetchDevices();
      }
    } catch {
      toast({ title: "Erro ao parear", variant: "destructive" });
    }
    setPairing(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchDevices();
  };

  const handleAssignScreen = async (deviceId: string, screenId: string | null) => {
    const { error } = await supabase.from("devices").update({ active_screen_id: screenId, active_playlist_id: null }).eq("id", deviceId);
    if (error) toast({ title: "Erro ao aplicar tela", description: error.message, variant: "destructive" });
    else toast({ title: screenId ? "Tela aplicada com sucesso!" : "Tela removida do dispositivo" });
    fetchDevices();
  };

  const handleAssignPlaylist = async (deviceId: string, playlistId: string | null) => {
    const { error } = await supabase.from("devices").update({ active_playlist_id: playlistId, active_screen_id: null }).eq("id", deviceId);
    if (error) toast({ title: "Erro ao aplicar playlist", description: error.message, variant: "destructive" });
    else toast({ title: playlistId ? "Playlist aplicada com sucesso!" : "Playlist removida do dispositivo" });
    fetchDevices();
  };

  const copyPlayerUrl = (token: string) => {
    const url = `${window.location.origin}/player/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada!" });
  };

  const copyPairUrl = () => {
    const url = `${window.location.origin}/pair`;
    navigator.clipboard.writeText(url);
    toast({ title: "URL de pareamento copiada!" });
  };

  const onlineCount = devices.filter(d => {
    if (!d.last_seen) return false;
    return (Date.now() - new Date(d.last_seen).getTime()) < 120000;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos</h1>
          <p className="text-muted-foreground">
            {devices.length} dispositivos · {onlineCount} online
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyPairUrl}>
            <Copy className="h-4 w-4 mr-1" /> URL Pareamento
          </Button>

          <Dialog open={pairDialogOpen} onOpenChange={setPairDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Link2 className="h-4 w-4 mr-2" /> Parear TV</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Parear Dispositivo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Na TV, abra <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{window.location.origin}/pair</code> e digite o código exibido abaixo:
                </p>
                <div className="space-y-2">
                  <Label>Código de 6 caracteres</Label>
                  <Input
                    placeholder="Ex: ABC123"
                    value={pairCode}
                    onChange={e => setPairCode(e.target.value.toUpperCase().slice(0, 6))}
                    className="text-center text-2xl font-mono tracking-[0.3em] h-14"
                    maxLength={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handlePairDevice} disabled={pairCode.length < 6 || pairing} className="gradient-nex text-white">
                  {pairing ? "Pareando..." : "Parear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-nex text-white"><Plus className="h-4 w-4 mr-2" /> Novo Dispositivo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Dispositivo</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Ex: TV Recepção" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Localização</Label>
                  <Input placeholder="Ex: Hall principal" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={form.unit_id} onValueChange={v => setForm(f => ({ ...f, unit_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Orientação</Label>
                    <Select value={form.orientation} onValueChange={v => setForm(f => ({ ...f, orientation: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="landscape">Landscape</SelectItem>
                        <SelectItem value="portrait">Portrait</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resolução</Label>
                    <Select value={form.resolution} onValueChange={v => setForm(f => ({ ...f, resolution: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1920x1080">1920×1080</SelectItem>
                        <SelectItem value="1080x1920">1080×1920</SelectItem>
                        <SelectItem value="3840x2160">3840×2160</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full gradient-nex text-white">Criar Dispositivo</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : devices.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dispositivo</h3>
            <p className="text-muted-foreground mb-4">Cadastre uma TV ou use o pareamento automático.</p>
            <Button variant="outline" onClick={copyPairUrl}>
              <Copy className="h-4 w-4 mr-2" /> Copiar URL de pareamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => {
            const statusInfo = getStatusInfo(device);
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={device.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{device.name}</CardTitle>
                  </div>
                  <Badge variant="secondary" className={statusInfo.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {device.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {device.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{device.resolution}</span> · <span>{device.orientation}</span>
                  </div>
                  {device.units && (
                    <p className="text-xs text-muted-foreground">Unidade: {(device.units as any).name}</p>
                  )}

                  {/* Last seen */}
                  {device.last_seen && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Visto {formatDistanceToNow(new Date(device.last_seen), { addSuffix: true, locale: ptBR })}
                    </div>
                  )}

                  {/* Offline alert */}
                  {device.last_seen && (Date.now() - new Date(device.last_seen).getTime()) > 600000 && device.status !== "pairing" && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Dispositivo offline há mais de 10 minutos
                    </div>
                  )}

                  {/* Screen assignment */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" /> Tela</Label>
                    <Select
                      value={device.active_screen_id || "none"}
                      onValueChange={v => handleAssignScreen(device.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Nenhuma tela" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {screens.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Playlist assignment */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><ListVideo className="h-3 w-3" /> Playlist</Label>
                    <Select
                      value={device.active_playlist_id || "none"}
                      onValueChange={v => handleAssignPlaylist(device.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Nenhuma playlist" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {playlistsList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Player URL */}
                  {device.device_token && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1" onClick={() => copyPlayerUrl(device.device_token!)}>
                        <Copy className="h-3 w-3" /> URL Player
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" asChild>
                        <a href={`/player/${device.device_token}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(device.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
