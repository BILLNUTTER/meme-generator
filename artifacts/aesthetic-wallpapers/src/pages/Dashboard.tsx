import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDashboardImages } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lightbox } from "@/components/Lightbox";
import { TikTokPlayer } from "@/components/TikTokPlayer";
import { DownloadProgressBar, type DownloadItem } from "@/components/DownloadProgressBar";
import { useUserAuth } from "@/hooks/use-user-auth";
import { cn, downloadWithProgress, buildProxyUrl } from "@/lib/utils";
import { LogOut, Download, MessageCircle, Image as ImageIcon, Laugh, Music, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes"];

const TYPE_TABS = [
  { id: "all",       label: "All",        icon: ImageIcon },
  { id: "wallpaper", label: "Wallpapers", icon: ImageIcon },
  { id: "meme",      label: "Memes",      icon: Laugh },
  { id: "tiktok",    label: "TikToks",    icon: Music },
] as const;

type TabId = (typeof TYPE_TABS)[number]["id"];

interface TikTokPlayerState {
  isOpen: boolean;
  tiktokUrl: string;
  thumbnailUrl: string;
  title: string;
}

const EMPTY_PLAYER: TikTokPlayerState = { isOpen: false, tiktokUrl: "", thumbnailUrl: "", title: "" };

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, token, isReady, isAuthenticated, logout } = useUserAuth();

  const [activeType, setActiveType]         = useState<TabId>("all");
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxState, setLightboxState]   = useState({ isOpen: false, index: 0 });
  const [player, setPlayer]                 = useState<TikTokPlayerState>(EMPTY_PLAYER);
  const [downloads, setDownloads]           = useState<DownloadItem[]>([]);

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

  const handleTikTokDownload = (videoUrl: string, title: string) => {
    const filename = `${(title || "tiktok").replace(/[^a-z0-9]/gi, "_")}.mp4`;
    startDownload(videoUrl, filename);
  };

  const dismissDownload = (id: string) => setDownloads(prev => prev.filter(d => d.id !== id));

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
                onClick={() => { setActiveType(tab.id); setActiveCategory("All"); }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeType === tab.id
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
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

        {isLoading ? (
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
                        onClick={() =>
                          img.tiktokUrl &&
                          setPlayer({
                            isOpen: true,
                            tiktokUrl: img.tiktokUrl,
                            thumbnailUrl: img.url,
                            title: img.title || "TikTok",
                          })
                        }
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
        )}
      </main>

      <Footer />

      <Lightbox
        images={galleryImages}
        currentIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />

      <TikTokPlayer
        isOpen={player.isOpen}
        tiktokUrl={player.tiktokUrl}
        thumbnailUrl={player.thumbnailUrl}
        title={player.title}
        onClose={() => setPlayer(EMPTY_PLAYER)}
        onDownload={handleTikTokDownload}
      />

      <DownloadProgressBar downloads={downloads} onDismiss={dismissDownload} />
    </div>
  );
}
