import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetImages } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lightbox } from "@/components/Lightbox";
import { AppInstallPrompt } from "@/components/AppInstallPrompt";
import { cn } from "@/lib/utils";
import { MessageCircle, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes"];

export default function Home() {
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

  const { data: images = [], isLoading, error } = useGetImages(
    activeCategory === "All" ? undefined : { category: activeCategory }
  );

  const openLightbox = (index: number) => setLightboxState({ isOpen: true, index });
  const closeLightbox = () => setLightboxState(prev => ({ ...prev, isOpen: false }));
  const navigateLightbox = (index: number) => setLightboxState(prev => ({ ...prev, index }));

  return (
    <div className="min-h-screen flex flex-col pt-20">
      {/* Sticky Banner */}
      <div className="fixed top-20 left-0 right-0 z-30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-md border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-sm font-medium">
          <span>✅ Register free — download wallpapers, memes &amp; TikToks without watermarks</span>
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

        {/* Hero */}
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
            Your daily dose of aesthetic wallpapers, trending memes and viral TikTok videos — 
            all curated in one place. Register free and download everything, no watermarks.
          </motion.p>
        </section>

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300",
                activeCategory === cat
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/5"
              )}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Gallery */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive/80 glass-card rounded-2xl">
            <p>Failed to load images. Please try again later.</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-32 border border-white/5 rounded-3xl bg-white/[0.02]">
            <p className="font-display text-2xl text-white/40 italic">No visuals found.</p>
          </div>
        ) : (
          <motion.div layout className="masonry-grid">
            <AnimatePresence>
              {images.map((img, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.5) }}
                  key={img.id}
                  className="masonry-item relative group cursor-zoom-in rounded-xl overflow-hidden bg-white/5"
                  onClick={() => openLightbox(idx)}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                  <img
                    src={img.url}
                    alt={img.title || "Gallery image"}
                    loading="lazy"
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                  />
                  {img.type === "meme" && (
                    <div className="absolute top-2 left-2 z-20">
                      <span className="text-xs bg-yellow-500/80 text-black font-bold px-2 py-0.5 rounded-full">😂 Meme</span>
                    </div>
                  )}
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
        )}
      </main>

      <Footer />
      <AppInstallPrompt />

      <Lightbox
        images={images}
        currentIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        onDownloadClick={() => setShowAuthDialog(true)}
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
