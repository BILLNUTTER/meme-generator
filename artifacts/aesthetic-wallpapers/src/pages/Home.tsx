import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetImages } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lightbox } from "@/components/Lightbox";
import { AppInstallPrompt } from "@/components/AppInstallPrompt";
import { cn } from "@/lib/utils";
import { MessageCircle, Lock, Download, Play, Image as ImageIcon, Laugh, Music } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes"];
const TYPE_TABS = [
  { id: "all", label: "All", icon: ImageIcon },
  { id: "wallpaper", label: "Wallpapers", icon: ImageIcon },
  { id: "meme", label: "Memes", icon: Laugh },
  { id: "tiktok", label: "TikToks", icon: Music },
];

export default function Home() {
  const [activeType, setActiveType] = useState("all");
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxState, setLightboxState] = useState({ isOpen: false, index: 0 });
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("userToken"));
    const onAuth = () => setIsLoggedIn(!!localStorage.getItem("userToken"));
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  const queryParams: Record<string, string> = {};
  if (activeType !== "all") queryParams.type = activeType;
  if (activeCategory !== "All") queryParams.category = activeCategory;

  const { data: images = [], isLoading, error } = useGetImages(
    Object.keys(queryParams).length ? queryParams : undefined
  );

  const wallpaperAndMemeImages = images.filter(img => img.type !== "tiktok");
  const tiktokImages = images.filter(img => img.type === "tiktok");

  const openLightbox = (index: number) => setLightboxState({ isOpen: true, index });
  const closeLightbox = () => setLightboxState(prev => ({ ...prev, isOpen: false }));
  const navigateLightbox = (index: number) => setLightboxState(prev => ({ ...prev, index }));

  const handleDownloadRestricted = () => setShowAuthDialog(true);

  const handleTikTokDownload = async (tiktokUrl: string, title: string) => {
    if (!isLoggedIn) { setShowAuthDialog(true); return; }
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tiktokUrl }),
      });
      const data = await resp.json() as { downloadUrl?: string; error?: string };
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.mp4`;
        a.target = "_blank";
        a.click();
      }
    } catch {
      window.open(tiktokUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      {/* Sticky Banner */}
      <div className="fixed top-20 left-0 right-0 z-30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-sm font-medium">
          <span>✅ Register free to download wallpapers, memes &amp; TikToks</span>
          {!isLoggedIn && (
            <Link href="/register" className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs hover:bg-primary/90 transition-colors">
              Join Free
            </Link>
          )}
        </div>
      </div>

      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 mt-8">
        {/* WhatsApp Strip */}
        <div className="mb-12 max-w-2xl mx-auto">
          <a
            href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 py-3 px-6 rounded-2xl transition-colors duration-300 w-full font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="tracking-wide">📢 Follow us on WhatsApp for daily drops →</span>
          </a>
        </div>

        {/* Hero Section */}
        <section className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-5xl md:text-6xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40"
          >
            Wallpapers, Memes &amp; TikToks
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-muted-foreground text-balance max-w-2xl mx-auto"
          >
            Your daily source of aesthetic wallpapers, trending memes, and viral TikTok videos — 
            all in one place. Register free and download everything without watermarks.
          </motion.p>

          {/* Type tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 pt-2"
          >
            {TYPE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveType(tab.id); setActiveCategory("All"); }}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                    activeType === tab.id
                      ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </motion.div>
        </section>

        {/* Category filter — only for wallpapers / all */}
        {(activeType === "all" || activeType === "wallpaper") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {CATEGORIES.map((cat) => (
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

        {/* Content Grid */}
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
            {/* TikTok Section */}
            {tiktokImages.length > 0 && (
              <section className="mb-16">
                {activeType === "all" && (
                  <h2 className="font-display text-2xl text-white/80 mb-6 flex items-center gap-2">
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
                        className="relative group rounded-2xl overflow-hidden bg-white/5 aspect-[9/16] cursor-pointer"
                      >
                        <img
                          src={img.url}
                          alt={img.title || "TikTok"}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-xs font-medium line-clamp-2">{img.title || "TikTok"}</p>
                          <div className="flex gap-2 mt-2">
                            {img.tiktokUrl && (
                              <a
                                href={img.tiktokUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center bg-white/20 backdrop-blur-sm text-white text-xs py-1 rounded-lg hover:bg-white/30 transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                Watch
                              </a>
                            )}
                            <button
                              onClick={() => img.tiktokUrl && handleTikTokDownload(img.tiktokUrl, img.title || "tiktok")}
                              className="flex-1 flex items-center justify-center gap-1 bg-pink-500/80 backdrop-blur-sm text-white text-xs py-1 rounded-lg hover:bg-pink-500 transition-colors"
                            >
                              <Download className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Images/Memes Masonry Grid */}
            {wallpaperAndMemeImages.length > 0 && (
              <section>
                {activeType === "all" && (
                  <h2 className="font-display text-2xl text-white/80 mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-400" /> Wallpapers &amp; Memes
                  </h2>
                )}
                <motion.div layout className="masonry-grid">
                  <AnimatePresence>
                    {wallpaperAndMemeImages.map((img, idx) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.5) }}
                        key={img.id}
                        className="masonry-item relative group cursor-zoom-in rounded-xl overflow-hidden bg-white/5"
                        onClick={() => openLightbox(wallpaperAndMemeImages.indexOf(img))}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                        <img
                          src={img.url}
                          alt={img.title || "Gallery image"}
                          loading="lazy"
                          className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute top-2 left-2 z-20">
                          {img.type === "meme" && (
                            <span className="text-xs bg-yellow-500/80 text-black font-bold px-2 py-0.5 rounded-full">😂 Meme</span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20 flex flex-col justify-end p-6">
                          <h3 className="text-white font-display text-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                            {img.title || "Untitled"}
                          </h3>
                          <p className="text-white/60 text-xs uppercase tracking-widest mt-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                            {img.category}
                          </p>
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
      <AppInstallPrompt />

      <Lightbox
        images={wallpaperAndMemeImages}
        currentIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        onDownloadClick={handleDownloadRestricted}
      />

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md bg-black border-white/10 text-white">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white/80" />
            </div>
            <DialogTitle className="text-center font-display text-2xl">Download Restricted</DialogTitle>
            <DialogDescription className="text-center text-white/60">
              Create a free account to download wallpapers, memes and TikTok videos without watermarks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Link href="/register" className="w-full">
              <Button className="w-full h-12 text-base">Register Free</Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full h-12 text-base border-white/10 hover:bg-white/5">Login</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
