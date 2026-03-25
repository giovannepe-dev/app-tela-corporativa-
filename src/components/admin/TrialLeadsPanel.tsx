import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, Phone, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface TrialLead {
  id: string;
  full_name: string | null;
  email: string;
  company_name: string | null;
  phone: string | null;
  trial_starts_at: string;
  trial_ends_at: string;
  status: string;
  notes: string | null;
  contacted_at: string | null;
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  converted: "bg-primary/10 text-primary border-primary/20",
  contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  expired: "Expirado",
  converted: "Convertido",
  contacted: "Contatado",
};

export default function TrialLeadsPanel() {
  const { roles } = useAuth();
  const [leads, setLeads] = useState<TrialLead[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = roles.includes("super_admin");

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const fetchLeads = async () => {
      const { data } = await supabase
        .from("trial_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20) as any;
      setLeads(data ?? []);
      setLoading(false);
    };

    fetchLeads();

    // Realtime subscription
    const channel = supabase
      .channel("trial-leads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trial_leads" }, (payload) => {
        setLeads(prev => [payload.new as TrialLead, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin]);

  const markContacted = async (leadId: string) => {
    const { error } = await supabase
      .from("trial_leads")
      .update({ status: "contacted", contacted_at: new Date().toISOString() } as any)
      .eq("id", leadId);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: "contacted", contacted_at: new Date().toISOString() } : l));
      toast({ title: "Lead marcado como contatado" });
    }
  };

  if (!isSuperAdmin || loading) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Leads de Trial Recentes
        </CardTitle>
        <Badge variant="outline">{leads.length} leads</Badge>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum lead de trial ainda.</p>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{lead.full_name || "Sem nome"}</span>
                    <Badge className={statusColors[lead.status] || ""} variant="outline">
                      {statusLabels[lead.status] || lead.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                    {lead.company_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company_name}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expira: {format(new Date(lead.trial_ends_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                {lead.status === "active" || lead.status === "expired" ? (
                  <Button variant="outline" size="sm" onClick={() => markContacted(lead.id)} className="shrink-0 ml-2">
                    Marcar contatado
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
