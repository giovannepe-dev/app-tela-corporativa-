import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";



export function ClockWidgetPreview({ props }: { props: Record<string, any> }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    ...(props.format?.includes("ss") ? { second: "2-digit" } : {}),
    timeZone: props.timezone || "America/Sao_Paulo",
  });

  const date = now.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: props.timezone || "America/Sao_Paulo",
  });

  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none">
      <span style={{ fontSize: props.fontSize || 48, color: props.color || "#fff", fontWeight: "bold", lineHeight: 1.1, fontFamily: "JetBrains Mono, monospace" }}>
        {time}
      </span>
      {props.showDate && (
        <span style={{ fontSize: (props.fontSize || 48) * 0.35, color: props.color || "#fff", opacity: 0.6, marginTop: 4, textTransform: "capitalize" }}>
          {date}
        </span>
      )}
    </div>
  );
}

export function TextWidgetPreview({ props }: { props: Record<string, any> }) {
  return (
    <div className="h-full w-full flex items-center overflow-hidden" style={{ padding: 4 }}>
      <p style={{
        fontSize: props.fontSize || 24,
        fontWeight: props.fontWeight || "normal",
        color: props.color || "#ffffff",
        textAlign: props.textAlign || "left",
        fontFamily: props.fontFamily || "Inter",
        lineHeight: 1.2,
        width: "100%",
        wordBreak: "break-word",
      }}>
        {props.content || "Texto"}
      </p>
    </div>
  );
}

