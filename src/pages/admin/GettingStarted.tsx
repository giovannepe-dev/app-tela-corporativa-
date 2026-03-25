import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Monitor, MapPin, Layers, ListVideo, ImageIcon, ListOrdered,
  ChevronRight, CheckCircle2, Circle, Play, Tv, BookOpen,
  ArrowRight, Wifi,
} from "lucide-react";

interface Step {
  number: number;
  title: string;
  description: string;
  details: string[];
  icon: React.ElementType;
  link?: string;
  linkLabel?: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: "Crie suas Unidades",
    description: "Unidades representam os locais físicos da sua empresa (filiais, lojas, clínicas).",
    details: [
      "Acesse o menu 'Unidades' no painel lateral",
      "Clique em 'Nova Unidade'",
      "Preencha o nome, endereço e fuso horário",
      "Cada unidade pode ter seus próprios dispositivos, filas e telas",
    ],
    icon: MapPin,
    link: "/admin/units",
    linkLabel: "Ir para Unidades",
  },
  {
    number: 2,
    title: "Faça upload das suas Mídias",
    description: "Envie imagens e vídeos que serão usados nas suas telas de sinalização.",
    details: [
      "Acesse 'Mídia' no menu lateral",
      "Clique em 'Enviar' ou arraste arquivos para a área de upload",
      "Formatos aceitos: JPG, PNG, MP4, WebM",
      "Organize em pastas para facilitar o gerenciamento",
    ],
    icon: ImageIcon,
    link: "/admin/media",
    linkLabel: "Ir para Mídia",
  },
  {
    number: 3,
    title: "Crie suas Telas",
    description: "Monte layouts personalizados com widgets de texto, imagem, vídeo, relógio e muito mais.",
    details: [
      "Acesse 'Telas' e clique em 'Nova Tela'",
      "Use o editor visual para arrastar widgets no canvas",
      "Widgets disponíveis: Texto, Imagem, Vídeo, Relógio, Página Web, Fila",
      "Configure cores, fontes e posições de cada widget",
      "Salve e visualize o resultado em tempo real",
    ],
    icon: Layers,
    link: "/admin/screens",
    linkLabel: "Ir para Telas",
  },
  {
    number: 4,
    title: "Monte suas Playlists",
    description: "Organize as telas em sequência com tempo de exibição e transições.",
    details: [
      "Acesse 'Playlists' e clique em 'Nova Playlist'",
      "Adicione as telas criadas na ordem desejada",
      "Defina a duração de cada tela (em segundos)",
      "Configure agendamento por dias da semana e horários",
    ],
    icon: ListVideo,
    link: "/admin/playlists",
    linkLabel: "Ir para Playlists",
  },
  {
    number: 5,
    title: "Cadastre e Pareie Dispositivos",
    description: "Conecte suas TVs e monitores ao sistema para exibir o conteúdo.",
    details: [
      "No dispositivo (TV/monitor), acesse a URL /pair no navegador",
      "Um código de 6 dígitos será exibido na tela",
      "No painel, acesse 'Dispositivos' e clique em 'Parear Dispositivo'",
      "Digite o código exibido na TV para vincular",
      "Atribua uma playlist ao dispositivo pareado",
    ],
    icon: Monitor,
    link: "/admin/devices",
    linkLabel: "Ir para Dispositivos",
  },
  {
    number: 6,
    title: "Configure o Chamador de Filas (opcional)",
    description: "Se sua empresa atende clientes com senhas, configure o sistema de filas.",
    details: [
      "Acesse 'Chamador' no menu lateral",
      "Crie filas com prefixos (ex: N para Normal, P para Preferencial)",
      "Configure os guichês/balcões de atendimento",
      "Use o painel do operador para chamar senhas",
      "A tela do painel de senhas é exibida automaticamente no widget de fila",
    ],
    icon: ListOrdered,
    link: "/admin/queue",
    linkLabel: "Ir para Chamador",
  },
];

export default function GettingStarted() {
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const saved = localStorage.getItem("nexdisplay_guide_completed");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps(prev => {
      const next = prev.includes(stepNumber)
        ? prev.filter(n => n !== stepNumber)
        : [...prev, stepNumber];
      localStorage.setItem("nexdisplay_guide_completed", JSON.stringify(next));
      return next;
    });
  };

  const progress = Math.round((completedSteps.length / steps.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guia de Início Rápido</h1>
            <p className="text-muted-foreground text-sm">
              Siga os passos abaixo para configurar sua sinalização digital
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {completedSteps.length} de {steps.length} concluídos
            </Badge>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.number);
          const Icon = step.icon;

          return (
            <Card
              key={step.number}
              className={cn(
                "transition-all duration-200",
                isCompleted && "opacity-75"
              )}
            >
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {/* Step indicator */}
                  <button
                    onClick={() => toggleStep(step.number)}
                    className="shrink-0 mt-0.5"
                    title={isCompleted ? "Marcar como pendente" : "Marcar como concluído"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={cn(
                          "font-semibold text-base",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          Passo {step.number}: {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>

                    <ul className="space-y-1.5">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                          {detail}
                        </li>
                      ))}
                    </ul>

                    {step.link && (
                      <Link to={step.link}>
                        <Button variant="outline" size="sm" className="gap-1.5 mt-1">
                          {step.linkLabel} <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick tips */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-primary" />
            Dicas Rápidas
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Play className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              Para testar, acesse <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">/pair</code> em qualquer navegador para simular um dispositivo
            </li>
            <li className="flex items-start gap-2">
              <Tv className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              Na TV, use um navegador em tela cheia (F11) para melhor experiência
            </li>
            <li className="flex items-start gap-2">
              <Layers className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              Alterações nas telas e playlists são refletidas automaticamente nos dispositivos
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
