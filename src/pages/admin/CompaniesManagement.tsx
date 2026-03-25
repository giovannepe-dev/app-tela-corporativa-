import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Building2, CheckCircle, Ban, Eye, Search, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Company {
  id: string;
  name: string;
  slug: string;
  is_approved: boolean | null;
  is_active: boolean | null;
  plan_type: string | null;
  plan_days: number | null;
  plan_ends_at: string | null;
  plan_starts_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface CompanyDetail extends Company {
  member_count: number;
  device_count: number;
  owner_name: string | null;
  owner_email: string | null;
}

export default function CompaniesManagement() {
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Plan management
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planCompany, setPlanCompany] = useState<CompanyDetail | null>(null);
  const [planType, setPlanType] = useState("custom");
  const [planDays, setPlanDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCompany, setDeleteCompany] = useState<CompanyDetail | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("company_id, full_name, email, created_at")
      .order("created_at", { ascending: true });

    const { data: devices } = await supabase
      .from("devices")
      .select("company_id");

    const memberCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};
    const ownerInfo: Record<string, { name: string | null; email: string | null }> = {};
    profiles?.forEach(p => {
      if (p.company_id) {
        memberCounts[p.company_id] = (memberCounts[p.company_id] || 0) + 1;
        if (!ownerInfo[p.company_id]) {
          ownerInfo[p.company_id] = { name: p.full_name, email: p.email };
        }
      }
    });
    devices?.forEach(d => {
      if (d.company_id) deviceCounts[d.company_id] = (deviceCounts[d.company_id] || 0) + 1;
    });

    setCompanies(
      data.map(c => ({
        ...c,
        member_count: memberCounts[c.id] || 0,
        device_count: deviceCounts[c.id] || 0,
        owner_name: ownerInfo[c.id]?.name || null,
        owner_email: ownerInfo[c.id]?.email || null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleToggleActive = async (company: CompanyDetail) => {
    const newActive = !company.is_active;
    const { error } = await supabase
      .from("companies")
      .update({ is_active: newActive })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newActive ? "Empresa ativada!" : "Empresa bloqueada!" });
      fetchCompanies();
    }
  };

  const handleApprove = async (company: CompanyDetail) => {
    const { error } = await supabase
      .from("companies")
      .update({ is_approved: true, is_active: true })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Empresa aprovada!" });
      fetchCompanies();
    }
  };

  const openPlanDialog = (company: CompanyDetail) => {
    setPlanCompany(company);
    setPlanType(company.plan_type === "lifetime" ? "lifetime" : company.plan_type === "test" ? "test" : "custom");
    setPlanDays(company.plan_days?.toString() || "30");
    setPlanDialogOpen(true);
  };

  const handleChangePlan = async () => {
    if (!planCompany) return;
    setSubmitting(true);

    let planEnds: string | null = null;
    let days: number | null = null;

    if (planType === "lifetime") {
      planEnds = null;
      days = null;
    } else if (planType === "test") {
      planEnds = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      days = null;
    } else {
      days = parseInt(planDays) || 30;
      planEnds = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from("companies")
      .update({
        plan_type: planType === "custom" ? "custom" : planType,
        plan_days: days,
        plan_starts_at: new Date().toISOString(),
        plan_ends_at: planEnds,
        trial_ends_at: planEnds,
        is_active: true,
        is_approved: true,
      })
      .eq("id", planCompany.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano atualizado!" });
      setPlanDialogOpen(false);
      setDetailOpen(false);
      fetchCompanies();
    }
    setSubmitting(false);
  };

  const openDeleteDialog = (company: CompanyDetail) => {
    setDeleteCompany(company);
    setDeleteConfirm("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompany || deleteConfirm !== deleteCompany.name) return;
    setSubmitting(true);

    // Delete related data in order (foreign key constraints)
    const cid = deleteCompany.id;
    await supabase.from("ticket_events").delete().in("ticket_id",
      (await supabase.from("tickets").select("id").eq("company_id", cid)).data?.map(t => t.id) || []
    );
    await supabase.from("tickets").delete().eq("company_id", cid);
    await supabase.from("queue_daily_sequences").delete().in("queue_id",
      (await supabase.from("queues").select("id").eq("company_id", cid)).data?.map(q => q.id) || []
    );
    await supabase.from("queues").delete().eq("company_id", cid);
    await supabase.from("counters").delete().eq("company_id", cid);
    await supabase.from("playlist_items").delete().in("playlist_id",
      (await supabase.from("playlists").select("id").eq("company_id", cid)).data?.map(p => p.id) || []
    );
    await supabase.from("playlists").delete().eq("company_id", cid);
    await supabase.from("screen_versions").delete().in("screen_id",
      (await supabase.from("screens").select("id").eq("company_id", cid)).data?.map(s => s.id) || []
    );
    await supabase.from("devices").delete().eq("company_id", cid);
    await supabase.from("screens").delete().eq("company_id", cid);
    await supabase.from("media_files").delete().eq("company_id", cid);
    await supabase.from("device_group_members").delete().in("group_id",
      (await supabase.from("device_groups").select("id").eq("company_id", cid)).data?.map(g => g.id) || []
    );
    await supabase.from("device_groups").delete().eq("company_id", cid);
    await supabase.from("units").delete().eq("company_id", cid);
    await supabase.from("user_roles").delete().eq("company_id", cid);
    await supabase.from("audit_logs").delete().eq("company_id", cid);
    await supabase.from("trial_leads").delete().eq("company_id", cid);

    // Remove profiles link
    const { data: companyProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("company_id", cid);
    
    if (companyProfiles?.length) {
      for (const p of companyProfiles) {
        await supabase.from("access_requests").delete().eq("user_id", p.user_id);
      }
      await supabase.from("profiles").update({ company_id: null }).eq("company_id", cid);
    }

    const { error } = await supabase.from("companies").delete().eq("id", cid);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Empresa excluída com sucesso!" });
      setDeleteDialogOpen(false);
      setDetailOpen(false);
      fetchCompanies();
    }
    setSubmitting(false);
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const approved = filtered.filter(c => c.is_approved && c.is_active);
  const pending = filtered.filter(c => !c.is_approved);
  const blocked = filtered.filter(c => c.is_approved && !c.is_active);
  const expired = filtered.filter(c => c.plan_ends_at && new Date(c.plan_ends_at) < new Date() && c.plan_type !== "lifetime");

  const planLabel = (c: Company) => {
    if (c.plan_type === "lifetime") return "Vitalício";
    if (c.plan_type === "test") return "Teste";
    if (c.plan_type === "custom" && c.plan_days) return `${c.plan_days} dias`;
    if (c.plan_type === "pending") return "Pendente";
    return c.plan_type || "—";
  };

  const isExpired = (c: Company) => {
    if (c.plan_type === "lifetime") return false;
    if (!c.plan_ends_at) return false;
    return new Date(c.plan_ends_at) < new Date();
  };

  const statusBadge = (c: Company) => {
    if (!c.is_approved) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Pendente</Badge>;
    if (!c.is_active) return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Bloqueada</Badge>;
    if (isExpired(c)) return <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30">Expirada</Badge>;
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Ativa</Badge>;
  };

  const CompanyTable = ({ items }: { items: CompanyDetail[] }) => (
    items.length === 0 ? (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma empresa nesta categoria</p>
        </CardContent>
      </Card>
    ) : (
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Membros</TableHead>
                <TableHead className="w-[180px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {c.owner_name && <p className="text-xs text-muted-foreground">{c.owner_name} • {c.owner_email}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(c)}</TableCell>
                  <TableCell className="text-muted-foreground">{planLabel(c)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.plan_type === "lifetime" ? "—" : c.plan_ends_at ? format(new Date(c.plan_ends_at), "dd/MM/yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell>{c.member_count}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Detalhes"
                        onClick={() => { setSelectedCompany(c); setDetailOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Alterar plano" className="text-blue-400"
                        onClick={() => openPlanDialog(c)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {!c.is_approved && (
                        <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => handleApprove(c)}>
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {c.is_approved && (
                        <Button size="sm" variant="ghost"
                          className={c.is_active ? "text-destructive" : "text-emerald-400"}
                          onClick={() => handleToggleActive(c)}>
                          {c.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" title="Excluir empresa"
                        onClick={() => openDeleteDialog(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">
            {companies.length} empresas cadastradas
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todas ({filtered.length})</TabsTrigger>
            <TabsTrigger value="approved">Ativas ({approved.length})</TabsTrigger>
            <TabsTrigger value="expired">Expiradas ({expired.length})</TabsTrigger>
            <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
            <TabsTrigger value="blocked">Bloqueadas ({blocked.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><CompanyTable items={filtered} /></TabsContent>
          <TabsContent value="approved"><CompanyTable items={approved} /></TabsContent>
          <TabsContent value="expired"><CompanyTable items={expired} /></TabsContent>
          <TabsContent value="pending"><CompanyTable items={pending} /></TabsContent>
          <TabsContent value="blocked"><CompanyTable items={blocked} /></TabsContent>
        </Tabs>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCompany?.name}</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{statusBadge(selectedCompany)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plano</Label>
                  <p className="mt-1 font-medium">{planLabel(selectedCompany)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Membros</Label>
                  <p className="mt-1 font-medium">{selectedCompany.member_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Dispositivos</Label>
                  <p className="mt-1 font-medium">{selectedCompany.device_count}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cadastro</Label>
                  <p className="mt-1">{format(new Date(selectedCompany.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
                {selectedCompany.plan_ends_at && (
                  <div>
                    <Label className="text-muted-foreground">Expira em</Label>
                    <p className="mt-1">{format(new Date(selectedCompany.plan_ends_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-2">
            {selectedCompany && (
              <>
                <Button variant="outline" onClick={() => { openPlanDialog(selectedCompany); }}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Alterar Plano
                </Button>
                {selectedCompany.is_approved && (
                  <Button
                    variant={selectedCompany.is_active ? "destructive" : "default"}
                    onClick={() => { handleToggleActive(selectedCompany); setDetailOpen(false); }}
                  >
                    {selectedCompany.is_active ? "Bloquear" : "Ativar"}
                  </Button>
                )}
                <Button variant="destructive" onClick={() => openDeleteDialog(selectedCompany)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Change Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano — {planCompany?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Plano</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Teste (5 minutos)</SelectItem>
                  <SelectItem value="custom">Personalizado (dias)</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planType === "custom" && (
              <div className="space-y-2">
                <Label>Duração (dias)</Label>
                <Input type="number" min="1" value={planDays} onChange={e => setPlanDays(e.target.value)} placeholder="30" />
              </div>
            )}
            <Button onClick={handleChangePlan} disabled={submitting} className="w-full gradient-nex text-white">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Alteração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong>irreversível</strong>. Todos os dados da empresa serão excluídos permanentemente:
              telas, playlists, dispositivos, filas, tickets, mídias e usuários vinculados.
            </p>
            <div className="space-y-2">
              <Label>Digite o nome da empresa para confirmar: <strong>{deleteCompany?.name}</strong></Label>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={deleteCompany?.name}
              />
            </div>
            <Button
              variant="destructive"
              className="w-full"
              disabled={deleteConfirm !== deleteCompany?.name || submitting}
              onClick={handleDeleteCompany}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir Permanentemente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
