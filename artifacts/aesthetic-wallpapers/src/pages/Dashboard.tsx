import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDashboardImages } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lightbox } from "@/components/Lightbox";
import { DownloadProgressBar, type DownloadItem } from "@/components/DownloadProgressBar";
import { useUserAuth } from "@/hooks/use-user-auth";
import { cn, downloadWithProgress, buildProxyUrl } from "@/lib/utils";
import { LogOut, Download, MessageCircle, Image as ImageIcon, Laugh, Music, Play, Link2, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes"];

const TYPE_TABS = [
  { id: "all",       label: "All",        icon: ImageIcon },
  { id: "wallpaper", label: "Wallpapers", icon: ImageIcon },
  { id: "meme",      label: "Memes",      icon: Laugh },
  { id: "tiktok",    label: "TikToks",    icon: Music },
  { id: "download",  label: "TikTok Link", icon: Link2 },
] as const;

type TabId = (typeof TYPE_TABS)[number]["id"];

// ── TikTok quota helpers (localStorage, resets monthly) ──────────────
const FREE_LIMIT = 3;
const QUOTA_KEY  = "tiktok-dl-quota";

function getQuota(): { count: number; month: string } {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return { count: 0, month: "" };
    return JSON.parse(raw) as { count: number; month: string };
  } catch { return { count: 0, month: "" }; }
}

function getRemainingFree(): number {
  const month  = new Date().toISOString().slice(0, 7);
  const stored = getQuota();
  if (stored.month !== month) return FREE_LIMIT;
  return Math.max(0, FREE_LIMIT - stored.count);
}