export function TickerWidgetPreview({ props }: { props: Record<string, any> }) {
  return (
    <div className="h-full w-full overflow-hidden flex items-center"
      style={{ backgroundColor: props.backgroundColor || "rgba(0,0,0,0.6)" }}>
      <div className="whitespace-nowrap animate-marquee" style={{
        fontSize: props.fontSize || 24,
        color: props.color || "#ffffff",
        animation: `marquee ${Math.max(5, 200 / (props.speed || 60)) * 5}s linear infinite`,
      }}>
        {props.content || "Texto em rolagem"}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

export function ShapeWidgetPreview({ style }: { style: Record<string, any> }) {
  return (
    <div className="h-full w-full" style={{
      backgroundColor: style.backgroundColor || "rgba(59,130,246,0.3)",
      borderRadius: style.borderRadius || 0,
      border: style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || "#333"}` : undefined,
    }} />
  );
}

export function QRCodeWidgetPreview({ props }: { props: Record<string, any> }) {
  const value = props.value || "https://nexdisplay.com";
  const fgColor = props.fgColor || "#ffffff";
  const bgColor = props.bgColor || "transparent";

  return (
    <div className="h-full w-full flex items-center justify-center p-2" style={{ backgroundColor: bgColor }}>
      <QRCodeSVG
        value={value}
        size={1024}
        fgColor={fgColor}
        bgColor={bgColor === "transparent" ? "transparent" : bgColor}
        style={{ width: "100%", height: "100%", maxWidth: "100%", maxHeight: "100%" }}
        level="M"
      />
    </div>
  );
}

export function ImageWidgetPreview({ props }: { props: Record<string, any> }) {
  if (!props.src) {
    return (
      <div className="h-full w-full flex items-center justify-center border border-dashed border-white/20 rounded">
        <p className="text-white/30 text-sm">Imagem</p>
      </div>
    );
  }
  return <img src={props.src} alt={props.alt || ""} className="h-full w-full" style={{ objectFit: props.fit || "contain" }} />;
}

export function QueueWidgetPreview() {
  return (
    <div className="h-full w-full rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col">
      <p className="text-sm text-white/40 uppercase tracking-widest mb-2">Chamador</p>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl font-black text-blue-400">A-001</p>
          <p className="text-lg text-white/60 mt-2">Guichê 1</p>
        </div>
      </div>
      <div className="space-y-1">
        {["A-002", "A-003"].map(n => (
          <div key={n} className="flex justify-between p-1.5 rounded bg-white/5 text-xs">
            <span className="font-mono">{n}</span>
            <span className="text-white/40">Guichê 2</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Webpage widget with proxy support
export function WebpageWidgetPreview({ props, isPlayer }: { props: Record<string, any>; isPlayer?: boolean }) {
  const url = props.url || "";
  const muted = props.muted !== false;
  const zoom = (props.zoom ?? 100) / 100;
  const zoomX = (props.zoomX ?? 100) / 100;
  const zoomY = (props.zoomY ?? 100) / 100;
  const scaleX = zoom * zoomX;
  const scaleY = zoom * zoomY;
  const scrollX = props.scrollX ?? 0;
  const scrollY = props.scrollY ?? 0;
  const [debouncedUrl, setDebouncedUrl] = useState(url);
  const [proxyHtml, setProxyHtml] = useState<string | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUrl(url), 800);
    return () => clearTimeout(t);
  }, [url]);

  const isEmbeddable = (rawUrl: string): boolean => {
    try {
      const u = new URL(rawUrl);
      const host = u.hostname.replace("www.", "");
      return ["youtube.com", "youtu.be", "docs.google.com", "slides.google.com", "vimeo.com"].some((d) => host.includes(d));
    } catch {
      return false;
    }
  };

  const getEmbedUrl = (rawUrl: string): string => {
    try {
      const u = new URL(rawUrl);
      const muteParam = muted ? "1" : "0";
      if ((u.hostname === "www.youtube.com" || u.hostname === "youtube.com") && u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}?autoplay=1&mute=${muteParam}&enablejsapi=1`;
      }
      if (u.hostname === "youtu.be") {
        return `https://www.youtube.com/embed${u.pathname}?autoplay=1&mute=${muteParam}&enablejsapi=1`;
      }
      if (u.hostname === "www.youtube.com" && u.pathname.startsWith("/embed")) {
        return rawUrl.includes("enablejsapi") ? rawUrl : rawUrl + (rawUrl.includes("?") ? "&" : "?") + "enablejsapi=1";
      }
      return rawUrl;
    } catch {
      return rawUrl;
    }
  };

  const getProxyUrl = (rawUrl: string): string => {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return `${base}/functions/v1/proxy-url?url=${encodeURIComponent(rawUrl)}&apikey=${key}`;
  };

  if (!url || url === "https://") {
    return (
      <div className="h-full w-full flex items-center justify-center border border-dashed border-white/20 rounded bg-black/20">
        <div className="text-center">
          <svg className="h-8 w-8 mx-auto mb-2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-white/30 text-sm">URL / Webpage</p>
        </div>
      </div>
    );
  }

  const normalizedDebouncedUrl = debouncedUrl.trim();
  const embeddable = isEmbeddable(normalizedDebouncedUrl);

  // Embeddable sites (YouTube, etc.): use direct embed URL
  if (embeddable) {
    const iframeSrc = getEmbedUrl(normalizedDebouncedUrl);
    return (
      <div className="h-full w-full overflow-hidden relative">
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          className="border-0 absolute"
          allow="autoplay; encrypted-media; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          style={{
            pointerEvents: isPlayer ? "auto" : "none",
            width: 1920,
            height: 1080,
            transform: `translate(${scrollX}px, ${scrollY}px) scale(${scaleX}, ${scaleY})`,
            transformOrigin: "0 0",
          }}
        />
      </div>
    );
  }

  // All other URLs: fetch HTML via proxy and inject via srcdoc for reliable rendering
  useEffect(() => {
    if (!normalizedDebouncedUrl || embeddable) return;
    let cancelled = false;
    setProxyHtml(null);
    setProxyLoading(true);
    fetch(getProxyUrl(normalizedDebouncedUrl))
      .then(r => r.text())
      .then(html => { if (!cancelled) { setProxyHtml(html); setProxyLoading(false); } })
      .catch(() => { if (!cancelled) setProxyLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedDebouncedUrl, embeddable]);

  if (proxyLoading && !proxyHtml) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-black/20">
        <p className="text-white/40 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden relative">
      <iframe
        key={normalizedDebouncedUrl}
        srcDoc={proxyHtml ?? undefined}
        className="border-0 absolute"
        allow="autoplay; encrypted-media; fullscreen; speaker"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox"
        style={{
          pointerEvents: isPlayer ? "auto" : "none",
          width: 1920,
          height: 1080,
          transform: `translate(${scrollX}px, ${scrollY}px) scale(${scaleX}, ${scaleY})`,
          transformOrigin: "0 0",
        }}
      />
    </div>
  );
}


interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  image: string;
}

