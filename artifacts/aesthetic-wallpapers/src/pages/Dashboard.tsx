import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetDashboardImages } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lightbox } from "@/components/Lightbox";
import { useUserAuth } from "@/hooks/use-user-auth";
import { cn, forceDownload } from "@/lib/utils";
import { LogOut, Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Quotes", "Vaporwave"];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, token, isReady, isAuthenticated, logout } = useUserAuth();
  
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isReady, isAuthenticated, setLocation]);

  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxState, setLightboxState] = useState({ isOpen: false, index: 0 });

  // Fetch images based on category filter
  const { data: images = [], isLoading, error } = useGetDashboardImages(
    activeCategory === "All" ? undefined : { category: activeCategory },
    {
      request: { headers: { Authorization: `Bearer ${token}` } },
      query: { enabled: !!token }
    }
  );

  const openLightbox = (index: number) => setLightboxState({ isOpen: true, index });
  const closeLightbox = () => setLightboxState(prev => ({ ...prev, isOpen: false }));
  const navigateLightbox = (index: number) => setLightboxState(prev => ({ ...prev, index }));

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />
      
      {/* Dashboard Top Bar */}
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
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d", "_blank")}
              className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300 gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Follow us for more
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); setLocation("/"); }} className="text-white/60 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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

        {/* Gallery Grid */}
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
            <p className="font-display text-2xl text-white/40 italic">No visuals found for this mood.</p>
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
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 z-10" />
                  <img
                    src={img.url}
                    alt={img.title || "Gallery image"}
                    loading="lazy"
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-white font-display text-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          {img.title || "Untitled"}
                        </h3>
                        <p className="text-white/60 text-xs uppercase tracking-widest mt-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                          {img.category}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="bg-white/10 hover:bg-white text-white hover:text-black rounded-full w-10 h-10 translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          forceDownload(img.url, img.title ? `${img.title}.jpg` : `aesthetic-${img.id}.jpg`);
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
        )}
      </main>

      <Footer />

      <Lightbox 
        images={images}
        currentIndex={lightboxState.index}
        isOpen={lightboxState.isOpen}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
      />
    </div>
  );
}
