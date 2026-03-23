import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { DownloadProgressBar, type DownloadItem } from "@/components/DownloadProgressBar";
import { downloadWithProgress, buildProxyUrl } from "@/lib/utils";
import { ArrowLeft, Download, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TikTokData {
  tiktokUrl: string;
  thumbnailUrl: string;
  title: string;
  id: string;
}

export default function TikTokView() {
  const [, setLocation] = useLocation();
  const [data, setData]           = useState<TikTokData | null>(null);
  const [videoUrl, setVideoUrl]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Load data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("tiktok-player");
    if (!raw) { setLocation("/dashboard"); return; }
    try {
      const parsed = JSON.parse(raw) as TikTokData;
      setData(parsed);
    } catch {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  // Fetch video URL once data is loaded
  useEffect(() => {
    if (!data?.tiktokUrl) return;
    setIsLoading(true);
    setError(null);

    fetch(`${BASE_URL}/api/images/tiktok-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: data.tiktokUrl }),
    })
      .then(r => r.json())
      .then((res: { downloadUrl?: string; error?: string }) => {
        if (res.downloadUrl) {
          setVideoUrl(res.downloadUrl);
        } else {
          setError(res.error || "Could not load this video.");
        }
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setIsLoading(false));
  }, [data, BASE_URL]);

  const startDownload = (rawUrl: string, filename: string) => {
    const id = `dl-${Date.now()}`;
    const proxyUrl = buildProxyUrl(rawUrl, filename, BASE_URL);
    setDownloads(prev => [...prev, { id, filename, progress: 0, done: false }]);
    downloadWithProgress(proxyUrl, filename, (p) =>
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: p === -1 ? -1 : Math.min(p, 99) } : d))
    )
      .then(() => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: 100, done: true } : d));
        setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== id)), 4000);
      })
      .catch(() => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, error: true, done: true } : d));
        setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== id)), 4000);
      });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />

      {/* Full-page content below header */}
      <div className="flex-1 flex flex-col md:flex-row pt-20">

        {/* Left: Video player */}
        <div className="flex-1 flex items-center justify-center bg-black min-h-[60vh] md:min-h-0 relative">

          {/* Back button — top left */}
          <button
            onClick={() => setLocation("/dashboard")}
            className="absolute top-4 left-4 z-20 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Blurred thumbnail background */}
          {data?.thumbnailUrl && (
            <img
              src={data.thumbnailUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-15 blur-2xl scale-110 pointer-events-none"
            />
          )}

          <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                {data?.thumbnailUrl && (
                  <img
                    src={data.thumbnailUrl}
                    alt={data.title}
                    className="w-48 md:w-64 aspect-[9/16] object-cover rounded-2xl opacity-60"
                  />
                )}
                <div className="flex items-center gap-3 text-white/70">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading video…</span>
                </div>
              </motion.div>
            )}

            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-5 text-center max-w-xs"
              >
                <AlertCircle className="w-10 h-10 text-red-400/70" />
                <p className="text-white/60 text-sm">{error}</p>
                {data?.tiktokUrl && (
                  <a
                    href={data.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    Open on TikTok <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            )}

            {videoUrl && !isLoading && (
              <motion.video
                ref={videoRef}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                poster={data?.thumbnailUrl}
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl"
                style={{ aspectRatio: "9/16", objectFit: "contain" }}
              />
            )}
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-white/5 bg-zinc-950 flex flex-col p-6 gap-6">

          <div className="mt-2 md:mt-10">
            <span className="inline-flex items-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /> TikTok
            </span>
            <h1 className="font-display text-2xl text-white leading-snug">
              {data?.title || "TikTok Video"}
            </h1>
          </div>

          <div className="space-y-3">
            {/* Download no-watermark */}
            <Button
              className="w-full gap-2 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-400 hover:to-blue-400 text-white font-semibold py-5 text-sm rounded-xl shadow-lg shadow-orange-500/20"
              disabled={!videoUrl || isLoading}
              onClick={() => {
                if (videoUrl && data) {
                  const fname = `${(data.title || "tiktok").replace(/[^a-z0-9]/gi, "_")}.mp4`;
                  startDownload(videoUrl, fname);
                }
              }}
            >
              <Download className="w-4 h-4" />
              Download No-Watermark
            </Button>

            {/* View on TikTok fallback */}
            {data?.tiktokUrl && (
              <a
                href={data.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on TikTok
              </a>
            )}
          </div>

          <div className="mt-auto">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to gallery
            </button>
          </div>
        </div>
      </div>

      <DownloadProgressBar downloads={downloads} onDismiss={id => setDownloads(prev => prev.filter(d => d.id !== id))} />
    </div>
  );
}
