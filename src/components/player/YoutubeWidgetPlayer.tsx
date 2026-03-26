import { useMemo } from "react";

interface YoutubeWidgetProps {
  props: {
    videoId?: string;
    playlist?: string;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
  };
}

export default function YoutubeWidgetPlayer({ props }: YoutubeWidgetProps) {
  const videoId = props.videoId || "";
  const playlist = props.playlist || "";
  const autoplay = props.autoplay !== false ? 1 : 0;
  const controls = props.controls !== false ? 1 : 0;
  const loop = props.loop === true ? 1 : 0;

  // Construir URL do YouTube
  const embedUrl = useMemo(() => {
    let url = "https://www.youtube.com/embed/";

    if (playlist) {
      // Se tem playlist, usa playlist mode
      url += `?listType=playlist&list=${playlist}&autoplay=${autoplay}&controls=${controls}&loop=${loop}`;
    } else if (videoId) {
      // Se tem videoId específico
      url += `${videoId}?autoplay=${autoplay}&controls=${controls}&loop=${loop}`;
    }

    return url;
  }, [videoId, playlist, autoplay, controls, loop]);

  if (!videoId && !playlist) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black rounded-lg border-2 border-dashed border-gray-600">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">▶️</div>
          <p className="text-gray-400 text-lg">Configure Video ID ou Playlist</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      width="100%"
      height="100%"
      src={embedUrl}
      title="YouTube Video"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ borderRadius: "8px" }}
    />
  );
}
