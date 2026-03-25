import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { Building2, Palette, ListOrdered, CreditCard, Loader2, Save, Upload, X, Play } from "lucide-react";

const playSoundPreview = (sound: string) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (sound === "none") return;
    if (sound === "default" || sound === "bell") {
      // Bell: two-tone chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.frequency.value = sound === "bell" ? 1320 : 1100; osc2.type = "sine";
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime + 0.15); osc2.stop(ctx.currentTime + 0.6);
    } else if (sound === "chime") {
      [660, 880, 1100].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq; o.type = "sine";
        const t = ctx.currentTime + i * 0.2;
        g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        o.start(t); o.stop(t + 0.4);
      });
    } else if (sound === "ding") {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 1200; o.type = "sine";
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.8);
    } else if (sound === "alert") {
      // Alert: urgent two-tone alternating
      [0, 1, 2, 3].forEach((i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = i % 2 === 0 ? 800 : 1000; o.type = "square";
        const t = ctx.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        o.start(t); o.stop(t + 0.14);
      });
    } else if (sound === "melody") {
      // Melody: pleasant 4-note sequence
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq; o.type = "sine";
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        o.start(t); o.stop(t + 0.35);
      });
    } else if (sound === "soft") {
      // Soft: gentle low tone
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 440; o.type = "sine";
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 1.2);
    } else if (sound === "hospital") {
      // Hospital: calming two-tone
      [392, 523].forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq; o.type = "triangle";
        const t = ctx.currentTime + i * 0.4;
        g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
        o.start(t); o.stop(t + 0.6);
      });
    } else if (sound === "triple") {
      // Triple beep
      [0, 1, 2].forEach((i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 960; o.type = "sine";
        const t = ctx.currentTime + i * 0.25;
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        o.start(t); o.stop(t + 0.12);
      });
    }
  } catch {}
};

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, any> | null;
  is_active: boolean | null;
  trial_ends_at: string | null;
  created_at: string;
}

