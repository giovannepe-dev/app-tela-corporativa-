import { useRef, useState, useEffect } from "react";
import { Widget } from "@/types/screen-editor";
import {
  ClockWidgetPreview, TextWidgetPreview, TickerWidgetPreview,
  ShapeWidgetPreview, QRCodeWidgetPreview, ImageWidgetPreview, QueueWidgetPreview, WebpageWidgetPreview, WeatherWidgetPreview, RSSWidgetPreview
} from "./WidgetPreviews";
import { cn } from "@/lib/utils";

interface CanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  widgets: Widget[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateWidget: (id: string, updates: Partial<Widget>) => void;
  zoom: number;
}

export default function EditorCanvas({
  width, height, backgroundColor, widgets, selectedId, onSelect, onUpdateWidget, zoom
}: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number; panning?: boolean; origScrollX?: number; origScrollY?: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; origW: number; origH: number; origX: number; origY: number; handle: string } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, widget: Widget) => {
    e.stopPropagation();
    onSelect(widget.id);
    if (widget.locked) return;
    onSelect(widget.id);

    // Shift+drag on webpage widget = pan content
    if (widget.type === "webpage" && e.shiftKey) {
      setDragging({
        id: widget.id, startX: e.clientX, startY: e.clientY,
        origX: widget.x, origY: widget.y,
        panning: true,
        origScrollX: widget.props.scrollX ?? 0,
        origScrollY: widget.props.scrollY ?? 0,
      });
    } else {
      setDragging({ id: widget.id, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, widget: Widget, handle: string) => {
    if (widget.locked) return;
    e.stopPropagation();
    setResizing({ id: widget.id, startX: e.clientX, startY: e.clientY, origW: widget.width, origH: widget.height, origX: widget.x, origY: widget.y, handle });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / zoom;
        const dy = (e.clientY - dragging.startY) / zoom;
        if (dragging.panning) {
          // Pan webpage content
          const w = widgets.find(w => w.id === dragging.id);
          if (w) {
            onUpdateWidget(dragging.id, {
              props: {
                ...w.props,
                scrollX: Math.round((dragging.origScrollX ?? 0) + dx),
                scrollY: Math.round((dragging.origScrollY ?? 0) + dy),
              }
            });
          }
        } else {
          onUpdateWidget(dragging.id, { x: Math.round(dragging.origX + dx), y: Math.round(dragging.origY + dy) });
        }
      }
      if (resizing) {
        const dx = (e.clientX - resizing.startX) / zoom;
        const dy = (e.clientY - resizing.startY) / zoom;
        const h = resizing.handle;
        let newW = resizing.origW;
        let newH = resizing.origH;
        let newX = resizing.origX;
        let newY = resizing.origY;

        if (h.includes("e")) newW = Math.max(40, resizing.origW + dx);
        if (h.includes("w")) { newW = Math.max(40, resizing.origW - dx); newX = resizing.origX + dx; }
        if (h.includes("s")) newH = Math.max(30, resizing.origH + dy);
        if (h.includes("n")) { newH = Math.max(30, resizing.origH - dy); newY = resizing.origY + dy; }

        onUpdateWidget(resizing.id, { width: Math.round(newW), height: Math.round(newH), x: Math.round(newX), y: Math.round(newY) });
      }
    };
    const handleMouseUp = () => { setDragging(null); setResizing(null); };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragging, resizing, zoom, onUpdateWidget, widgets]);

  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case "text": return <TextWidgetPreview props={widget.props} />;
      case "clock": return <ClockWidgetPreview props={widget.props} />;
      case "ticker": return <TickerWidgetPreview props={widget.props} />;
      case "shape": return <ShapeWidgetPreview style={widget.style} />;
      case "qrcode": return <QRCodeWidgetPreview props={widget.props} />;
      case "image": return <ImageWidgetPreview props={widget.props} />;
      case "queue_widget": return <QueueWidgetPreview />;
      case "webpage": return <WebpageWidgetPreview props={widget.props} />;
      case "weather": return <WeatherWidgetPreview props={widget.props} />;
      case "rss": return <RSSWidgetPreview props={widget.props} />;
      default: return <div className="h-full w-full bg-white/10 flex items-center justify-center text-white/40 text-xs">{widget.type}</div>;
    }
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.zIndex - b.zIndex);
  const resizeHandles = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];

  return (
    <div className="flex-1 overflow-auto flex items-center justify-center bg-[#1a1a2e] p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onSelect(null); }}>
      <div
        ref={canvasRef}
        className="relative shadow-2xl ring-1 ring-white/10"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onSelect(null); }}
        style={{
          width: width * zoom,
          height: height * zoom,
          backgroundColor,
          transform: `scale(1)`,
          transformOrigin: "center center",
        }}
      >
        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        }} />

        {sortedWidgets.filter(w => w.visible).map(widget => {
          const isSelected = widget.id === selectedId;
          return (
            <div
              key={widget.id}
              className={cn(
                "absolute cursor-move group",
                isSelected && "ring-2 ring-blue-500",
                widget.locked && "cursor-not-allowed opacity-80"
              )}
              style={{
                left: widget.x * zoom,
                top: widget.y * zoom,
                width: widget.width * zoom,
                height: widget.height * zoom,
                zIndex: widget.zIndex,
                opacity: widget.style.opacity ?? 1,
                borderRadius: (widget.style.borderRadius ?? 0) * zoom,
                transform: widget.rotation ? `rotate(${widget.rotation}deg)` : undefined,
                overflow: "hidden",
              }}
              onMouseDown={e => handleMouseDown(e, widget)}
            >
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: widget.width, height: widget.height }}>
                {renderWidget(widget)}
              </div>

              {isSelected && !widget.locked && resizeHandles.map(handle => (
                <div
                  key={handle}
                  className="absolute w-2.5 h-2.5 bg-blue-500 border border-white rounded-sm z-50"
                  style={{
                    cursor: `${handle}-resize`,
                    ...(handle.includes("n") ? { top: -5 } : {}),
                    ...(handle.includes("s") ? { bottom: -5 } : {}),
                    ...(handle.includes("w") ? { left: -5 } : {}),
                    ...(handle.includes("e") ? { right: -5 } : {}),
                    ...(handle === "n" || handle === "s" ? { left: "50%", marginLeft: -5 } : {}),
                    ...(handle === "w" || handle === "e" ? { top: "50%", marginTop: -5 } : {}),
                  }}
                  onMouseDown={e => handleResizeStart(e, widget, handle)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
