import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Download, Link2, Loader2, AlertCircle, CheckCircle2, Zap, Crown } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FREE_LIMIT = 3;

function getQuota(): { count: number; month: string } {
  const key = "tiktok-dl-quota";
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.month === month) return parsed;
    }
  } catch {}
  return { count: 0, month };
}

function incrementQuota() {
  const q = getQuota();
  q.count += 1;
  localStorage.setItem("tiktok-dl-quota", JSON.stringify(q));
  return q;
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function TikTokDownloadPage() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated } = useUserAuth();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ downloadUrl: string; title: string; thumbnail: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState(getQuota());
  const [dlProgress, setDlProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  const remaining = FREE_LIMIT - quota.count;
  const exhausted = remaining <= 0;

  const handleFetch = async () => {
    if (!url.trim()) return;
    if (exhausted) return;
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}/api/images/tiktok-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json() as { downloadUrl?: string; thumbnail?: string; title?: string; error?: string };
      if (data.downloadUrl) {
        setResult({ downloadUrl: data.downloadUrl, title: data.title ?? "TikTok", thumbnail: data.thumbnail ?? "" });
        const q = incrementQuota();
        setQuota(q);
      } else {
        setError(data.error ?? "Could not resolve this TikTok link. Make sure it's a valid TikTok URL.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    setIsDownloading(true);
    setDlProgress(0);
    try {
      const resp = await fetch(`${BASE_URL}/api/images/download-proxy?url=${encodeURIComponent(result.downloadUrl)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` },
      });
      if (!resp.ok || !resp.body) throw new Error("Download failed");
      const contentLength = Number(resp.headers.get("Content-Length") ?? "0");
      const reader = resp.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) setDlProgress(Math.round((received / contentLength) * 100));
      }
      const blob = new Blob(chunks, { type: "video/mp4" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${result.title.slice(0, 40)}.mp4`;
      a.click();
    } catch {
      setError("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
      setDlProgress(0);
    }
  };

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium mb-4">
            <Zap className="w-3 h-3" /> Watermark-free · HD quality
          </div>
          <h1 className="font-display text-4xl sm:text-6xl text-white mb-3">
            TikTok <span className="italic text-pink-400">Downloader</span>
          </h1>
          <p className="text-white/40 text-lg">
            Paste any TikTok link below and download the original video with no watermark.
          </p>
        </div>

        {/* Quota badge */}
        <div className={`flex items-center gap-3 rounded-2xl p-4 mb-8 border ${
          exhausted
            ? "bg-red-500/5 border-red-500/20"
            : remaining === 1
            ? "bg-orange-500/5 border-orange-500/20"
            : "bg-white/[0.03] border-white/10"
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            exhausted ? "bg-red-500/20" : "bg-white/5"
          }`}>
            {exhausted ? <Crown className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
          </div>
          <div className="flex-1">
            {exhausted ? (
              <>
                <p className="text-sm font-semibold text-white">Monthly limit reached</p>
                <p className="text-xs text-white/40">Upgrade to Ksh 70/month for unlimited downloads</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">{remaining} free {remaining === 1 ? "download" : "downloads"} remaining</p>
                <p className="text-xs text-white/40">Resets next month · Upgrade for unlimited</p>
              </>
            )}
          </div>
          {exhausted && (
            <Button
              size="sm"
              className="shrink-0 bg-gradient-to-r from-violet-600 to-pink-600 border-0 text-white text-xs"
              onClick={() => setLocation("/pay")}
            >
              Upgrade Ksh 70
            </Button>
          )}
        </div>

        {/* Input */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-3">TikTok Link</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                placeholder="https://www.tiktok.com/@user/video/..."
                disabled={exhausted || isLoading}
                className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <Button
              onClick={handleFetch}
              disabled={!url.trim() || exhausted || isLoading}
              className="shrink-0 bg-pink-600 hover:bg-pink-500 min-w-[100px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch Video"}
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-6"
          >
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            <div className="flex gap-4 p-4 items-center">
              {result.thumbnail && (
                <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 bg-white/5">
                  <img src={result.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm line-clamp-2 mb-1">{result.title}</p>
                <p className="text-white/30 text-xs mb-3">No watermark · HD MP4</p>
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-white text-black hover:bg-white/90 text-sm font-semibold gap-2"
                >
                  {isDownloading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {dlProgress > 0 ? `${dlProgress}%` : "Downloading…"}</>
                  ) : (
                    <><Download className="w-4 h-4" /> Download MP4</>
                  )}
                </Button>
              </div>
            </div>
            {isDownloading && dlProgress > 0 && (
              <div className="px-4 pb-4">
                <div className="h-1 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-pink-400 transition-all duration-300" style={{ width: `${dlProgress}%` }} />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tips */}
        <div className="mt-12 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <h3 className="text-sm font-semibold text-white/60 mb-3">How to get the link</h3>
          <ol className="space-y-2 text-xs text-white/35">
            <li>1. Open TikTok app and find the video you want</li>
            <li>2. Tap <strong className="text-white/50">Share</strong> → <strong className="text-white/50">Copy Link</strong></li>
            <li>3. Paste the link above and tap Fetch Video</li>
            <li>4. Download your watermark-free MP4</li>
          </ol>
        </div>
      </main>

      <Footer />
    </div>
  );
}