export default function SettingsPage() {
  const { profile, roles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);

  // Company profile fields
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // System preferences
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState("pt-BR");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");

  // Queue settings
  const [maxWaitMinutes, setMaxWaitMinutes] = useState("60");
  const [dailyReset, setDailyReset] = useState(true);
  const [callSound, setCallSound] = useState("default");
  const [autoRecallMinutes, setAutoRecallMinutes] = useState("5");
  const [showEstimatedWait, setShowEstimatedWait] = useState(true);

  useEffect(() => {
    loadCompany();
  }, [profile]);

  const loadCompany = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single();

    if (data) {
      setCompany(data as CompanyData);
      setCompanyName(data.name);
      setCompanySlug(data.slug);
      setLogoUrl(data.logo_url || "");

      const s = (data.settings as Record<string, any>) || {};
      // theme is managed by useTheme hook
      setLanguage(s.language || "pt-BR");
      setTimezone(s.timezone || "America/Sao_Paulo");
      setDateFormat(s.date_format || "dd/MM/yyyy");
      setMaxWaitMinutes(String(s.max_wait_minutes || 60));
      setDailyReset(s.daily_reset !== false);
      setCallSound(s.call_sound || "default");
      setAutoRecallMinutes(String(s.auto_recall_minutes || 5));
      setShowEstimatedWait(s.show_estimated_wait !== false);
    }
    if (error) {
      toast({ title: "Erro ao carregar configurações", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem (PNG, JPG, SVG...)", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O logo deve ter no máximo 2MB", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const filePath = `${company.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploadingLogo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    setLogoUrl(publicUrl);

    // Save immediately
    const { error } = await supabase
      .from("companies")
      .update({ logo_url: publicUrl })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Erro ao salvar logo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Logo atualizado!" });
    }
    setUploadingLogo(false);
    e.target.value = "";
  };

  const removeLogo = async () => {
    if (!company) return;
    setLogoUrl("");
    await supabase.from("companies").update({ logo_url: null }).eq("id", company.id);
    toast({ title: "Logo removido" });
  };

  const saveCompanyProfile = async () => {
    if (!company) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update({ name: companyName, slug: companySlug, logo_url: logoUrl || null })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil da empresa atualizado!" });
    }
    setSaving(false);
  };

  const saveSettings = async (section: string) => {
    if (!company) return;
    setSaving(true);
    const currentSettings = (company.settings as Record<string, any>) || {};
    const newSettings = {
      ...currentSettings,
      theme,
      language,
      timezone,
      date_format: dateFormat,
      max_wait_minutes: parseInt(maxWaitMinutes),
      daily_reset: dailyReset,
      call_sound: callSound,
      auto_recall_minutes: parseInt(autoRecallMinutes),
      show_estimated_wait: showEstimatedWait,
    };

    const { error } = await supabase
      .from("companies")
      .update({ settings: newSettings })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setCompany({ ...company, settings: newSettings });
      toast({ title: `${section} atualizadas!` });
    }
    setSaving(false);
  };

  const isAdmin = roles.includes("admin_empresa") || roles.includes("super_admin");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <Card><CardContent className="py-10 text-center text-muted-foreground">Empresa não encontrada.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua empresa e do sistema</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="company" className="gap-2"><Building2 className="h-4 w-4 hidden sm:block" /> Empresa</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2"><Palette className="h-4 w-4 hidden sm:block" /> Preferências</TabsTrigger>
          <TabsTrigger value="queue" className="gap-2"><ListOrdered className="h-4 w-4 hidden sm:block" /> Fila</TabsTrigger>
          <TabsTrigger value="plan" className="gap-2"><CreditCard className="h-4 w-4 hidden sm:block" /> Plano</TabsTrigger>
        </TabsList>

        {/* ===== PERFIL DA EMPRESA ===== */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Perfil da Empresa</CardTitle>
              <CardDescription>Informações básicas da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da empresa</Label>
                  <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySlug">Slug (URL)</Label>
                  <Input id="companySlug" value={companySlug} onChange={e => setCompanySlug(e.target.value)} disabled={!isAdmin} placeholder="minha-empresa" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo da empresa</Label>
                {logoUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="p-4 border border-border rounded-lg bg-muted/30 inline-block">
                      <img src={logoUrl} alt="Logo" className="h-16 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-2">
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                          <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                            <span>
                              {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                              Trocar
                            </span>
                          </Button>
                        </label>
                        <Button variant="ghost" size="sm" onClick={removeLogo} className="text-destructive hover:text-destructive">
                          <X className="h-4 w-4 mr-2" /> Remover
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  isAdmin && (
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                      <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                        {uploadingLogo ? (
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <span className="text-sm">Clique para enviar o logo</span>
                            <span className="text-xs">PNG, JPG ou SVG (máx. 2MB)</span>
                          </div>
                        )}
                      </div>
                    </label>
                  )
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID da empresa</Label>
                  <Input value={company.id} disabled className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Criada em</Label>
                  <Input value={new Date(company.created_at).toLocaleDateString("pt-BR")} disabled />
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={saveCompanyProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PREFERÊNCIAS DO SISTEMA ===== */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferências do Sistema</CardTitle>
              <CardDescription>Personalize a aparência e comportamento do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select value={theme} onValueChange={setTheme} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Escuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="system">Automático (Sistema)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={language} onValueChange={setLanguage} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (BR)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuso horário</Label>
                  <Select value={timezone} onValueChange={setTimezone} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                      <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                      <SelectItem value="America/Bahia">Bahia (GMT-3)</SelectItem>
                      <SelectItem value="America/Belem">Belém (GMT-3)</SelectItem>
                      <SelectItem value="America/Fortaleza">Fortaleza (GMT-3)</SelectItem>
                      <SelectItem value="America/Recife">Recife (GMT-3)</SelectItem>
                      <SelectItem value="America/Cuiaba">Cuiabá (GMT-4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de data</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat} disabled={!isAdmin}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/AAAA</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/AAAA</SelectItem>
                      <SelectItem value="yyyy-MM-dd">AAAA-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={() => saveSettings("Preferências")} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar preferências
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CONFIGURAÇÕES DE FILA ===== */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Fila</CardTitle>
              <CardDescription>Ajuste o comportamento do chamador de senhas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxWait">Tempo máximo de espera (minutos)</Label>
                  <Input id="maxWait" type="number" value={maxWaitMinutes} onChange={e => setMaxWaitMinutes(e.target.value)} disabled={!isAdmin} min="1" max="480" />
                  <p className="text-xs text-muted-foreground">Alerta quando um ticket ultrapassa esse tempo</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoRecall">Re-chamada automática (minutos)</Label>
                  <Input id="autoRecall" type="number" value={autoRecallMinutes} onChange={e => setAutoRecallMinutes(e.target.value)} disabled={!isAdmin} min="1" max="30" />
                  <p className="text-xs text-muted-foreground">Tempo para rechamar automaticamente</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reset diário automático</Label>
                    <p className="text-xs text-muted-foreground mt-1">Reinicia a numeração das senhas diariamente</p>
                  </div>
                  <Switch checked={dailyReset} onCheckedChange={setDailyReset} disabled={!isAdmin} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Exibir tempo estimado de espera</Label>
                    <p className="text-xs text-muted-foreground mt-1">Mostra estimativa de espera no painel do cliente</p>
                  </div>
                  <Switch checked={showEstimatedWait} onCheckedChange={setShowEstimatedWait} disabled={!isAdmin} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Som de chamada</Label>
                <div className="flex items-center gap-2">
                  <Select value={callSound} onValueChange={setCallSound} disabled={!isAdmin}>
                    <SelectTrigger className="w-full sm:w-[280px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                    <SelectItem value="default">Padrão</SelectItem>
                    <SelectItem value="bell">Sino</SelectItem>
                    <SelectItem value="chime">Chime</SelectItem>
                    <SelectItem value="ding">Ding</SelectItem>
                    <SelectItem value="alert">Alerta</SelectItem>
                    <SelectItem value="melody">Melodia</SelectItem>
                    <SelectItem value="soft">Suave</SelectItem>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="triple">Bipe Triplo</SelectItem>
                    <SelectItem value="none">Sem som</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => playSoundPreview(callSound)}
                    disabled={callSound === "none"}
                    title="Ouvir som"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={() => saveSettings("Configurações de fila")} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar configurações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PLANO / ASSINATURA ===== */}
        <TabsContent value="plan">
          <Card>
            <CardHeader>
              <CardTitle>Plano & Assinatura</CardTitle>
              <CardDescription>Informações sobre seu plano atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-xl font-bold mt-1 ${company.is_active ? "text-primary" : "text-destructive"}`}>{company.is_active ? "Ativo" : "Inativo"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <p className="text-xl font-bold mt-1">{company.trial_ends_at ? "Trial" : "Padrão"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-border">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Trial expira em</p>
                    <p className="text-xl font-bold mt-1">
                      {company.trial_ends_at
                        ? new Date(company.trial_ends_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Recursos do plano</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Dispositivos ilimitados</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Telas e playlists ilimitadas</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Chamador de senhas</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Relatórios e analytics</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /> Suporte por email</li>
                </ul>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button variant="outline" disabled>
                    Gerenciar assinatura (em breve)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
