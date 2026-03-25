import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Loader2, MessageCircle, Mail, Shield, LogOut } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import nexLogo from "@/assets/nexdisplay-logo.svg";

interface CompanyPlan {
  plan_type: string | null;
  plan_days: number | null;
  plan_starts_at: string | null;
  plan_ends_at: string | null;
  is_approved: boolean | null;
  is_active: boolean | null;
}

export default function TrialGuard({ children }: { children: React.ReactNode }) {
  const { profile, roles, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyPlan | null>(null);
  const [companyLoaded, setCompanyLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (authLoading) return;
    if (!profile?.company_id) { setLoading(false); return; }
    if (roles.includes("super_admin")) { setLoading(false); return; }

    supabase
      .from("companies")
      .select("plan_type, plan_days, plan_starts_at, plan_ends_at, is_approved, is_active")
      .eq("id", profile.company_id)
      .single()
      .then(({ data }) => {
        setCompany(data as CompanyPlan | null);
        setCompanyLoaded(true);
        setLoading(false);
      })
      .catch(() => { setCompanyLoaded(true); setLoading(false); });
  }, [profile?.company_id, roles, authLoading]);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super admin bypass
  if (roles.includes("super_admin")) return <>{children}</>;

  // No company linked — only block after company fetch confirmed nothing was found
  if (companyLoaded && (!profile?.company_id || !company)) {
    return (
      <div className="min-h-screen gradient-nex-dark flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="w-full max-w-lg relative z-10 text-center">
          <img src={nexLogo} alt="NexDisplay" className="h-16 mx-auto mb-8 object-contain" />
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Aguardando Aprovação</h1>
              <p className="text-muted-foreground">
                Sua solicitação de acesso está sendo analisada. Em breve entraremos em contato.
              </p>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">Entre em contato:</p>
                <a href="https://wa.me/5562998816808" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span>(62) 99881-6808</span>
                </a>
                <a href="mailto:smartsolucoesstore@gmail.com" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>smartsolucoesstore@gmail.com</span>
                </a>
              </div>
              <Button variant="outline" onClick={async () => { await signOut(); navigate("/auth"); }} className="w-full mt-2">
                <LogOut className="h-4 w-4 mr-2" />
                Voltar ao login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not approved yet
  if (company && !company.is_approved) {
    return (
      <div className="min-h-screen gradient-nex-dark flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="w-full max-w-lg relative z-10 text-center">
          <img src={nexLogo} alt="NexDisplay" className="h-16 mx-auto mb-8 object-contain" />
          <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Aguardando Aprovação</h1>
              <p className="text-muted-foreground">
                Sua solicitação de acesso está sendo analisada. Em breve entraremos em contato.
              </p>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium">Entre em contato:</p>
                <a href="https://wa.me/5562998816808" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span>(62) 99881-6808</span>
                </a>
                <a href="mailto:smartsolucoesstore@gmail.com" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>smartsolucoesstore@gmail.com</span>
                </a>
              </div>
              <Button variant="outline" onClick={async () => { await signOut(); navigate("/auth"); }} className="w-full mt-2">
                <LogOut className="h-4 w-4 mr-2" />
                Voltar ao login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if plan expired (not lifetime)
  if (company && company.plan_type !== "lifetime" && company.plan_ends_at) {
    const endsAt = new Date(company.plan_ends_at);
    if (now >= endsAt) {
      return (
        <div className="min-h-screen gradient-nex-dark flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-[128px]" />
          <div className="w-full max-w-lg relative z-10 text-center">
            <img src={nexLogo} alt="NexDisplay" className="h-16 mx-auto mb-8 object-contain" />
            <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
              <CardContent className="p-8 space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold">Licença Expirada</h1>
                <p className="text-muted-foreground">
                  Seu plano expirou. Para renovar sua licença, entre em contato:
                </p>
                <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                  <a href="https://wa.me/5562998816808" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">(62) 99881-6808</span>
                  </a>
                  <a href="mailto:smartsolucoesstore@gmail.com" className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium">smartsolucoesstore@gmail.com</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  }

  // Show plan info banner for active plans
  const planBanner = getPlanBanner(company, now);

  return (
    <>
      {planBanner}
      {children}
    </>
  );
}

function getPlanBanner(company: CompanyPlan | null, now: Date) {
  if (!company || !company.is_approved) return null;

  if (company.plan_type === "lifetime") {
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2 text-sm">
        <Shield className="h-4 w-4 text-primary" />
        <span className="font-medium">Plano Vitalício ∞</span>
      </div>
    );
  }

  if (!company.plan_ends_at || !company.plan_starts_at) return null;

  const endsAt = new Date(company.plan_ends_at);
  const startsAt = new Date(company.plan_starts_at);
  const totalMs = endsAt.getTime() - startsAt.getTime();
  const remainingMs = Math.max(0, endsAt.getTime() - now.getTime());
  const progress = totalMs > 0 ? ((totalMs - remainingMs) / totalMs) * 100 : 100;

  const remaining = formatCountdown(remainingMs);
  const planLabel = company.plan_type === "test" ? "Teste" : `${company.plan_days} dias`;

  return (
    <div className="bg-muted/50 border-b border-border px-4 py-2">
      <div className="flex items-center justify-between gap-4 text-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>Plano: <strong>{planLabel}</strong></span>
        </div>
        <div className="flex items-center gap-3 flex-1 max-w-xs">
          <Progress value={progress} className="h-2" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{remaining}</span>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expirado";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h restantes`;
  if (hours > 0) return `${hours}h ${mins}m restantes`;
  return `${mins}m ${secs}s restantes`;
}
