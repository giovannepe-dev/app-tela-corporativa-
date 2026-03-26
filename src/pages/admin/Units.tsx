import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, MapPin, Trash2 } from "lucide-react";

export default function Units() {
  const { profile } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const fetch = async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase.from("units").select("*").eq("company_id", profile.company_id).order("created_at");
    setUnits(data ?? []);
  };

  useEffect(() => { fetch(); }, [profile?.company_id]);

  const handleCreate = async () => {
    if (!name.trim()) { toast({ title: "Preencha o nome", variant: "destructive" }); return; }
    if (!profile?.company_id) { toast({ title: "Erro", description: "Perfil não carregado. Recarregue a página.", variant: "destructive" }); return; }
    const { error } = await supabase.from("units").insert({ company_id: profile.company_id, name, address: address || null });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Unidade criada!" }); setDialogOpen(false); setName(""); setAddress(""); fetch(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("units").delete().eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Unidades</h1><p className="text-muted-foreground">Gerencie filiais e locais</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button className="gradient-nex text-white"><Plus className="h-4 w-4 mr-2" /> Nova Unidade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Unidade</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Filial Centro" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Endereço</Label><Input placeholder="Ex: Rua..." value={address} onChange={e => setAddress(e.target.value)} /></div>
              <Button onClick={handleCreate} className="w-full gradient-nex text-white">Criar Unidade</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {units.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="flex flex-col items-center py-16"><MapPin className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">Nenhuma unidade</h3></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map(u => (
            <Card key={u.id} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div><p className="font-semibold">{u.name}</p>{u.address && <p className="text-sm text-muted-foreground">{u.address}</p>}</div>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