export function RSSWidgetPreview({ props }: { props: Record<string, any> }) {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [feedTitle, setFeedTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const feedUrl = props.feedUrl || "";
  const limit = props.limit || 6;
  const color = props.color || "#ffffff";
  const fontSize = props.fontSize || 16;
  const [debouncedUrl, setDebouncedUrl] = useState(feedUrl);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedUrl(feedUrl), 800);
    return () => clearTimeout(t);
  }, [feedUrl]);

  useEffect(() => {
    if (!debouncedUrl || debouncedUrl.length < 10) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    const fetchFeed = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('rss-feed', {
          body: { url: debouncedUrl, limit },
        });
        if (cancelled) return;
        if (fnError) {
          setError("Erro ao buscar feed");
        } else if (data?.error) {
          setError(data.error);
        } else {
          setItems(data.items || []);
          setFeedTitle(data.title || props.title || "RSS");
        }
      } catch {
        if (!cancelled) setError("Falha na conexão");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [debouncedUrl, limit]);

  if (!feedUrl || feedUrl.length < 10) {
    return (
      <div className="h-full w-full flex items-center justify-center border border-dashed border-white/20 rounded">
        <p className="text-white/30 text-sm">Cole uma URL de feed RSS</p>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span style={{ color, opacity: 0.5, fontSize: 14 }}>Carregando notícias...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span style={{ color, opacity: 0.5, fontSize: 14 }}>{error}</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden p-3 flex flex-col" style={{ color }}>
      <p className="text-xs uppercase tracking-widest opacity-50 mb-2 shrink-0">
        {props.title || feedTitle || "Notícias"}
      </p>
      <div className="flex-1 overflow-hidden space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 p-2 rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            {item.image && (
              <img src={item.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p style={{ fontSize, fontWeight: 600, lineHeight: 1.2 }} className="line-clamp-2">{item.title}</p>
              {item.pubDate && (
                <p style={{ fontSize: fontSize * 0.7, opacity: 0.5, marginTop: 2 }}>
                  {new Date(item.pubDate).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const weatherCodeToInfo: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Céu limpo" },
  1: { icon: "🌤️", label: "Parcialmente limpo" },
  2: { icon: "⛅", label: "Parcialmente nublado" },
  3: { icon: "☁️", label: "Nublado" },
  45: { icon: "🌫️", label: "Neblina" },
  48: { icon: "🌫️", label: "Neblina gelada" },
  51: { icon: "🌦️", label: "Garoa leve" },
  53: { icon: "🌦️", label: "Garoa" },
  55: { icon: "🌦️", label: "Garoa forte" },
  61: { icon: "🌧️", label: "Chuva leve" },
  63: { icon: "🌧️", label: "Chuva moderada" },
  65: { icon: "🌧️", label: "Chuva forte" },
  71: { icon: "❄️", label: "Neve leve" },
  73: { icon: "❄️", label: "Neve moderada" },
  75: { icon: "❄️", label: "Neve forte" },
  80: { icon: "🌧️", label: "Pancadas leves" },
  81: { icon: "🌧️", label: "Pancadas" },
  82: { icon: "⛈️", label: "Pancadas fortes" },
  95: { icon: "⛈️", label: "Trovoada" },
  96: { icon: "⛈️", label: "Trovoada c/ granizo" },
  99: { icon: "⛈️", label: "Trovoada forte" },
};

interface WeatherData {
  temp: number;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
}

export function WeatherWidgetPreview({ props }: { props: Record<string, any> }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const city = props.city || "São Paulo";
  const [debouncedCity, setDebouncedCity] = useState(city);

  // Debounce city changes - wait 800ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCity(city), 800);
    return () => clearTimeout(timer);
  }, [city]);

  useEffect(() => {
    if (!debouncedCity || debouncedCity.trim().length < 2) return;
    let cancelled = false;
    const fetchWeather = async () => {
      setLoading(true);
      setError(false);
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(debouncedCity)}&count=1&language=pt`);
        const geoData = await geoRes.json();
        if (!geoData.results?.length) {
          if (!cancelled) { setError(true); setLoading(false); }
          return;
        }
        const { latitude, longitude } = geoData.results[0];

        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`);
        const wxData = await wxRes.json();
        if (!cancelled) {
          setWeather({
            temp: Math.round(wxData.current.temperature_2m),
            weatherCode: wxData.current.weather_code,
            tempMax: Math.round(wxData.daily.temperature_2m_max[0]),
            tempMin: Math.round(wxData.daily.temperature_2m_min[0]),
          });
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [debouncedCity]);

  const color = props.color || "#ffffff";
  const fontSize = props.fontSize || 48;
  const info = weather ? (weatherCodeToInfo[weather.weatherCode] || { icon: "🌡️", label: "—" }) : null;

  if (loading && !weather) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span style={{ color, opacity: 0.5, fontSize: 14 }}>Carregando clima...</span>
      </div>
    );
  }

  if (!weather || error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span style={{ color, opacity: 0.5, fontSize: 14 }}>{error ? "Cidade não encontrada" : "Sem dados"}</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center select-none p-3" style={{ color }}>
      <span style={{ fontSize: fontSize * 0.9, lineHeight: 1 }}>{info?.icon}</span>
      <span style={{ fontSize, fontWeight: "bold", lineHeight: 1.1, marginTop: 4 }}>
        {weather.temp}°C
      </span>
      <span style={{ fontSize: fontSize * 0.3, opacity: 0.7, marginTop: 2 }}>
        {info?.label}
      </span>
      <span style={{ fontSize: fontSize * 0.25, opacity: 0.5, marginTop: 4 }}>
        ↑ {weather.tempMax}° ↓ {weather.tempMin}° — {city}
      </span>
    </div>
  );
}
