import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TEMPLATES } from "@/types/screen-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Monitor, Layout } from "lucide-react";

export default function ScreensList() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [screens, setScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateDialog, setTemplateDialog] = useState(false);

  const fetchScreens = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("screens")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("updated_at", { ascending: false });
    setScreens(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchScreens(); }, [profile?.company_id]);

  const createFromTemplate = async (templateIndex: number) => {
    if (!profile?.company_id) return;
    const t = TEMPLATES[templateIndex];
    const { data, error } = await supabase.from("screens").insert({
      company_id: profile.company_id,
      name: t.name,
      width: t.width,
      height: t.height,
      background_color: t.backgroundColor,
      layout_json: t.layout as any,
      orientation: t.width > t.height ? "landscape" : "portrait",
      created_by: user?.id,
    }).select().single();
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setTemplateDialog(false);
      navigate(`/admin/screens/edit/${data.id}`);
    }
  };

  const deleteScreen = async (id: string) => {
    await supabase.from("screens").delete().eq("id", id);
    fetchScreens();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Telas</h1><p className="text-muted-foreground">Crie e edite layouts para suas TVs</p></div>
        <div className="flex gap-2">
          <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline"><Layout className="h-4 w-4 mr-2" />Templates</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Escolher Template</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-auto">
                {TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => createFromTemplate(i)}
                    className="text-left p-4 rounded-lg border border-border hover:border-primary/40 transition-colors bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.category} · {t.width}×{t.height}</p>
                      </div>
                      <Badge variant="secondary">{t.layout.widgets.length} widgets</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button className="gradient-nex text-white" onClick={() => navigate("/admin/screens/edit/new")}>
            <Plus className="h-4 w-4 mr-2" />Nova Tela
          </Button>
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Carregando...</p> : screens.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-16">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma tela criada</h3>
            <p className="text-muted-foreground text-sm mt-2">Comece com um template ou crie do zero.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screens.map(s => {
            const wCount = (s.layout_json as any)?.widgets?.length ?? 0;
            return (
              <Card key={s.id} className="bg-card border-border hover:border-primary/30 transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">{s.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{s.status ?? "draft"}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mini preview */}
                  <div className="w-full aspect-video rounded-lg mb-3 overflow-hidden" style={{ backgroundColor: s.background_color || "#0a0e1a" }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-white/20 text-xs">{s.width}×{s.height} · {wCount} widgets</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{s.orientation} · {new Date(s.updated_at).toLocaleDateString("pt-BR")}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/screens/edit/${s.id}`)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteScreen(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
