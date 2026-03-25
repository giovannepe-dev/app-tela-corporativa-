import { useEffect, useState, useCallback } from "react";
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
  Plus, ListVideo, Trash2, GripVertical, Play, Pause, Clock, ArrowUp, ArrowDown, Pencil,
} from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  schedule_start: string | null;
  schedule_end: string | null;
  schedule_days: number[] | null;
  created_at: string;
  items?: PlaylistItem[];
}

interface PlaylistItem {
  id: string;
  screen_id: string;
  duration_seconds: number;
  transition: string;
  sort_order: number;
  screens?: { name: string; width: number; height: number } | null;
}

interface ScreenOption {
  id: string;
  name: string;
}

const TRANSITIONS = [
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Deslizar Esquerda" },
  { value: "slide-right", label: "Deslizar Direita" },
  { value: "slide-up", label: "Deslizar Cima" },
  { value: "none", label: "Nenhuma" },
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Playlists() {
  const { profile, user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens] = useState<ScreenOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", schedule_start: "", schedule_end: "", schedule_days: [0,1,2,3,4,5,6] as number[] });

  const fetchPlaylists = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("playlists")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    
    if (data) {
      // Fetch items for each playlist
      const withItems = await Promise.all(data.map(async (pl) => {
        const { data: items } = await supabase
          .from("playlist_items")
          .select("*, screens(name, width, height)")
          .eq("playlist_id", pl.id)
          .order("sort_order");
        return { ...pl, items: (items as any) ?? [] };
      }));
      setPlaylists(withItems);
    }
    setLoading(false);
  }, [profile?.company_id]);

  const fetchScreens = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("screens").select("id, name").eq("company_id", profile.company_id);
    setScreens(data ?? []);
  }, [profile?.company_id]);

  useEffect(() => {
    fetchPlaylists();
    fetchScreens();
  }, [fetchPlaylists, fetchScreens]);

  const handleCreate = async () => {
    if (!profile?.company_id || !form.name.trim()) return;
    const { error } = await supabase.from("playlists").insert({
      company_id: profile.company_id,
      name: form.name,
      description: form.description || null,
      schedule_start: form.schedule_start || null,
      schedule_end: form.schedule_end || null,
      schedule_days: form.schedule_days,
      created_by: user?.id,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Playlist criada!" });
      setCreateOpen(false);
      setForm({ name: "", description: "", schedule_start: "", schedule_end: "", schedule_days: [0,1,2,3,4,5,6] });
      fetchPlaylists();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchPlaylists();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from("playlists").update({ is_active: !current }).eq("id", id);
    fetchPlaylists();
  };

  const handleAddItem = async (playlistId: string, screenId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    const maxOrder = playlist?.items?.length ?? 0;
    const { error } = await supabase.from("playlist_items").insert({
      playlist_id: playlistId,
      screen_id: screenId,
      sort_order: maxOrder,
      duration_seconds: 10,
      transition: "fade",
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchPlaylists();
  };

  const handleRemoveItem = async (itemId: string) => {
    await supabase.from("playlist_items").delete().eq("id", itemId);
    fetchPlaylists();
  };

  const handleUpdateItem = async (itemId: string, updates: { duration_seconds?: number; transition?: string }) => {
    await supabase.from("playlist_items").update(updates).eq("id", itemId);
    fetchPlaylists();
  };

  const handleMoveItem = async (playlistId: string, itemId: string, direction: "up" | "down") => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist?.items) return;
    const items = [...playlist.items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = items.findIndex(i => i.id === itemId);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === items.length - 1)) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    // Swap sort_order
    await Promise.all([
      supabase.from("playlist_items").update({ sort_order: items[swapIdx].sort_order }).eq("id", items[idx].id),
      supabase.from("playlist_items").update({ sort_order: items[idx].sort_order }).eq("id", items[swapIdx].id),
    ]);
    fetchPlaylists();
  };

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      schedule_days: f.schedule_days.includes(day)
        ? f.schedule_days.filter(d => d !== day)
        : [...f.schedule_days, day].sort(),
    }));
  };

  const totalDuration = (items: PlaylistItem[]) => {
    const total = items.reduce((sum, i) => sum + i.duration_seconds, 0);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Playlists</h1>
          <p className="text-muted-foreground">Sequências de telas para seus dispositivos</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-nex text-white"><Plus className="h-4 w-4 mr-2" /> Nova Playlist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Playlist</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Programação Manhã" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input placeholder="Opcional" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário início</Label>
                  <Input type="time" value={form.schedule_start} onChange={e => setForm(f => ({ ...f, schedule_start: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Horário fim</Label>
                  <Input type="time" value={form.schedule_end} onChange={e => setForm(f => ({ ...f, schedule_end: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex gap-1">
                  {DAY_NAMES.map((name, i) => (
                    <Button
                      key={i} size="sm" variant={form.schedule_days.includes(i) ? "default" : "outline"}
                      className="h-8 w-10 text-xs p-0"
                      onClick={() => toggleDay(i)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full gradient-nex text-white">Criar Playlist</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : playlists.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ListVideo className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma playlist</h3>
            <p className="text-muted-foreground mb-4">Crie sua primeira playlist para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {playlists.map(playlist => (
            <Card key={playlist.id} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <ListVideo className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{playlist.name}</CardTitle>
                    {playlist.description && <p className="text-xs text-muted-foreground">{playlist.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {playlist.items && playlist.items.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Clock className="h-3 w-3" /> {totalDuration(playlist.items)}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">{playlist.items?.length ?? 0} telas</Badge>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggleActive(playlist.id, playlist.is_active)}>
                    {playlist.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(editingId === playlist.id ? null : playlist.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(playlist.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {/* Schedule info */}
              {(playlist.schedule_start || playlist.schedule_days) && (
                <div className="px-6 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {playlist.schedule_start && playlist.schedule_end && (
                    <span>⏰ {playlist.schedule_start.slice(0, 5)} - {playlist.schedule_end.slice(0, 5)}</span>
                  )}
                  {playlist.schedule_days && (
                    <span>📅 {playlist.schedule_days.map(d => DAY_NAMES[d]).join(", ")}</span>
                  )}
                </div>
              )}

              {/* Items editor */}
              {editingId === playlist.id && (
                <CardContent className="space-y-3 pt-0">
                  {playlist.items && playlist.items.length > 0 && (
                    <div className="space-y-2">
                      {[...playlist.items].sort((a, b) => a.sort_order - b.sort_order).map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium flex-1 truncate">
                            {(item.screens as any)?.name || "Tela removida"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={3600}
                              value={item.duration_seconds}
                              onChange={e => handleUpdateItem(item.id, { duration_seconds: parseInt(e.target.value) || 10 })}
                              className="h-7 w-16 text-xs text-center"
                            />
                            <span className="text-xs text-muted-foreground">s</span>
                          </div>
                          <Select value={item.transition} onValueChange={v => handleUpdateItem(item.id, { transition: v })}>
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSITIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMoveItem(playlist.id, item.id, "up")} disabled={idx === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleMoveItem(playlist.id, item.id, "down")} disabled={idx === (playlist.items?.length ?? 0) - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add screen */}
                  <div className="flex items-center gap-2">
                    <Select onValueChange={v => handleAddItem(playlist.id, v)}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Adicionar tela..." />
                      </SelectTrigger>
                      <SelectContent>
                        {screens.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
