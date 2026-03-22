import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import type { Image } from "@workspace/api-client-react/src/generated/api.schemas";
import { buildProxyUrl, downloadWithProgress } from "@/lib/utils";

interface ContentViewerProps {
  items: Image[];
  startIndex: number;
  onClose: () => void;
  baseUrl: string;
  token: string | null;
}

export function ContentViewer({ items, startIndex, onClose, baseUrl, token }: ContentViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const item = items[index];
  const isVideo = item?.type === "tiktok";
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) setIndex(i => i - 1);
      if (e.key === "ArrowRight" && hasNext) setIndex(i => i + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [hasPrev, hasNext, onClose]);

  useEffect(() => {
    setPlaying(false);
    setDlProgress(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [index]);

  const handleDownload = useCallback(async () => {
    if (!item || dlProgress !== null) return;
    const videoSrc = item.downloadUrl;
    const ext = isVideo ? "mp4" : "jpg";
    const safe = (item.title ?? item.id ?? "file").replace(/[^a-z0-9]/gi, "-").slice(0, 50);
    const name = `${safe}.${ext}`;

    try {
      if (isVideo && videoSrc) {
        const dlUrl = `${baseUrl}/api/proxy?url=${encodeURIComponent(videoSrc)}`;
        const resp = await fetch(dlUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!resp.ok || !resp.body) throw new Error("fetch failed");
        const len = Number(resp.headers.get("Content-Length") ?? "0");
        const reader = resp.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        setDlProgress(0);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); received += value.length;
          if (len > 0) setDlProgress(Math.round((received / len) * 100));
        }
        const blob = new Blob(chunks, { type: "video/mp4" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      } else {
        setDlProgress(0);
        await downloadWithProgress(
          buildProxyUrl(item.url, name, baseUrl),
          name,
          (p) => setDlProgress(p)
        );
      }
    } catch {
    } finally {
      setDlProgress(null);
    }
  }, [item, isVideo, baseUrl, token, dlProgress]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !muted;
    setMuted(m => !m);
  }, [muted]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && hasNext) setIndex(i => i + 1);
      if (dx > 0 && hasPrev) setIndex(i => i - 1);
    }
    touchStartX.current = null;
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black flex flex-col select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pt-10 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <span className="text-white/50 text-sm font-medium">{index + 1} / {items.length}</span>
          <button
            onClick={handleDownload}
            disabled={dlProgress !== null}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform"
          >
            {dlProgress !== null
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Download className="w-4 h-4 text-white" />}
          </button>
        </div>

        {/* Main content */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden"
          onClick={isVideo ? togglePlay : undefined}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={item.downloadUrl ?? item.url}
              poster={item.thumbnail ?? item.url}
              className="max-w-full max-h-full object-contain"
              playsInline
              muted={muted}
              onEnded={() => setPlaying(false)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          ) : (
            <img
              src={item.url}
              alt={item.title ?? ""}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          )}

          {/* Video play overlay */}
          {isVideo && !playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <Play className="w-9 h-9 text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom info + controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-10 pt-20 flex items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            {item.title && (
              <p className="text-white font-semibold text-base leading-tight line-clamp-2 mb-0.5">{item.title}</p>
            )}
            {item.category && (
              <p className="text-white/40 text-xs uppercase tracking-wide">{item.category}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isVideo && (
              <button
                onClick={toggleMute}
                className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                {muted
                  ? <VolumeX className="w-4 h-4 text-white" />
                  : <Volume2 className="w-4 h-4 text-white" />}
              </button>
            )}
          </div>
        </div>

        {/* Prev arrow */}
        {hasPrev && (
          <button
            onClick={() => setIndex(i => i - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Next arrow */}
        {hasNext && (
          <button
            onClick={() => setIndex(i => i + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Download progress bar */}
        {dlProgress !== null && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-zinc-900/95 border border-white/10 rounded-2xl px-5 py-2.5 flex items-center gap-3 shadow-xl">
            <div className="w-28 h-1.5 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-200"
                style={{ width: `${dlProgress}%` }}
              />
            </div>
            <span className="text-xs text-white/60">{dlProgress}%</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
