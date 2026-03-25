import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Loader2, User, Building2, Phone, Mail } from "lucide-react";

interface AccessRequest {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  company_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

export default function AccessRequests() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialog, setApproveDialog] = useState<AccessRequest | null>(null);
  const [planType, setPlanType] = useState("custom");
  const [planDays, setPlanDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as AccessRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async () => {
    if (!approveDialog) return;
    setSubmitting(true);
    const days = planType === "test" ? null : planType === "lifetime" ? null : parseInt(planDays);
    
    const { error } = await supabase.rpc("approve_access_request", {
      _request_id: approveDialog.id,
      _plan_type: planType === "custom" ? "custom" : planType,
      _plan_days: days,
    });

    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acesso aprovado!" });
      setApproveDialog(null);
      fetchRequests();
    }
    setSubmitting(false);
  };

  const handleReject = async (req: AccessRequest) => {
    await supabase
      .from("access_requests")
      .update({ status: "rejected" })
      .eq("id", req.id);
    toast({ title: "Solicitação rejeitada" });
    fetchRequests();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case "approved": return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitações de Acesso</h1>
        <p className="text-muted-foreground">Gerencie solicitações de novos clientes</p>
      </div>

      {requests.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma solicitação encontrada</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{req.full_name || "Sem nome"}</span>
                      {statusBadge(req.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{req.company_name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{req.email}</span>
                      {req.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{req.phone}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { setApproveDialog(req); setPlanType("custom"); setPlanDays("30"); }}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>
                        <XCircle className="h-4 w-4 mr-1" />Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Acesso — {approveDialog?.full_name}</DialogTitle>
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
            <Button onClick={handleApprove} disabled={submitting} className="w-full gradient-nex text-white">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Aprovação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
