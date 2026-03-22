import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetImages } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Lightbox } from "@/components/Lightbox";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Quotes", "Vaporwave"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxState, setLightboxState] = useState({ isOpen: false, index: 0 });

  // Fetch images based on category filter
  const { data: images = [], isLoading, error } = useGetImages(
    activeCategory === "All" ? undefined : { category: activeCategory }
  );

  const openLightbox = (index: number) => setLightboxState({ isOpen: true, index });
  const closeLightbox = () => setLightboxState(prev => ({ ...prev, isOpen: false }));
  const navigateLightbox = (index: number) => setLightboxState(prev => ({ ...prev, index }));

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto mb-16 space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-5xl md:text-7xl lg:text-8xl text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40"
          >
            Curated Space
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-muted-foreground text-balance"
          >
            A collection of high-quality, atmospheric wallpapers designed to bring calm and inspiration to your digital environment.
          </motion.p>
        </section>

        {/* Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3 mb-16"
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
          <motion.div 
            layout
            className="masonry-grid"
          >
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
