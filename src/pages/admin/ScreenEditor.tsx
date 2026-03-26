import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Widget, WidgetType, WIDGET_DEFAULTS, ScreenLayout } from "@/types/screen-editor";
import EditorCanvas from "@/components/editor/EditorCanvas";
import WidgetProperties from "@/components/editor/WidgetProperties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Type, Image, Clock, QrCode, Minus, Square, Video,
  ListOrdered, Save, ArrowLeft, ZoomIn, ZoomOut, Globe, CloudSun, Rss, Monitor, Play
} from "lucide-react";

const SCREEN_PRESETS = [
  { label: 'Personalizado', w: 0, h: 0 },
  { label: 'HD 720p (32"–38")', w: 1280, h: 720 },
  { label: 'Full HD (42"–52")', w: 1920, h: 1080 },
  { label: '4K UHD (55"–65")', w: 3840, h: 2160 },
  { label: 'Portrait HD', w: 720, h: 1280 },
  { label: 'Portrait Full HD', w: 1080, h: 1920 },
  { label: 'Portrait 4K', w: 2160, h: 3840 },
  { label: 'Ultrawide 21:9', w: 2560, h: 1080 },
  { label: 'LED Painel (32:9)', w: 3840, h: 1080 },
];

const widgetButtons: { type: WidgetType; icon: any; label: string }[] = [
  { type: "text", icon: Type, label: "Texto" },
  { type: "image", icon: Image, label: "Imagem" },
  { type: "video", icon: Video, label: "Vídeo" },
  { type: "youtube", icon: Play, label: "YouTube" },
  { type: "webpage", icon: Globe, label: "URL" },
  { type: "rss", icon: Rss, label: "RSS" },
  { type: "clock", icon: Clock, label: "Relógio" },
  { type: "qrcode", icon: QrCode, label: "QR Code" },
  { type: "ticker", icon: Minus, label: "Ticker" },
  { type: "shape", icon: Square, label: "Forma" },
  { type: "queue_widget", icon: ListOrdered, label: "Chamador" },
  { type: "weather", icon: CloudSun, label: "Clima" },
];

