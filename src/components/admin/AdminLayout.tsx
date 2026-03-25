import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import nexLogo from "@/assets/nexdisplay-logo.png";
import {
  LayoutDashboard, Monitor, MapPin, Users, Settings, LogOut,
  ChevronLeft, ChevronRight, Bell, ListOrdered, Menu, Layers, ListVideo,
  BarChart3, ImageIcon, UserCheck, Building2, BookOpen,
} from "lucide-react";
import { canAccessRoute } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/devices", icon: Monitor, label: "Dispositivos" },
  { to: "/admin/screens", icon: Layers, label: "Telas" },
  { to: "/admin/playlists", icon: ListVideo, label: "Playlists" },
  { to: "/admin/media", icon: ImageIcon, label: "Mídia" },
  { to: "/admin/units", icon: MapPin, label: "Unidades" },
  { to: "/admin/queue", icon: ListOrdered, label: "Chamador" },
  { to: "/admin/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/admin/users", icon: Users, label: "Usuários" },
  { to: "/admin/companies", icon: Building2, label: "Empresas" },
  { to: "/admin/guide", icon: BookOpen, label: "Guia" },
  { to: "/admin/settings", icon: Settings, label: "Configurações" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, roles, signOut } = useAuth();
  useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = roles.includes("super_admin");
  const allNavItems = [
    ...navItems,
    ...(isSuperAdmin ? [{ to: "/admin/access-requests", icon: UserCheck, label: "Solicitações" }] : []),
  ].filter(item => canAccessRoute(item.to, roles));

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <img src={nexLogo} alt="NexDisplay" className="h-8 object-contain" />
        {!collapsed && <span className="font-bold text-sm text-sidebar-foreground whitespace-nowrap">NexDisplay</span>}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {allNavItems.map(item => {
          const active = location.pathname === item.to || (item.to !== "/admin" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <button
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name || "Usuário"}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
            </div>
          )}
        </button>
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-destructive hover:bg-destructive/10",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[240px]"
      )}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-6 z-20 bg-sidebar-primary text-sidebar-primary-foreground rounded-full p-0.5 shadow-md hidden md:flex items-center justify-center h-5 w-5"
          style={{ left: collapsed ? 57 : 227 }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] h-full bg-sidebar flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            {location.pathname !== "/admin" && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
