import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Widget } from "@/types/screen-editor";
import {
  ClockWidgetPreview,
  TextWidgetPreview,
  TickerWidgetPreview,
  ShapeWidgetPreview,
  QRCodeWidgetPreview,
  ImageWidgetPreview,
  WeatherWidgetPreview,
  WebpageWidgetPreview,
  RSSWidgetPreview,
} from "@/components/editor/WidgetPreviews";
import QueueWidgetPlayer from "@/components/player/QueueWidgetPlayer";
import YoutubeWidgetPlayer from "@/components/player/YoutubeWidgetPlayer";

interface ScreenData {
  width: number;
  height: number;
  backgroundColor: string;
  widgets: Widget[];
}

interface PlaylistItemData {
  screen: ScreenData;
  duration_seconds: number;
  transition: string;
}

// Video component: tries unmuted autoplay first (works in installed PWA/TWA),
// falls back to muted autoplay + progressive unmute attempts
function AutoUnmuteVideo({ src, autoPlay, loop, soundEnabled }: { src: string; autoPlay: boolean; loop: boolean; soundEnabled: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!soundEnabled) {
      el.muted = true;
      if (autoPlay) el.play().catch(() => {});
      return;
    }

    // Strategy 1: Try playing with sound directly (works in installed PWA/TWA apps)
    el.muted = false;
    el.volume = 1;
    const playPromise = el.play();

    if (playPromise) {
      playPromise.catch(() => {
        // Strategy 2: Browser blocked unmuted autoplay — start muted, then unmute progressively
        el.muted = true;
        el.play().catch(() => {});

        const tryUnmute = () => {
          try {
            el.muted = false;
            el.volume = 1;
          } catch {}
        };

        // Retry unmuting at intervals
        const t1 = setTimeout(tryUnmute, 1000);
        const t2 = setTimeout(tryUnmute, 3000);
        const t3 = setTimeout(tryUnmute, 5000);

        const handler = () => tryUnmute();
        window.addEventListener("keydown", handler, { once: true });
        window.addEventListener("click", handler, { once: true });
        window.addEventListener("touchstart", handler, { once: true });
        window.addEventListener("pointerdown", handler, { once: true });

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          window.removeEventListener("keydown", handler);
          window.removeEventListener("click", handler);
          window.removeEventListener("touchstart", handler);
          window.removeEventListener("pointerdown", handler);
        };
      });
    }
  }, [src, soundEnabled, autoPlay]);

  return (
    <video
      ref={ref}
      src={src}
      loop={loop}
      playsInline
      className="h-full w-full object-cover"
    />
  );
}

function WidgetRenderer({ widget }: { widget: Widget }) {
  if (!widget.visible) return null;

  const base: React.CSSProperties = {
    position: "absolute",
    left: widget.x,
    top: widget.y,
    width: widget.width,
    height: widget.height,
    zIndex: widget.zIndex,
    opacity: widget.style.opacity ?? 1,
    borderRadius: widget.style.borderRadius ?? 0,
    border: widget.style.borderWidth
      ? `${widget.style.borderWidth}px solid ${widget.style.borderColor || "#333"}`
      : undefined,
    boxShadow: widget.style.shadow ? "0 8px 32px rgba(0,0,0,0.4)" : undefined,
    transform: widget.rotation ? `rotate(${widget.rotation}deg)` : undefined,
    overflow: "hidden",
  };

  let inner: React.ReactNode = null;
  switch (widget.type) {
    case "text": inner = <TextWidgetPreview props={widget.props} />; break;
    case "clock": inner = <ClockWidgetPreview props={widget.props} />; break;
    case "ticker": inner = <TickerWidgetPreview props={widget.props} />; break;
    case "shape": inner = <ShapeWidgetPreview style={widget.style} />; break;
    case "qrcode": inner = <QRCodeWidgetPreview props={widget.props} />; break;
    case "image": inner = <ImageWidgetPreview props={widget.props} />; break;
    case "video":
      inner = widget.props.src ? (
        <AutoUnmuteVideo
          src={widget.props.src}
          autoPlay={widget.props.autoplay !== false}
          loop={widget.props.loop}
          soundEnabled={widget.props.muted !== true}
        />
      ) : null;
      break;
    case "queue_widget": inner = <QueueWidgetPlayer props={widget.props} />; break;
    case "youtube": inner = <YoutubeWidgetPlayer props={widget.props} />; break;
    case "webpage": inner = <WebpageWidgetPreview props={widget.props} isPlayer />; break;
    case "weather": inner = <WeatherWidgetPreview props={widget.props} />; break;
    case "rss": inner = <RSSWidgetPreview props={widget.props} />; break;
  }

  return <div style={base}>{inner}</div>;
}

function ScreenCanvas({ screen, transition, visible }: { screen: ScreenData; transition: string; visible: boolean }) {
  const transitionStyle: React.CSSProperties = {
    transition: "opacity 0.8s ease",
    opacity: visible ? 1 : 0,
    ...(transition === "none" ? { transition: "none" } : {}),
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center" style={transitionStyle}>
      <div
        style={{
          width: screen.width,
          height: screen.height,
          backgroundColor: screen.backgroundColor,
          position: "relative",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: `${screen.width} / ${screen.height}`,
          transform: "scale(1)",
          transformOrigin: "center center",
        }}
      >
        {screen.widgets.map(w => (
          <WidgetRenderer key={w.id} widget={w} />
        ))}
      </div>
    </div>
  );
}

