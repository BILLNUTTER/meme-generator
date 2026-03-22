import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ImageIcon, Music, Download, Laugh, Wand2, ChevronLeft, ChevronRight,
  Link2, Loader2, AlertCircle, Zap, Sparkles, Crown, LogOut, MessageCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContentViewer } from "@/components/ContentViewer";
import { AppInstallPrompt } from "@/components/AppInstallPrompt";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useGetDashboardImages } from "@workspace/api-client-react";
import type { Image } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FREE_LIMIT = 3;
function getQuota() {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  try {
    const raw = localStorage.getItem("tiktok-dl-quota");
    if (raw) { const p = JSON.parse(raw); if (p.month === month) return p; }
  } catch {}
  return { count: 0, month };
}
function incrementQuota() {
  const q = getQuota(); q.count += 1;
  localStorage.setItem("tiktok-dl-quota", JSON.stringify(q));
  return q;
}

const SERVICES = [
  { id: "wallpapers",      label: "Wallpapers",      desc: "Browse aesthetic collections",  icon: ImageIcon, color: "from-blue-600/30 to-cyan-600/20",     border: "border-blue-500/20",   accent: "text-blue-400",   href: "/wallpapers"      },
  { id: "tiktoks",         label: "TikTok Gallery",  desc: "Watch curated videos",          icon: Music,     color: "from-pink-600/30 to-rose-600/20",      border: "border-pink-500/20",   accent: "text-pink-400",   href: "/tiktoks"         },
  { id: "tiktok-download", label: "TikTok Download", desc: "No watermark · HD quality",     icon: Download,  color: "from-violet-600/30 to-purple-600/20",  border: "border-violet-500/20", accent: "text-violet-400", href: "/tiktok-download" },
  { id: "memes",           label: "Meme Gallery",    desc: "Browse fresh memes daily",      icon: Laugh,     color: "from-yellow-600/30 to-amber-600/20",   border: "border-yellow-500/20", accent: "text-yellow-400", href: "/memes"           },
  { id: "meme-maker",      label: "Meme Maker",      desc: "Create your own — always free", icon: Wand2,     color: "from-green-600/30 to-emerald-600/20",  border: "border-green-500/20",  accent: "text-green-400",  href: "/meme-maker"      },
];

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated, user, logout } = useUserAuth();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [viewerItems, setViewerItems] = useState<Image[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const [tkUrl, setTkUrl] = useState("");
  const [tkLoading, setTkLoading] = useState(false);
  const [tkResult, setTkResult] = useState<{ downloadUrl: string; title: string; thumbnail: string } | null>(null);
  const [tkError, setTkError] = useState<string | null>(null);
  const [quota, setQuota] = useState(getQuota());
  const [dlProgress, setDlProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  const token = localStorage.getItem("userToken");

  const { data } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: {
      enabled: isAuthenticated && !!token,
      staleTime: 5 * 60 * 1000,
    },
  });

  const allImages = data ?? [];
  // Latest 4 picks — API returns newest first
  const picks = allImages.slice(0, 4);

  const remaining = FREE_LIMIT - quota.count;
  const exhausted = remaining <= 0;

  const scrollTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(SERVICES.length - 1, idx));
    const el = sliderRef.current;
    if (!el) return;
    const card = el.children[clamped] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveSlide(clamped);
  };

  const handleTkFetch = async () => {
    if (!tkUrl.trim() || exhausted) return;
    setTkError(null); setTkResult(null); setTkLoading(true);
    try {
      const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: tkUrl }),
      });
      const d = await resp.json() as { downloadUrl?: string; thumbnail?: string; title?: string; error?: string };
      if (d.downloadUrl) {
        setTkResult({ downloadUrl: d.downloadUrl, title: d.title ?? "TikTok", thumbnail: d.thumbnail ?? "" });
        setQuota(incrementQuota());
      } else {
        setTkError(d.error ?? "Could not fetch this TikTok. Please check the link.");
      }
    } catch { setTkError("Network error. Please try again."); }
    finally { setTkLoading(false); }
  };

  const handleTkDownload = async () => {
    if (!tkResult) return;
    setIsDownloading(true); setDlProgress(0);
    try {
      const resp = await fetch(`${baseUrl}/api/images/download-proxy?url=${encodeURIComponent(tkResult.downloadUrl)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok || !resp.body) throw new Error();
      const len = Number(resp.headers.get("Content-Length") ?? "0");
      const reader = resp.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); received += value.length;
        if (len > 0) setDlProgress(Math.round((received / len) * 100));
      }
      const blob = new Blob(chunks, { type: "video/mp4" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `${tkResult.title.slice(0, 40)}.mp4`; a.click();
    } catch { setTkError("Download failed. Try again."); }
    finally { setIsDownloading(false); setDlProgress(0); }
  };

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      <AppInstallPrompt />

      {viewerIndex !== null && viewerItems.length > 0 && (
        <ContentViewer
          items={viewerItems}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          baseUrl={baseUrl}
          token={token}
        />
      )}

      {isDownloading && dlProgress > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl min-w-[220px]">
          <div className="w-32 h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-pink-400 transition-all duration-300" style={{ width: `${dlProgress}%` }} />
          </div>
          <span className="text-xs text-white/60">{dlProgress}%</span>
        </div>
      )}

      <main className="flex-1">
        {/* ── Welcome bar ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 flex items-center justify-between">
          <div>
            <p className="text-white/30 text-sm">Welcome back</p>
            <h1 className="font-display text-3xl text-white">{user?.name ?? "Member"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-green-500/70 hover:text-green-400 transition-colors px-3 py-2 rounded-xl border border-white/5 bg-white/[0.02]">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <button onClick={() => { logout(); setLocation("/"); }}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-2 rounded-xl border border-white/5">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>

        {/* ── SLIDABLE HERO ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Services</p>
            <div className="flex items-center gap-2">
              <button onClick={() => scrollTo(activeSlide - 1)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-1">
                {SERVICES.map((_, i) => (
                  <button key={i} onClick={() => scrollTo(i)}
                    className={cn("h-1.5 rounded-full transition-all duration-300", activeSlide === i ? "bg-white w-4" : "bg-white/20 w-1.5")} />
                ))}
              </div>
              <button onClick={() => scrollTo(activeSlide + 1)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div ref={sliderRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2" style={{ scrollbarWidth: "none" }}>
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <motion.button key={svc.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setLocation(svc.href)}
                  className={cn("snap-start shrink-0 w-[220px] sm:w-[260px] rounded-2xl border p-6 text-left relative overflow-hidden",
                    `bg-gradient-to-br ${svc.color}`, svc.border)}>
                  <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{ backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 60%)" }} />
                  <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center mb-4 bg-white/5", svc.border)}>
                    <Icon className={cn("w-5 h-5", svc.accent)} />
                  </div>
                  <p className="font-display text-lg text-white mb-1">{svc.label}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{svc.desc}</p>
                  <div className={cn("mt-4 text-xs font-semibold", svc.accent)}>Open →</div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── TODAY'S PICKS ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-white">Today's Picks</h2>
            <button onClick={() => setLocation("/wallpapers")} className="text-xs text-white/40 hover:text-white transition-colors">View all →</button>
          </div>
          {picks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {picks.map((img, i) => {
                const typeLabel = img.type === "meme" ? "Meme" : img.type === "tiktok" ? "TikTok" : "Wallpaper";
                const typeBadgeColor = img.type === "meme" ? "text-yellow-300" : img.type === "tiktok" ? "text-pink-300" : "text-blue-300";
                return (
                  <motion.div key={img.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl overflow-hidden relative group cursor-pointer aspect-square bg-white/5 active:scale-95 transition-transform"
                    onClick={() => { setViewerItems(picks); setViewerIndex(i); }}>
                    <img src={img.thumbnail ?? img.url} alt={img.title ?? typeLabel} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <p className="text-white font-medium text-xs truncate">{img.title ?? img.category}</p>
                    </div>
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-xs font-medium ${typeBadgeColor}`}>{typeLabel}</div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/20 text-sm glass-card rounded-2xl">
              Content is being added — check back soon!
            </div>
          )}
        </div>

        {/* ── TIKTOK DOWNLOADER ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
          <div className="rounded-3xl border border-pink-500/10 bg-gradient-to-br from-pink-600/5 to-violet-600/5 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium mb-3">
                  <Zap className="w-3 h-3" /> Watermark-free
                </div>
                <h2 className="font-display text-3xl sm:text-4xl text-white mb-1">TikTok Downloader</h2>
                <p className="text-white/40">Paste any TikTok link and download the original HD video — no watermark.</p>
              </div>
              <button onClick={() => setLocation("/tiktok-download")}
                className="shrink-0 text-xs text-pink-400 hover:text-pink-300 transition-colors border border-pink-500/20 px-4 py-2 rounded-xl">
                Full page →
              </button>
            </div>

            {exhausted ? (
              <div className="flex items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
                <Crown className="w-5 h-5 text-red-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Monthly limit reached — 3/3 used</p>
                  <p className="text-xs text-white/40">Upgrade for unlimited downloads · Resets next month</p>
                </div>
                <Button size="sm" className="shrink-0 bg-gradient-to-r from-violet-600 to-pink-600 border-0 text-xs" onClick={() => setLocation("/pay")}>
                  Upgrade Ksh 70
                </Button>
              </div>
            ) : (
              <p className="text-xs text-white/30 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                {remaining} free {remaining === 1 ? "download" : "downloads"} left this month
              </p>
            )}

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input value={tkUrl} onChange={e => { setTkUrl(e.target.value); setTkError(null); setTkResult(null); }}
                  onKeyDown={e => e.key === "Enter" && handleTkFetch()}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  disabled={exhausted || tkLoading}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12" />
              </div>
              <Button onClick={handleTkFetch} disabled={!tkUrl.trim() || exhausted || tkLoading}
                className="shrink-0 bg-pink-600 hover:bg-pink-500 h-12 px-6">
                {tkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>

            {tkError && (
              <div className="flex items-center gap-2 text-red-300 text-sm bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {tkError}
              </div>
            )}

            {tkResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
                {tkResult.thumbnail && (
                  <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-white/5">
                    <img src={tkResult.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium line-clamp-1 mb-1">{tkResult.title}</p>
                  <p className="text-white/30 text-xs mb-3">HD · No watermark</p>
                  <Button onClick={handleTkDownload} disabled={isDownloading} size="sm"
                    className="bg-white text-black hover:bg-white/90 font-semibold gap-2">
                    {isDownloading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {dlProgress > 0 ? `${dlProgress}%` : "…"}</> : <><Download className="w-3.5 h-3.5" /> Download MP4</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── MEME MAKER ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="rounded-3xl border border-yellow-500/10 bg-gradient-to-br from-yellow-600/5 to-green-600/5 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium mb-3">
                  <Sparkles className="w-3 h-3" /> Always free · No limits
                </div>
                <h2 className="font-display text-3xl sm:text-4xl text-white mb-2">Meme Maker</h2>
                <p className="text-white/40 max-w-lg">
                  Create custom memes with your text in seconds. Classic black background, white Impact font, 1080×1080. Download instantly — completely free, forever.
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setLocation("/meme-maker")}
                className="shrink-0 flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm px-6 py-3 rounded-2xl transition-colors">
                <Wand2 className="w-4 h-4" /> Create Meme
              </motion.button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
