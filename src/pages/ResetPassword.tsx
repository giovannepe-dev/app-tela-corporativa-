import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Senha atualizada!" });
      navigate("/auth");
    }
    setSubmitting(false);
  };

  if (!ready) return (
    <div className="min-h-screen gradient-nex-dark flex items-center justify-center text-foreground">
      <p className="text-muted-foreground">Link inválido ou expirado.</p>
    </div>
  );

  return (
    <div className="min-h-screen gradient-nex-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border-border/50">
        <CardContent className="p-6 pt-6">
          <h2 className="text-xl font-semibold text-center mb-4">Nova Senha</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-nex text-white" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