function PlayerOverlay() {
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global AudioContext unlock for beeps (queue widget)
  useEffect(() => {
    const unlockCtx = () => {
      try {
        const ctx = new AudioContext();
        const buf = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.connect(ctx.destination);
        s.start(0);
        ctx.resume().catch(() => {});
      } catch {}
    };
    // Try immediately + on any interaction
    unlockCtx();
    const t = setTimeout(unlockCtx, 1500);
    const handler = () => unlockCtx();
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("pointerdown", handler, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("pointerdown", handler);
    };
  }, []);

  // Hide cursor after inactivity
  const showOverlay = useCallback(() => {
    document.body.style.cursor = "default";
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      document.body.style.cursor = "none";
    }, 3000);
  }, []);

  useEffect(() => {
    document.body.style.cursor = "none";
    window.addEventListener("mousemove", showOverlay);
    window.addEventListener("touchstart", showOverlay);
    return () => {
      document.body.style.cursor = "default";
      window.removeEventListener("mousemove", showOverlay);
      window.removeEventListener("touchstart", showOverlay);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showOverlay]);

  return null;
}

function PairingScreen({ code, deviceName }: { code: string; deviceName?: string }) {
  return (
    <div className="h-screen w-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-2">NexDisplay Player</h1>
        {deviceName && <p className="text-white/50 text-sm mb-8">{deviceName}</p>}
        <p className="text-white/60 text-lg mb-4">Nenhuma tela ou playlist atribuída</p>
        <p className="text-white/40 text-sm">Atribua uma tela ou playlist a este dispositivo no painel admin</p>
        {code && (
          <div className="mt-8">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Código de pareamento</p>
            <p className="text-5xl font-mono font-black text-blue-400 tracking-[0.3em]">{code}</p>
          </div>
        )}
      </div>
    </div>
  );
}

async function loadScreenData(screenId: string): Promise<ScreenData | null> {
  try {
    const response = await fetch(
      "https://rkvuveffxvijdarjezzy.supabase.co/functions/v1/device-pairing",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_screen", screen_id: screenId }),
      }
    );
    const data = await response.json();
    if (!response.ok || !data) return null;
    const layout = data.layout_json as any;
    return {
      width: data.width,
      height: data.height,
      backgroundColor: data.background_color || "#0a0e1a",
      widgets: (layout?.widgets ?? []) as Widget[],
    };
  } catch (err) {
    console.error("Error loading screen:", err);
    return null;
  }
}

