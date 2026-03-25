import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, MapPin, Users, Wifi } from "lucide-react";
import TrialLeadsPanel from "@/components/admin/TrialLeadsPanel";

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ devices: 0, online: 0, units: 0, users: 0 });

  useEffect(() => {
    if (!profile?.company_id) return;
    const cid = profile.company_id;

    Promise.all([
      supabase.from("devices").select("id, status", { count: "exact" }).eq("company_id", cid),
      supabase.from("units").select("id", { count: "exact" }).eq("company_id", cid),
      supabase.from("profiles").select("id", { count: "exact" }).eq("company_id", cid),
    ]).then(([devRes, unitRes, userRes]) => {
      const devices = devRes.data ?? [];
      setStats({
        devices: devRes.count ?? 0,
        online: devices.filter((d: any) => d.status === "online").length,
        units: unitRes.count ?? 0,
        users: userRes.count ?? 0,
      });
    });
  }, [profile?.company_id]);

  const cards = [
    { title: "Dispositivos", value: stats.devices, icon: Monitor, color: "text-primary" },
    { title: "Online", value: stats.online, icon: Wifi, color: "text-green-500" },
    { title: "Unidades", value: stats.units, icon: MapPin, color: "text-accent" },
    { title: "Usuários", value: stats.users, icon: Users, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Card key={card.title} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TrialLeadsPanel />
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
