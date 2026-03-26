import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import nexLogo from "@/assets/nexdisplay-logo.png";
import { Loader2, Mail, Lock, User, Building2, Phone, CheckCircle2, MessageCircle } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "pending">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen gradient-nex-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/admin" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast({ title: "Preencha o nome da empresa", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName, phone: phone },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    // Create company with pending approval
    if (data.user) {
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const trialEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: onboardError } = await supabase.rpc("onboard_new_company", {
        _user_id: data.user.id,
        _company_name: companyName,
        _company_slug: slug + "-" + Date.now(),
        _trial_ends_at: trialEndsAt,
        _full_name: fullName,
        _email: email,
      });
      if (onboardError) {
        console.error("Onboarding error:", onboardError);
      }
      // Notify admin about new access request
      supabase.functions.invoke("notify-access-request", {
        body: { full_name: fullName, email, company_name: companyName, phone },
      }).catch(console.error);
    }
    toast({ title: "Solicitação enviada!", description: "Verifique seu email e aguarde aprovação." });
    setMode("pending");
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Email enviado", description: "Verifique sua caixa de entrada." });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen gradient-nex-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <img src={nexLogo} alt="NexDisplay" className="h-24 mx-auto mb-4 object-contain" />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-border/50 shadow-2xl">
          <CardContent className="p-6 pt-6">
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-xl font-semibold text-center mb-2">Entrar</h2>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-nex text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
                <div className="flex justify-between text-sm">
                  <button type="button" onClick={() => setMode("forgot")} className="text-primary hover:underline">Esqueci a senha</button>
                  <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline">Criar conta</button>
                </div>
              </form>
            )}

            {mode === "signup" && (
              <form onSubmit={handleSignup} className="space-y-4">
                <h2 className="text-xl font-semibold text-center mb-2">Solicitar Acesso</h2>
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Seu nome" value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nome da empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Sua empresa" value={companyName} onChange={e => setCompanyName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-nex text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Solicitar acesso"}
                </Button>
                <button type="button" onClick={() => setMode("login")} className="w-full text-sm text-primary hover:underline">
                  Já tem conta? Entrar
                </button>
              </form>
            )}

            {mode === "pending" && (
              <div className="space-y-6 text-center py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Solicitação Enviada!</h2>
                <p className="text-muted-foreground text-sm">
                  Sua solicitação de acesso foi recebida. Aguarde nosso contato ou entre em contato:
                </p>
                <div className="space-y-3 text-sm">
                  <a href="https://wa.me/5562998816808" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 font-medium hover:text-primary transition-colors">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    (62) 99881-6808
                  </a>
                  <a href="mailto:smartsolucoesstore@gmail.com" className="flex items-center justify-center gap-2 font-medium hover:text-primary transition-colors">
                    <Mail className="h-4 w-4 text-primary" />
                    smartsolucoesstore@gmail.com
                  </a>
                </div>
                <Button variant="outline" onClick={() => setMode("login")} className="w-full">
                  Voltar ao login
                </Button>
              </div>
            )}

            {mode === "forgot" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <h2 className="text-xl font-semibold text-center mb-2">Recuperar Senha</h2>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-nex text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
                </Button>
                <button type="button" onClick={() => setMode("login")} className="w-full text-sm text-primary hover:underline">Voltar ao login</button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} NexDisplay — Gestão Inteligente
        </p>
      </motion.div>
    </div>
  );
}
