import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Shield, Trash2, Users, Mail } from "lucide-react";
import { format } from "date-fns";

interface Member {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin_empresa: "Admin",
  editor_conteudo: "Editor",
  operador_fila: "Operador",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/20 text-destructive border-destructive/30",
  admin_empresa: "bg-primary/20 text-primary border-primary/30",
  editor_conteudo: "bg-accent/20 text-accent border-accent/30",
  operador_fila: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  viewer: "",
};

const ASSIGNABLE_ROLES = ["admin_empresa", "editor_conteudo", "operador_fila", "viewer"];

export default function UsersManagement() {
  const { profile, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);

  const cid = profile?.company_id;

  const fetchMembers = async () => {
    if (!cid) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, created_at")
      .eq("company_id", cid);

    if (!profiles) { setLoading(false); return; }

    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("company_id", cid);

    const roleMap: Record<string, string[]> = {};
    allRoles?.forEach(r => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    setMembers(
      profiles.map(p => ({
        ...p,
        roles: roleMap[p.user_id] || [],
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, [cid]);

  const [inviteName, setInviteName] = useState("");

  const handleInvite = async () => {
    if (!cid || !inviteEmail.trim()) return;
    setInviting(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          full_name: inviteName.trim() || undefined,
        },
      });

      if (error) {
        toast({ title: "Erro ao convidar", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: data?.existed ? "Usuário adicionado!" : "Usuário criado e adicionado!",
          description: data?.existed
            ? "O usuário existente foi vinculado à sua empresa."
            : "Um novo usuário foi criado. Ele receberá acesso ao painel.",
        });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao convidar", variant: "destructive" });
    }

    setInviteOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("viewer");
    setInviting(false);
    fetchMembers();
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!cid) return;

    // Remove existing roles for this company
    await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("company_id", cid);

    // Insert new role
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      company_id: cid,
      role: newRole as any,
    });

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Papel atualizado!" });
    fetchMembers();
  };

  const handleRemove = async (userId: string) => {
    if (!cid || userId === user?.id) return;

    await supabase.from("user_roles").delete().eq("user_id", userId).eq("company_id", cid);
    await supabase.from("profiles").update({ company_id: null }).eq("user_id", userId);
    toast({ title: "Usuário removido da empresa" });
    fetchMembers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">{members.length} membros na empresa</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-nex text-white"><UserPlus className="h-4 w-4 mr-2" /> Adicionar Usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Usuário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  type="text"
                  placeholder="Nome do usuário"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Se o usuário já possui conta, ele será vinculado à empresa. Caso contrário, uma nova conta será criada automaticamente.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting} className="gradient-nex text-white">
                {inviting ? "Adicionando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : members.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum usuário encontrado</h3>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">
                      {m.full_name || "Sem nome"}
                      {m.user_id === user?.id && <Badge variant="outline" className="ml-2 text-xs">Você</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <Select
                        value={m.roles[0] || "viewer"}
                        onValueChange={v => handleChangeRole(m.user_id, v)}
                        disabled={m.user_id === user?.id}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(m.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {m.user_id !== user?.id && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(m.user_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