export default function ScreenEditor() {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [screenName, setScreenName] = useState("Nova Tela");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [backgroundColor, setBackgroundColor] = useState("#0a0e1a");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load screen
  useEffect(() => {
    if (!screenId || screenId === "new") { setLoaded(true); return; }
    supabase.from("screens").select("*").eq("id", screenId).single().then(({ data }) => {
      if (data) {
        setScreenName(data.name);
        setWidth(data.width);
        setHeight(data.height);
        setBackgroundColor(data.background_color || "#0a0e1a");
        const layout = data.layout_json as any;
        setWidgets(layout?.widgets ?? []);
      }
      setLoaded(true);
    });
  }, [screenId]);

  const addWidget = useCallback((type: WidgetType) => {
    const defaults = WIDGET_DEFAULTS[type];
    const newWidget: Widget = {
      id: crypto.randomUUID(),
      type,
      x: Math.round(width / 2 - (defaults.width ?? 200) / 2),
      y: Math.round(height / 2 - (defaults.height ?? 100) / 2),
      width: defaults.width ?? 200,
      height: defaults.height ?? 100,
      zIndex: widgets.length + 1,
      locked: false,
      visible: true,
      rotation: 0,
      props: { ...defaults.props },
      style: { ...defaults.style },
    };
    setWidgets(prev => [...prev, newWidget]);
    setSelectedId(newWidget.id);
  }, [widgets.length, width, height]);

  const updateWidget = useCallback((id: string, updates: Partial<Widget>) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      return {
        ...w,
        ...updates,
        props: updates.props ? { ...w.props, ...updates.props } : w.props,
        style: updates.style ? { ...w.style, ...updates.style } : w.style,
      };
    }));
  }, []);

  const deleteWidget = useCallback(() => {
    if (!selectedId) return;
    setWidgets(prev => prev.filter(w => w.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const duplicateWidget = useCallback(() => {
    const widget = widgets.find(w => w.id === selectedId);
    if (!widget) return;
    const dup: Widget = { ...widget, id: crypto.randomUUID(), x: widget.x + 20, y: widget.y + 20, zIndex: widgets.length + 1 };
    setWidgets(prev => [...prev, dup]);
    setSelectedId(dup.id);
  }, [selectedId, widgets]);

  const saveScreen = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    const layout: ScreenLayout = { widgets };

    if (screenId && screenId !== "new") {
      // Save version
      await supabase.from("screen_versions").insert({
        screen_id: screenId,
        layout_json: layout as any,
        created_by: user?.id,
      });
      const { error } = await supabase.from("screens").update({
        name: screenName,
        width,
        height,
        background_color: backgroundColor,
        layout_json: layout as any,
        orientation: width > height ? "landscape" : "portrait",
      }).eq("id", screenId);
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else toast({ title: "Tela salva!" });
    } else {
      const { data, error } = await supabase.from("screens").insert({
        company_id: profile.company_id,
        name: screenName,
        width,
        height,
        background_color: backgroundColor,
        layout_json: layout as any,
        orientation: width > height ? "landscape" : "portrait",
        created_by: user?.id,
      }).select().single();
      if (error) toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      else {
        toast({ title: "Tela criada!" });
        navigate(`/admin/screens/edit/${data.id}`, { replace: true });
      }
    }
    setSaving(false);
  };

  const selectedWidget = widgets.find(w => w.id === selectedId) ?? null;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selectedId) deleteWidget();
      if (e.key === "Escape") setSelectedId(null);
      if (e.ctrlKey && e.key === "d") { e.preventDefault(); duplicateWidget(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, deleteWidget, duplicateWidget]);

  if (!loaded) return null;

  return (
    <div className="h-screen flex flex-col bg-background dark overflow-hidden">
      {/* Top bar: name + save */}
      <div className="h-12 border-b border-border flex items-center justify-between px-3 bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 px-3 gap-1.5 shrink-0" onClick={() => navigate("/admin/screens")}>
            <ArrowLeft className="h-4 w-4" /> Menu
          </Button>
          <Input
            value={screenName}
            onChange={e => setScreenName(e.target.value)}
            className="h-8 w-48 text-sm border-none bg-transparent font-semibold focus-visible:ring-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" className="gradient-nex text-white h-8" onClick={saveScreen} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* Widget toolbar */}
      <div className="h-11 border-b border-border flex items-center gap-1 px-3 bg-card/80 shrink-0 overflow-x-auto">
        {/* Screen size preset */}
        <div className="flex items-center gap-1.5 mr-3 shrink-0 border-r border-border pr-3">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <Select
            value={SCREEN_PRESETS.find(p => p.w === width && p.h === height) ? `${width}x${height}` : 'custom'}
            onValueChange={(val) => {
              if (val === 'custom') return;
              const [w, h] = val.split('x').map(Number);
              setWidth(w);
              setHeight(h);
            }}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCREEN_PRESETS.map(p => (
                <SelectItem key={p.label} value={p.w === 0 ? 'custom' : `${p.w}x${p.h}`} className="text-xs">
                  {p.label} {p.w > 0 && <span className="text-muted-foreground ml-1">({p.w}×{p.h})</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number" value={width} onChange={e => setWidth(Number(e.target.value))}
            className="h-8 w-16 text-xs text-center" title="Largura"
          />
          <span className="text-xs text-muted-foreground">×</span>
          <Input
            type="number" value={height} onChange={e => setHeight(Number(e.target.value))}
            className="h-8 w-16 text-xs text-center" title="Altura"
          />
        </div>
        <span className="text-xs text-muted-foreground mr-2 shrink-0">Widgets:</span>
        {widgetButtons.map(wb => (
          <Button key={wb.type} size="sm" variant="outline" className="h-8 px-3 text-xs gap-1.5 shrink-0" onClick={() => addWidget(wb.type)}>
            <wb.icon className="h-4 w-4" /> {wb.label}
          </Button>
        ))}
      </div>

      {/* Canvas + Properties */}
      <div className="flex-1 flex overflow-hidden">
        <EditorCanvas
          width={width}
          height={height}
          backgroundColor={backgroundColor}
          widgets={widgets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateWidget={updateWidget}
          zoom={zoom}
        />
        <WidgetProperties
          widget={selectedWidget}
          onUpdate={updates => selectedId && updateWidget(selectedId, updates)}
          onDelete={deleteWidget}
          onDuplicate={duplicateWidget}
        />
      </div>
    </div>
  );
}