function incrementQuota(): void {
  const month  = new Date().toISOString().slice(0, 7);
  const stored = getQuota();
  const count  = stored.month === month ? stored.count + 1 : 1;
  localStorage.setItem(QUOTA_KEY, JSON.stringify({ count, month }));
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, token, isReady, isAuthenticated, logout } = useUserAuth();

  const [activeType, setActiveType]         = useState<TabId>("all");
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxState, setLightboxState]   = useState({ isOpen: false, index: 0 });
  const [downloads, setDownloads]           = useState<DownloadItem[]>([]);

  // TikTok link downloader state
  const [tikUrl, setTikUrl]         = useState("");
  const [tikLoading, setTikLoading] = useState(false);
  const [tikError, setTikError]     = useState<string | null>(null);
  const [tikDone, setTikDone]       = useState(false);
  const [remaining, setRemaining]   = useState(() => getRemainingFree());

  const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

  const queryParams: Record<string, string> = {};
  if (activeType !== "all") queryParams.type = activeType;
  if (activeCategory !== "All") queryParams.category = activeCategory;

  const { data: images = [], isLoading, error } = useGetDashboardImages(
    Object.keys(queryParams).length ? queryParams : undefined,
    { request: { headers: { Authorization: `Bearer ${token}` } }, query: { enabled: !!token && isAuthenticated } }
  );

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  if (!isReady || !isAuthenticated) return null;

  const tiktokImages  = images.filter(img => img.type === "tiktok");
  const galleryImages = images.filter(img => img.type !== "tiktok");

  const openLightbox     = (index: number) => setLightboxState({ isOpen: true, index });
  const closeLightbox    = () => setLightboxState(prev => ({ ...prev, isOpen: false }));
  const navigateLightbox = (index: number) => setLightboxState(prev => ({ ...prev, index }));

  const startDownload = (rawUrl: string, filename: string) => {
    const id = `dl-${Date.now()}-${Math.random()}`;
    const proxyUrl = buildProxyUrl(rawUrl, filename, BASE_URL);

    setDownloads(prev => [...prev, { id, filename, progress: 0, done: false }]);

    downloadWithProgress(proxyUrl, filename, (progress) => {
      setDownloads(prev =>
        prev.map(d => d.id === id ? { ...d, progress: progress === -1 ? -1 : Math.min(progress, 99) } : d)
      );
    })
      .then(() => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: 100, done: true } : d));
        setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== id)), 4000);
      })
      .catch(() => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, error: true, done: true } : d));
        setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== id)), 4000);
      });
  };

  const openTikTok = (img: { tiktokUrl?: string | null; url: string; title?: string | null; id: string }) => {
    if (!img.tiktokUrl) return;
    sessionStorage.setItem("tiktok-player", JSON.stringify({
      tiktokUrl: img.tiktokUrl,
      thumbnailUrl: img.url,
      title: img.title || "TikTok",
      id: img.id,
    }));
    setLocation("/tiktok");
  };

  const dismissDownload = (id: string) => setDownloads(prev => prev.filter(d => d.id !== id));

  const handleTikDownload = async () => {
    if (!tikUrl.trim()) return;
    setTikLoading(true);
    setTikError(null);
    setTikDone(false);
    try {
      const res = await fetch(`${BASE_URL}/api/images/tiktok-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tikUrl.trim() }),
      });
      const data = await res.json() as { downloadUrl?: string; title?: string; error?: string };
      if (!data.downloadUrl) throw new Error(data.error || "Could not fetch video.");

      const filename = (data.title || "tiktok-video").replace(/[^a-z0-9\-_ ]/gi, "_").slice(0, 60) + ".mp4";
      const proxyUrl = buildProxyUrl(data.downloadUrl, filename, BASE_URL);
      const id = `dl-tik-${Date.now()}`;
      setDownloads(prev => [...prev, { id, filename, progress: 0, done: false }]);
      incrementQuota();
      const newRemaining = getRemainingFree();
      setRemaining(newRemaining);
      await downloadWithProgress(proxyUrl, filename, (progress) => {
        setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: progress === -1 ? -1 : Math.min(progress, 99) } : d));
      });
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: 100, done: true } : d));
      setTimeout(() => setDownloads(prev => prev.filter(d => d.id !== id)), 4000);
      setTikDone(true);
      setTikUrl("");
    } catch (e) {
      setTikError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setTikLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      {/* Top bar */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display text-xl border border-primary/20">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-xl font-display">Welcome, {user?.name || "User"}</h2>
              <p className="text-sm text-muted-foreground">Unlimited downloads unlocked</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline" size="sm"
              onClick={() => window.open("https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d", "_blank")}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Follow us
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/"); }} className="text-white/60 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* Type Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {TYPE_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveType(tab.id); setActiveCategory("All"); setTikError(null); setTikDone(false); }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeType === tab.id
                    ? tab.id === "download"
                      ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                      : "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.id === "download" && (
                  <span className="ml-1 text-[10px] bg-pink-500/30 text-pink-300 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Category filter — only for wallpapers/all */}
        {(activeType === "all" || activeType === "wallpaper") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                  activeCategory === cat
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/5"
                )}
              >
                {cat}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── TikTok Link Downloader ─────────────────────────────── */}
        {activeType === "download" && (
          <motion.div
            key="downloader"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto"
          >
            {/* Header card */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 mb-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center mx-auto mb-5">
                <Link2 className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-display text-2xl mb-2">TikTok No-Watermark Download</h2>
              <p className="text-white/50 text-sm leading-relaxed mb-5">
                Paste any TikTok link below and download the clean video — no watermark, no logo.
              </p>

              {/* Quota badge */}
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-1",
                remaining > 0
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              )}>
                <Sparkles className="w-3.5 h-3.5" />
                {remaining > 0
                  ? `${remaining} free download${remaining !== 1 ? "s" : ""} remaining this month`
                  : "Free quota used — upgrade for more"}
              </div>
              <p className="text-white/30 text-xs mt-1.5">Resets on the 1st of each month</p>
            </div>

            {/* Upgrade banner when quota is 0 */}
            {remaining === 0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 mb-6 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 font-semibold text-sm mb-1">Monthly free quota reached</p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    Upgrade for unlimited no-watermark TikTok downloads for just <span className="text-white font-semibold">Ksh 70/month</span>.
                    Contact us on WhatsApp to activate your plan.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 text-xs"
                    onClick={() => window.open("https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d", "_blank")}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Upgrade via WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* Input + button */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">TikTok URL</label>
                <input
                  type="url"
                  value={tikUrl}
                  onChange={e => { setTikUrl(e.target.value); setTikError(null); setTikDone(false); }}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  disabled={tikLoading || remaining === 0}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition disabled:opacity-40"
                />
              </div>

              {tikError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {tikError}
                </div>
              )}

              {tikDone && (
                <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Download started — check your downloads folder!
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!tikUrl.trim() || tikLoading || remaining === 0}
                onClick={handleTikDownload}
              >
                {tikLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fetching video…</>
                  : <><Download className="w-4 h-4 mr-2" /> Download Without Watermark</>
                }
              </Button>

              <p className="text-center text-white/25 text-xs">
                Works with any public TikTok video link · HD quality
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Gallery (hidden when TikTok downloader is active) ─── */}
        {activeType !== "download" && (isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive/80 glass-card rounded-2xl">
            <p>Failed to load content. Please try again later.</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-32 border border-white/5 rounded-3xl bg-white/[0.02]">
            <p className="font-display text-2xl text-white/40 italic">Nothing here yet.</p>
          </div>
        ) : (
          <>
            {/* TikTok Grid */}
            {tiktokImages.length > 0 && (
              <section className="mb-14">
                {activeType === "all" && (
                  <h2 className="font-display text-xl text-white/70 mb-6 flex items-center gap-2">
                    <Music className="w-5 h-5 text-pink-400" /> TikTok Videos
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {tiktokImages.map((img, idx) => (
                      <motion.div
                        key={img.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
                        className="relative group rounded-2xl overflow-hidden aspect-[9/16] bg-white/5 cursor-pointer"
                        onClick={() => openTikTok(img)}
                      >
                        <img
                          src={img.url}
                          alt={img.title || "TikTok"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                        {/* Play icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                          </div>
                        </div>

                        {/* Title + tap hint */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs font-medium line-clamp-2 mb-1.5">
                            {img.title || "TikTok"}
                          </p>
                          <p className="text-white/40 text-[10px]">Tap to watch &amp; download</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Masonry Grid (wallpapers + memes) */}
            {galleryImages.length > 0 && (
              <section>
                {activeType === "all" && tiktokImages.length > 0 && (
                  <h2 className="font-display text-xl text-white/70 mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-400" /> Wallpapers &amp; Memes
                  </h2>
                )}
                <motion.div layout className="masonry-grid">
                  <AnimatePresence>
                    {galleryImages.map((img, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.5) }}
                        key={img.id}
                        className="masonry-item relative group cursor-zoom-in rounded-xl overflow-hidden bg-white/5"
                        onClick={() => openLightbox(galleryImages.indexOf(img))}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 z-10" />
                        <img
                          src={img.url}
                          alt={img.title || "Gallery image"}
                          loading="lazy"
                          className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                        />
                        {img.type === "meme" && (
                          <div className="absolute top-2 left-2 z-20">
                            <span className="text-xs bg-yellow-500/80 text-black font-bold px-2 py-0.5 rounded-full">😂</span>
                          </div>
                        )}
                        <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                          <div className="flex items-end justify-between">
                            <div className="min-w-0 flex-1 mr-3">
                              <h3 className="text-white font-display text-lg truncate translate-y-3 group-hover:translate-y-0 transition-transform duration-500">
                                {img.title || "Untitled"}
                              </h3>
                              <p className="text-white/60 text-xs uppercase tracking-wider mt-1 translate-y-3 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                                {img.category}
                              </p>
                            </div>
                            <Button
                              size="icon" variant="ghost"
                              className="bg-white/10 hover:bg-white text-white hover:text-black rounded-full w-9 h-9 shrink-0 translate-y-3 group-hover:translate-y-0 transition-all duration-500 delay-100"
                              onClick={e => {
                                e.stopPropagation();
                                const fname = img.title ? `${img.title}.jpg` : `aw-${img.id}.jpg`;
                                startDownload(img.url, fname);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </section>
            )}
          </>
        ))}
      </main>

      <Footer />

      <Lightbox
        images={galleryImages}
        currentIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />

      <DownloadProgressBar downloads={downloads} onDismiss={dismissDownload} />
    </div>
  );
}