export default function Player() {
  const { deviceToken } = useParams<{ deviceToken: string }>();
  const [device, setDevice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Support both device_token (from /player/:deviceToken) and device_id (from /player/:deviceId)
  // deviceToken param can be either a token or an ID - Player will try both

  // Audio ducking: lower video/media volume when queue calls
  useEffect(() => {
    const savedVolumes = new Map<HTMLMediaElement, number>();
    let iframesDucked = false;

    const duckIframes = (volume: number) => {
      document.querySelectorAll<HTMLIFrameElement>("iframe").forEach(iframe => {
        try {
          // YouTube IFrame API format
          iframe.contentWindow?.postMessage(JSON.stringify({
            event: "command",
            func: "setVolume",
            args: [volume],
          }), '*');
        } catch {}
      });
    };

    const handleCallStart = () => {
      document.querySelectorAll<HTMLVideoElement | HTMLAudioElement>("video, audio").forEach(el => {
        savedVolumes.set(el, el.volume);
        el.volume = 0.05;
      });
      duckIframes(5);
      iframesDucked = true;
    };

    const handleCallEnd = () => {
      savedVolumes.forEach((vol, el) => {
        el.volume = vol;
      });
      savedVolumes.clear();
      if (iframesDucked) {
        duckIframes(100);
        iframesDucked = false;
      }
    };

    window.addEventListener("queue-call-start", handleCallStart);
    window.addEventListener("queue-call-end", handleCallEnd);
    return () => {
      window.removeEventListener("queue-call-start", handleCallStart);
      window.removeEventListener("queue-call-end", handleCallEnd);
    };
  }, []);

  const [singleScreen, setSingleScreen] = useState<ScreenData | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItemData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track loaded IDs to avoid re-fetching on heartbeat-only device updates
  const loadedScreenIdRef = useRef<string | null>(null);
  const loadedPlaylistIdRef = useRef<string | null>(null);

  const loadDevice = useCallback(async () => {
    if (!deviceToken) return;

    try {
      // Try to get device by token via fetch
      const response = await fetch(
        "https://rkvuveffxvijdarjezzy.supabase.co/functions/v1/device-pairing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_device", device_token: deviceToken }),
        }
      );

      const data = await response.json();
      if (response.ok && data && !data.error) {
        setDevice(data);
        return data;
      }
    } catch (err) {
      console.warn("Device fetch error:", err);
    }

    // If not found by token, try by ID (for APK pairing)
    try {
      const { data: byId } = await supabase
        .from("devices")
        .select("*")
        .eq("id", deviceToken)
        .single();

      if (byId) {
        setDevice(byId);
        return byId;
      }
    } catch {
      // Ignore
    }

    setError("Dispositivo não encontrado");
    return null;
  }, [deviceToken]);

  const loadPlaylist = useCallback(async (playlistId: string) => {
    const { data: items } = await supabase.functions.invoke("device-pairing", {
      body: { action: "get_playlist_items", playlist_id: playlistId },
    });
    if (!items || !Array.isArray(items) || items.length === 0) {
      setPlaylistItems([]);
      return;
    }

    const mapped: PlaylistItemData[] = items
      .filter((i: any) => i.screens)
      .map((i: any) => {
        const s = i.screens;
        const layout = s.layout_json as any;
        return {
          screen: {
            width: s.width,
            height: s.height,
            backgroundColor: s.background_color || "#0a0e1a",
            widgets: (layout?.widgets ?? []) as Widget[],
          },
          duration_seconds: i.duration_seconds,
          transition: i.transition,
        };
      });
    setPlaylistItems(mapped);
    setCurrentIndex(0);
  }, []);

  // Initial load
  useEffect(() => {
    loadDevice().then(async dev => {
      if (!dev) return;
      if (dev.active_playlist_id) {
        setIsPlaylist(true);
        loadedPlaylistIdRef.current = dev.active_playlist_id;
        loadPlaylist(dev.active_playlist_id);
      } else if (dev.active_screen_id) {
        setIsPlaylist(false);
        loadedScreenIdRef.current = dev.active_screen_id;
        const s = await loadScreenData(dev.active_screen_id);
        if (s) setSingleScreen(s);
      }
    });
  }, [loadDevice, loadPlaylist]);

  // Heartbeat via edge function
  useEffect(() => {
    if (!device?.id) return;
    const ping = () => {
      supabase.functions.invoke("device-pairing", {
        body: { action: "device_heartbeat", device_id: device.id },
      });
    };
    ping();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [device?.id]);

  // Realtime: device changes (realtime still works for listening)
  useEffect(() => {
    if (!device?.id) return;
    const channel = supabase
      .channel(`player-device-${device.id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "devices",
        filter: `id=eq.${device.id}`,
      }, async (payload: any) => {
        const updated = payload.new;
        setDevice(updated);

        const newPlaylistId = updated.active_playlist_id ?? null;
        const newScreenId = updated.active_screen_id ?? null;

        // Skip heartbeat-only updates (last_seen/status changes don't affect content)
        const playlistChanged = newPlaylistId !== loadedPlaylistIdRef.current;
        const screenChanged = newScreenId !== loadedScreenIdRef.current;
        if (!playlistChanged && !screenChanged) return;

        if (newPlaylistId) {
          setIsPlaylist(true);
          setSingleScreen(null);
          loadedPlaylistIdRef.current = newPlaylistId;
          loadedScreenIdRef.current = null;
          loadPlaylist(newPlaylistId);
        } else if (newScreenId) {
          setIsPlaylist(false);
          setPlaylistItems([]);
          loadedScreenIdRef.current = newScreenId;
          loadedPlaylistIdRef.current = null;
          const s = await loadScreenData(newScreenId);
          if (s) setSingleScreen(s);
        } else {
          setIsPlaylist(false);
          setSingleScreen(null);
          setPlaylistItems([]);
          loadedScreenIdRef.current = null;
          loadedPlaylistIdRef.current = null;
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [device?.id, loadPlaylist]);

  // Realtime: screen content changes
  useEffect(() => {
    if (!device?.active_screen_id || isPlaylist) return;
    const channel = supabase
      .channel(`player-screen-${device.active_screen_id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "screens",
        filter: `id=eq.${device.active_screen_id}`,
      }, async () => {
        const s = await loadScreenData(device.active_screen_id);
        setSingleScreen(s);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [device?.active_screen_id, isPlaylist]);

  // Playlist auto-advance
  useEffect(() => {
    if (!isPlaylist || playlistItems.length === 0) return;
    const current = playlistItems[currentIndex];
    if (!current) return;

    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % playlistItems.length);
    }, current.duration_seconds * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaylist, playlistItems, currentIndex]);

  if (error) {
    return (
      <div className="h-screen w-screen bg-[#0a0e1a] flex items-center justify-center">
        <p className="text-red-400 text-xl">{error}</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="h-screen w-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPlaylist && playlistItems.length > 0) {
    const current = playlistItems[currentIndex];
    return (
      <div className="h-screen w-screen overflow-hidden bg-black player-container">
        <PlayerOverlay />
        <ScreenCanvas screen={current.screen} transition={current.transition} visible={true} />
      </div>
    );
  }

  if (singleScreen) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-black player-container">
        <PlayerOverlay />
        <ScreenCanvas screen={singleScreen} transition="none" visible={true} />
      </div>
    );
  }

  return <PairingScreen code={device.pairing_code || ""} deviceName={device.name} />;
}
