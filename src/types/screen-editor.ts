export interface Widget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  rotation: number;
  props: Record<string, any>;
  style: WidgetStyle;
}

export type WidgetType =
  | "text"
  | "image"
  | "video"
  | "clock"
  | "qrcode"
  | "ticker"
  | "shape"
  | "queue_widget"
  | "webpage"
  | "youtube"
  | "weather"
  | "rss";

export interface WidgetStyle {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  shadow?: boolean;
  padding?: number;
}

export interface ScreenLayout {
  widgets: Widget[];
}

export interface ScreenTemplate {
  name: string;
  category: string;
  width: number;
  height: number;
  backgroundColor: string;
  layout: ScreenLayout;
}

export const WIDGET_DEFAULTS: Record<WidgetType, Partial<Widget>> = {
  text: {
    width: 400,
    height: 80,
    props: { content: "Texto aqui", fontSize: 32, fontWeight: "bold", color: "#ffffff", textAlign: "center", fontFamily: "Inter" },
    style: { opacity: 1, borderRadius: 0, padding: 8 },
  },
  image: {
    width: 300,
    height: 200,
    props: { src: "", fit: "contain", alt: "" },
    style: { opacity: 1, borderRadius: 8 },
  },
  video: {
    width: 640,
    height: 360,
    props: { src: "", autoplay: true, loop: true, muted: true },
    style: { opacity: 1, borderRadius: 0 },
  },
  clock: {
    width: 300,
    height: 100,
    props: { format: "HH:mm:ss", showDate: true, timezone: "America/Sao_Paulo", color: "#ffffff", fontSize: 48 },
    style: { opacity: 1 },
  },
  qrcode: {
    width: 200,
    height: 200,
    props: { value: "https://nexdisplay.com", fgColor: "#ffffff", bgColor: "transparent" },
    style: { opacity: 1 },
  },
  ticker: {
    width: 800,
    height: 60,
    props: { content: "Bem-vindo ao NexDisplay — Gestão Inteligente de TV Corporativa", speed: 60, color: "#ffffff", fontSize: 24, backgroundColor: "rgba(0,0,0,0.6)" },
    style: { opacity: 1 },
  },
  shape: {
    width: 200,
    height: 200,
    props: { shapeType: "rectangle" },
    style: { backgroundColor: "rgba(59,130,246,0.3)", opacity: 1, borderRadius: 12 },
  },
  queue_widget: {
    width: 500,
    height: 400,
    props: { unitId: "", showHistory: true, historyCount: 5 },
    style: { opacity: 1, borderRadius: 16 },
  },
  webpage: {
    width: 800,
    height: 500,
    props: { url: "https://", refreshInterval: 0, muted: true },
    style: { opacity: 1, borderRadius: 8 },
  },
  youtube: {
    width: 960,
    height: 540,
    props: { videoId: "", autoplay: true, controls: true, loop: false, playlist: "" },
    style: { opacity: 1, borderRadius: 8 },
  },
  weather: {
    width: 350,
    height: 250,
    props: { city: "São Paulo", color: "#ffffff", fontSize: 48 },
    style: { opacity: 1, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)" },
  },
  rss: {
    width: 500,
    height: 600,
    props: { feedUrl: "https://rss.uol.com.br/feed/noticias.xml", limit: 6, color: "#ffffff", fontSize: 16, title: "Notícias" },
    style: { opacity: 1, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.4)" },
  },
};

export const TEMPLATES: ScreenTemplate[] = [
  {
    name: "Recepção Clínica",
    category: "Saúde",
    width: 1920,
    height: 1080,
    backgroundColor: "#0a0e1a",
    layout: {
      widgets: [
        { id: "t1", type: "text", x: 60, y: 40, width: 600, height: 80, zIndex: 2, locked: false, visible: true, rotation: 0, props: { content: "{{empresa.nome}}", fontSize: 36, fontWeight: "bold", color: "#ffffff", textAlign: "left", fontFamily: "Inter" }, style: { opacity: 1, padding: 8 } },
        { id: "c1", type: "clock", x: 1500, y: 30, width: 380, height: 90, zIndex: 2, locked: false, visible: true, rotation: 0, props: { format: "HH:mm", showDate: true, timezone: "America/Sao_Paulo", color: "#ffffff", fontSize: 52 }, style: { opacity: 1 } },
        { id: "q1", type: "queue_widget", x: 60, y: 160, width: 700, height: 500, zIndex: 1, locked: false, visible: true, rotation: 0, props: { unitId: "", showHistory: true, historyCount: 5 }, style: { opacity: 1, borderRadius: 16 } },
        { id: "tk1", type: "ticker", x: 0, y: 1020, width: 1920, height: 60, zIndex: 3, locked: false, visible: true, rotation: 0, props: { content: "Bem-vindo! Aguarde sua senha ser chamada no painel.", speed: 50, color: "#ffffff", fontSize: 22, backgroundColor: "rgba(59,130,246,0.8)" }, style: { opacity: 1 } },
      ],
    },
  },
  {
    name: "Varejo - Promoções",
    category: "Varejo",
    width: 1920,
    height: 1080,
    backgroundColor: "#0f172a",
    layout: {
      widgets: [
        { id: "t1", type: "text", x: 60, y: 40, width: 800, height: 100, zIndex: 2, locked: false, visible: true, rotation: 0, props: { content: "OFERTAS DO DIA", fontSize: 56, fontWeight: "900", color: "#fbbf24", textAlign: "left", fontFamily: "Inter" }, style: { opacity: 1, padding: 8 } },
        { id: "c1", type: "clock", x: 1550, y: 30, width: 340, height: 80, zIndex: 2, locked: false, visible: true, rotation: 0, props: { format: "HH:mm", showDate: false, timezone: "America/Sao_Paulo", color: "#94a3b8", fontSize: 40 }, style: { opacity: 1 } },
        { id: "s1", type: "shape", x: 60, y: 160, width: 580, height: 400, zIndex: 1, locked: false, visible: true, rotation: 0, props: { shapeType: "rectangle" }, style: { backgroundColor: "rgba(59,130,246,0.15)", opacity: 1, borderRadius: 20, borderWidth: 1, borderColor: "rgba(59,130,246,0.3)" } },
        { id: "t2", type: "text", x: 80, y: 180, width: 540, height: 60, zIndex: 2, locked: false, visible: true, rotation: 0, props: { content: "Produto em destaque", fontSize: 28, fontWeight: "600", color: "#e2e8f0", textAlign: "center", fontFamily: "Inter" }, style: { opacity: 1, padding: 4 } },
      ],
    },
  },
  {
    name: "Layout Vazio",
    category: "Geral",
    width: 1920,
    height: 1080,
    backgroundColor: "#0a0e1a",
    layout: { widgets: [] },
  },
  {
    name: "Portrait - Corredor",
    category: "Geral",
    width: 1080,
    height: 1920,
    backgroundColor: "#0a0e1a",
    layout: {
      widgets: [
        { id: "t1", type: "text", x: 40, y: 40, width: 1000, height: 80, zIndex: 2, locked: false, visible: true, rotation: 0, props: { content: "{{empresa.nome}}", fontSize: 36, fontWeight: "bold", color: "#ffffff", textAlign: "center", fontFamily: "Inter" }, style: { opacity: 1, padding: 8 } },
        { id: "c1", type: "clock", x: 290, y: 140, width: 500, height: 100, zIndex: 2, locked: false, visible: true, rotation: 0, props: { format: "HH:mm:ss", showDate: true, timezone: "America/Sao_Paulo", color: "#ffffff", fontSize: 52 }, style: { opacity: 1 } },
      ],
    },
  },
];
