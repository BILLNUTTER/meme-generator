import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContentViewer } from "@/components/ContentViewer";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useGetDashboardImages } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export function WallpapersPage() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated } = useUserAuth();
  const [activeCategory, setActiveCategory] = useState("All");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const token = localStorage.getItem("userToken");

  const { data } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: {
      enabled: isAuthenticated && !!token,
      staleTime: 5 * 60 * 1000,
    },
  });

  const allImages = useMemo(
    () => (data ?? []).filter((img) => img.type !== "meme" && img.type !== "tiktok"),
    [data]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(allImages.map((i) => i.category).filter(Boolean))) as string[];
    cats.sort();
    return ["All", ...cats];
  }, [allImages]);

  useEffect(() => {
    if (activeCategory !== "All" && !categories.includes(activeCategory)) {
      setActiveCategory("All");
    }
  }, [categories, activeCategory]);

  const filtered = activeCategory === "All"
    ? allImages
    : allImages.filter((img) => img.category === activeCategory);

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      {viewerIndex !== null && (
        <ContentViewer
          items={filtered}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          baseUrl={baseUrl}
          token={token}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">Wallpapers</h1>
          <p className="text-white/40">Premium aesthetic wallpapers curated daily</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                activeCategory === cat
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
              )}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1.5 text-xs opacity-50">
                  {allImages.filter((i) => i.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="text-white/30 text-xs mb-6">
          {filtered.length} {filtered.length === 1 ? "wallpaper" : "wallpapers"}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        </p>

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-64 flex items-center justify-center text-white/30 text-sm glass-card rounded-2xl"
            >
              No wallpapers in this category yet.
            </motion.div>
          ) : (
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3"
            >
              {filtered.map((img, i) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="break-inside-avoid rounded-xl overflow-hidden group relative cursor-pointer bg-white/5 active:scale-95 transition-transform"
                  onClick={() => setViewerIndex(i)}
                >
                  <img
                    src={img.url}
                    alt={img.title ?? "Wallpaper"}
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <span className="text-white text-xs font-medium truncate">{img.title ?? img.category}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
