import { useRef, useState, useEffect } from "react";
import { Widget } from "@/types/screen-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Copy, Lock, Unlock, Eye, EyeOff, ChevronUp, ChevronDown, Upload, Loader2, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  widget: Widget | null;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const inputClasses = "h-8 text-xs bg-background text-foreground border-border";
const labelClasses = "text-xs text-foreground";
const sectionLabelClasses = "text-xs text-muted-foreground font-medium";

export default function WidgetProperties({ widget, onUpdate, onDelete, onDuplicate }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [unitsList, setUnitsList] = useState<{ id: string; name: string }[]>([]);

  // Fetch units for queue_widget
  useEffect(() => {
    if (widget?.type === "queue_widget") {
      supabase.from("units").select("id, name").then(({ data }) => {
        setUnitsList(data ?? []);
      });
    }
  }, [widget?.type]);

  if (!widget) {
    return (
      <div className="w-72 border-l border-border bg-card p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">Selecione um widget para editar suas propriedades</p>
      </div>
    );
  }

  const updateProp = (key: string, value: any) => {
    onUpdate({ props: { ...widget.props, [key]: value } });
  };

  const updateStyle = (key: string, value: any) => {
    onUpdate({ style: { ...widget.style, [key]: value } });
  };

  const handleFileUpload = async (file: File, propKey: string) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("widget-media")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("widget-media").getPublicUrl(filePath);
      updateProp(propKey, data.publicUrl);
      toast({ title: "Arquivo enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollArea className="w-72 border-l border-border bg-card text-foreground">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm capitalize text-foreground">{widget.type}</h3>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate({ visible: !widget.visible })}>
              {widget.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate({ locked: !widget.locked })}>
              {widget.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        {/* Position & Size */}
        <div className="space-y-2">
          <Label className={sectionLabelClasses}>Posição & Tamanho</Label>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className={labelClasses}>X</Label><Input type="number" value={widget.x} onChange={e => onUpdate({ x: +e.target.value })} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Y</Label><Input type="number" value={widget.y} onChange={e => onUpdate({ y: +e.target.value })} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Largura</Label><Input type="number" value={widget.width} onChange={e => onUpdate({ width: +e.target.value })} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Altura</Label><Input type="number" value={widget.height} onChange={e => onUpdate({ height: +e.target.value })} className={inputClasses} /></div>
          </div>
        </div>

        {/* Z-Index */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground flex-1">Camada (z-index)</Label>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onUpdate({ zIndex: widget.zIndex + 1 })}><ChevronUp className="h-3 w-3" /></Button>
          <span className="text-xs w-6 text-center text-foreground">{widget.zIndex}</span>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onUpdate({ zIndex: Math.max(0, widget.zIndex - 1) })}><ChevronDown className="h-3 w-3" /></Button>
        </div>

        {/* Opacity */}
        <div className="space-y-1">
          <Label className={sectionLabelClasses}>Opacidade: {Math.round((widget.style.opacity ?? 1) * 100)}%</Label>
          <Slider value={[(widget.style.opacity ?? 1) * 100]} onValueChange={v => updateStyle("opacity", v[0] / 100)} min={0} max={100} step={5} />
        </div>

        {/* Border Radius */}
        <div className="space-y-1">
          <Label className={sectionLabelClasses}>Arredondamento: {widget.style.borderRadius ?? 0}px</Label>
          <Slider value={[widget.style.borderRadius ?? 0]} onValueChange={v => updateStyle("borderRadius", v[0])} min={0} max={50} />
        </div>

        <hr className="border-border" />

        {/* Type-specific props */}
        {widget.type === "text" && (
          <div className="space-y-3">
            <div><Label className={labelClasses}>Texto</Label><Textarea value={widget.props.content} onChange={e => updateProp("content", e.target.value)} className="text-xs min-h-[60px] bg-background text-foreground border-border" /></div>
            <div><Label className={labelClasses}>Tamanho da fonte</Label><Input type="number" value={widget.props.fontSize} onChange={e => updateProp("fontSize", +e.target.value)} className={inputClasses} /></div>
            <div>
              <Label className={labelClasses}>Peso</Label>
              <Select value={widget.props.fontWeight} onValueChange={v => updateProp("fontWeight", v)}>
                <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="500">Médio</SelectItem>
                  <SelectItem value="600">Semi-bold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="900">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClasses}>Alinhamento</Label>
              <Select value={widget.props.textAlign} onValueChange={v => updateProp("textAlign", v)}>
                <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className={labelClasses}>Cor</Label><Input type="color" value={widget.props.color} onChange={e => updateProp("color", e.target.value)} className="h-8 w-full" /></div>
          </div>
        )}

        {widget.type === "clock" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>Formato</Label>
              <Select value={widget.props.format} onValueChange={v => updateProp("format", v)}>
                <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HH:mm">HH:mm</SelectItem>
                  <SelectItem value="HH:mm:ss">HH:mm:ss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={widget.props.showDate} onCheckedChange={v => updateProp("showDate", v)} /><Label className={labelClasses}>Mostrar data</Label></div>
            <div><Label className={labelClasses}>Tamanho da fonte</Label><Input type="number" value={widget.props.fontSize} onChange={e => updateProp("fontSize", +e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Cor</Label><Input type="color" value={widget.props.color} onChange={e => updateProp("color", e.target.value)} className="h-8 w-full" /></div>
          </div>
        )}

        {widget.type === "ticker" && (
          <div className="space-y-3">
            <div><Label className={labelClasses}>Texto</Label><Textarea value={widget.props.content} onChange={e => updateProp("content", e.target.value)} className="text-xs min-h-[60px] bg-background text-foreground border-border" /></div>
            <div><Label className={labelClasses}>Velocidade</Label><Slider value={[widget.props.speed ?? 60]} onValueChange={v => updateProp("speed", v[0])} min={10} max={200} /></div>
            <div><Label className={labelClasses}>Tamanho da fonte</Label><Input type="number" value={widget.props.fontSize} onChange={e => updateProp("fontSize", +e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Cor do texto</Label><Input type="color" value={widget.props.color} onChange={e => updateProp("color", e.target.value)} className="h-8 w-full" /></div>
            <div><Label className={labelClasses}>Cor de fundo</Label><Input value={widget.props.backgroundColor} onChange={e => updateProp("backgroundColor", e.target.value)} className={inputClasses} /></div>
          </div>
        )}

        {widget.type === "image" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>Imagem</Label>
              <div className="flex gap-1.5 mt-1">
                <Input value={widget.props.src} onChange={e => updateProp("src", e.target.value)} className={inputClasses + " flex-1"} placeholder="URL ou envie arquivo" />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "src");
                    e.target.value = "";
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  disabled={uploading}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {widget.props.src && (
                <div className="mt-2 rounded border border-border overflow-hidden">
                  <img src={widget.props.src} alt="Preview" className="w-full h-20 object-cover" />
                </div>
              )}
            </div>
            <div>
              <Label className={labelClasses}>Ajuste</Label>
              <Select value={widget.props.fit} onValueChange={v => updateProp("fit", v)}>
                <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {widget.type === "shape" && (
          <div className="space-y-3">
            <div><Label className={labelClasses}>Cor de fundo</Label><Input value={widget.style.backgroundColor || ""} onChange={e => updateStyle("backgroundColor", e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Largura da borda</Label><Input type="number" value={widget.style.borderWidth ?? 0} onChange={e => updateStyle("borderWidth", +e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Cor da borda</Label><Input type="color" value={widget.style.borderColor || "#333333"} onChange={e => updateStyle("borderColor", e.target.value)} className="h-8 w-full" /></div>
          </div>
        )}

        {widget.type === "qrcode" && (
          <div className="space-y-3">
            <div><Label className={labelClasses}>Valor/URL</Label><Input value={widget.props.value} onChange={e => updateProp("value", e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Cor</Label><Input type="color" value={widget.props.fgColor} onChange={e => updateProp("fgColor", e.target.value)} className="h-8 w-full" /></div>
          </div>
        )}

        {widget.type === "queue_widget" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>Unidade</Label>
              <Select value={widget.props.unitId || ""} onValueChange={v => updateProp("unitId", v)}>
                <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border"><SelectValue placeholder="Selecione a unidade..." /></SelectTrigger>
                <SelectContent>
                  {unitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Unidade para exibir chamadas em tempo real</p>
            </div>
            <div className="flex items-center gap-2"><Switch checked={widget.props.showHistory !== false} onCheckedChange={v => updateProp("showHistory", v)} /><Label className={labelClasses}>Mostrar histórico</Label></div>
            <div><Label className={labelClasses}>Qtd. histórico</Label><Input type="number" value={widget.props.historyCount ?? 5} onChange={e => updateProp("historyCount", +e.target.value)} className={inputClasses} min={1} max={10} /></div>
          </div>
        )}

        {widget.type === "video" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>Vídeo</Label>
              <div className="flex gap-1.5 mt-1">
                <Input value={widget.props.src} onChange={e => updateProp("src", e.target.value)} className={inputClasses + " flex-1"} placeholder="URL ou envie arquivo" />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "src");
                    e.target.value = "";
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  disabled={uploading}
                  onClick={() => videoInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Envie do computador ou cole uma URL</p>
            </div>
            <div className="flex items-center gap-2"><Switch checked={widget.props.autoplay} onCheckedChange={v => updateProp("autoplay", v)} /><Label className={labelClasses}>Autoplay</Label></div>
            <div className="flex items-center gap-2"><Switch checked={widget.props.loop} onCheckedChange={v => updateProp("loop", v)} /><Label className={labelClasses}>Loop</Label></div>
            <div className="flex items-center gap-2"><Switch checked={widget.props.muted} onCheckedChange={v => updateProp("muted", v)} /><Label className={labelClasses}>Mudo</Label></div>
          </div>
        )}

        {widget.type === "webpage" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>URL</Label>
              <Input value={widget.props.url} onChange={e => updateProp("url", e.target.value)} className={inputClasses} placeholder="https://youtube.com/watch?v=..." />
              <p className="text-xs text-muted-foreground mt-1">Cole qualquer URL: site, YouTube, Google Slides, etc.</p>
            </div>
            <div className="flex items-center gap-2"><Switch checked={!!widget.props.directMode} onCheckedChange={v => updateProp("directMode", v)} /><Label className={labelClasses}>Modo Direto (sem proxy)</Label></div>
            {widget.props.directMode && <p className="text-xs text-muted-foreground">Carrega a URL diretamente no iframe. Use quando o site bloqueie o proxy ou precise de login do navegador.</p>}
            <div className="flex items-center gap-2"><Switch checked={!widget.props.muted} onCheckedChange={v => updateProp("muted", !v)} /><Label className={labelClasses}>Som ativado</Label></div>
            <div>
              <Label className={labelClasses}>Atualizar a cada (segundos)</Label>
              <Input type="number" value={widget.props.refreshInterval ?? 0} onChange={e => updateProp("refreshInterval", +e.target.value)} className={inputClasses} placeholder="0 = nunca" />
              <p className="text-xs text-muted-foreground mt-1">0 para não atualizar automaticamente</p>
            </div>
            <p className={sectionLabelClasses}>Enquadramento</p>
            <div>
              <div className="flex items-center justify-between">
                <Label className={labelClasses}>Zoom geral ({widget.props.zoom ?? 100}%)</Label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    updateProp("zoom", 100);
                    updateProp("zoomX", 100);
                    updateProp("zoomY", 100);
                    updateProp("scrollX", 0);
                    updateProp("scrollY", 0);
                  }}
                  title="Resetar enquadramento"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
              <Slider min={10} max={300} step={1} value={[widget.props.zoom ?? 100]} onValueChange={([v]) => updateProp("zoom", v)} />
            </div>
            <div>
              <Label className={labelClasses}>Zoom horizontal ({widget.props.zoomX ?? 100}%)</Label>
              <Slider min={10} max={300} step={1} value={[widget.props.zoomX ?? 100]} onValueChange={([v]) => updateProp("zoomX", v)} />
            </div>
            <div>
              <Label className={labelClasses}>Zoom vertical ({widget.props.zoomY ?? 100}%)</Label>
              <Slider min={10} max={300} step={1} value={[widget.props.zoomY ?? 100]} onValueChange={([v]) => updateProp("zoomY", v)} />
            </div>
            <p className="text-xs text-muted-foreground">Segure <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift</kbd> + arraste o widget para posicionar o conteúdo</p>
          </div>
        )}

        {widget.type === "weather" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>Cidade / Localidade</Label>
              <Input value={widget.props.city} onChange={e => updateProp("city", e.target.value)} className={inputClasses} placeholder="Ex: São Paulo, Curitiba, Lisboa..." />
              <p className="text-xs text-muted-foreground mt-1">Digite o nome da cidade para previsão do tempo</p>
            </div>
            <div><Label className={labelClasses}>Tamanho da fonte</Label><Input type="number" value={widget.props.fontSize} onChange={e => updateProp("fontSize", +e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Cor</Label><Input type="color" value={widget.props.color} onChange={e => updateProp("color", e.target.value)} className="h-8 w-full" /></div>
          </div>
        )}

        {widget.type === "rss" && (
          <div className="space-y-3">
            <div>
              <Label className={labelClasses}>URL do Feed RSS</Label>
              <Input value={widget.props.feedUrl} onChange={e => updateProp("feedUrl", e.target.value)} className={inputClasses} placeholder="https://site.com/rss.xml" />
              <p className="text-xs text-muted-foreground mt-1">Ex: https://noticias.uol.com.br/rss.xml</p>
            </div>
            <div>
              <Label className={labelClasses}>Título</Label>
              <Input value={widget.props.title} onChange={e => updateProp("title", e.target.value)} className={inputClasses} placeholder="Notícias" />
            </div>
            <div>
              <Label className={labelClasses}>Quantidade de itens</Label>
              <Input type="number" min={1} max={20} value={widget.props.limit} onChange={e => updateProp("limit", +e.target.value)} className={inputClasses} />
            </div>
            <div><Label className={labelClasses}>Tamanho da fonte</Label><Input type="number" value={widget.props.fontSize} onChange={e => updateProp("fontSize", +e.target.value)} className={inputClasses} /></div>
            <div><Label className={labelClasses}>Cor do texto</Label><Input type="color" value={widget.props.color} onChange={e => updateProp("color", e.target.value)} className="h-8 w-full" /></div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
