import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import nexLogo from "@/assets/nexdisplay-logo.svg";
import { Monitor, ListOrdered, Shield, Zap, ArrowRight, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();
  const features = [
    { icon: Monitor, title: "Digital Signage", desc: "Gerencie TVs corporativas com editor visual drag & drop, playlists e agendamento." },
    { icon: ListOrdered, title: "Chamador de Senhas", desc: "Sistema completo de filas com prioridades, guichês e exibição em tempo real." },
    { icon: Shield, title: "Multi-empresa", desc: "Arquitetura multi-tenant com RBAC completo e auditoria de ações." },
    { icon: Zap, title: "Tempo Real", desc: "Sincronização instantânea entre painel admin e TVs via WebSocket." },
  ];

  return (
    <div className="min-h-screen gradient-nex-dark text-foreground dark relative overflow-hidden">
      {/* Glows */}
      <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <img src={nexLogo} alt="NexDisplay" className="h-10 object-contain" />
        <div className="flex gap-3">
          {user ? (
            <Link to="/admin"><Button className="gradient-nex text-white gap-2"><LayoutDashboard className="h-4 w-4" /> Painel</Button></Link>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" className="text-foreground">Entrar</Button></Link>
              <Link to="/auth"><Button className="gradient-nex text-white">Solicitar acesso</Button></Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Gestão <span className="text-gradient-nex">Inteligente</span> de<br />TV Corporativa
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Plataforma completa de Digital Signage e Chamador de Senhas. Controle suas TVs, conteúdos e filas de atendimento em uma única solução.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth"><Button size="lg" className="gradient-nex text-white glow-blue">Solicitar acesso <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card/10 backdrop-blur-sm border border-border/30 rounded-xl p-6 hover:border-primary/40 transition-colors"
            >
              <f.icon className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NexDisplay — Gestão Inteligente. Todos os direitos reservados.
      </footer>
    </div>
  );
}
