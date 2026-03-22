import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Loader2, ExternalLink } from "lucide-react";

interface Props {
  isOpen: boolean;
  tiktokUrl: string;
  thumbnailUrl: string;
  title: string;
  onClose: () => void;
  onDownload: (videoUrl: string, title: string) => void;
}

export function TikTokPlayer({ isOpen, tiktokUrl, thumbnailUrl, title, onClose, onDownload }: Props) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setIsLoading(true);
      setError(null);
      setVideoUrl(null);

      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tiktokUrl }),
      })
        .then((r) => r.json())
        .then((data: { downloadUrl?: string; error?: string }) => {
          if (data.downloadUrl) {
            setVideoUrl(data.downloadUrl);
          } else {
            setError(data.error || "Could not load video.");
          }
        })
        .catch(() => setError("Network error loading video."))
        .finally(() => setIsLoading(false));
    }
    if (!isOpen) {
      videoRef.current?.pause();
    }
    prevOpen.current = isOpen;
  }, [isOpen, tiktokUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="relative w-full max-w-[340px] mx-4"
            style={{ aspectRatio: "9/16" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full h-full rounded-3xl overflow-hidden bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-white/8">

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Thumbnail blur bg (always visible behind video) */}
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30 blur-lg scale-110 pointer-events-none"
                />
              )}

              {/* Loading */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
                  {thumbnailUrl && (
                    <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-3 bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5">
                    <Loader2 className="w-9 h-9 text-white animate-spin" />
                    <p className="text-white/80 text-sm font-medium">Loading video…</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
                  {thumbnailUrl && (
                    <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-25" />
                  )}
                  <div className="relative z-10 text-center bg-black/50 backdrop-blur-sm rounded-2xl px-6 py-6">
                    <p className="text-white/80 text-sm mb-4">{error}</p>
                    <a
                      href={tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-pink-400 text-sm hover:text-pink-300 transition-colors"
                    >
                      Open on TikTok <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Video */}
              {videoUrl && !isLoading && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain z-10"
                  poster={thumbnailUrl}
                />
              )}

              {/* Bottom overlay: title + download */}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <p className="text-white/90 text-sm font-medium line-clamp-2 mb-3 drop-shadow-lg">
                  {title || "TikTok"}
                </p>
                <button
                  onClick={() => videoUrl && onDownload(videoUrl, title)}
                  disabled={!videoUrl || isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-pink-500/30"
                >
                  <Download className="w-4 h-4" />
                  Download No-Watermark
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
