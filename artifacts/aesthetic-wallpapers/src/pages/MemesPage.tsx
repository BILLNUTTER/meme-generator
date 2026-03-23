import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Laugh } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContentViewer } from "@/components/ContentViewer";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useGetDashboardImages } from "@workspace/api-client-react";

export function MemesPage() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated } = useUserAuth();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const token = localStorage.getItem("userToken");

  const { data, isLoading } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated && !!token, staleTime: 5 * 60 * 1000 },
  });

  const memes = (data ?? []).filter((img) => img.type === "meme");

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-background">
      <Header />

      {viewerIndex !== null && (
        <ContentViewer
          items={memes}
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Laugh className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-white">Meme Gallery</h1>
          </div>
          <p className="text-white/40 ml-[52px]">{memes.length} memes · tap to view full size</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 animate-pulse aspect-square" />
            ))}
          </div>
        ) : memes.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-white/30 text-sm glass-card rounded-2xl">
            No memes yet — check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
            {memes.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl overflow-hidden group relative cursor-pointer bg-white/5 aspect-square active:scale-95 transition-transform"
                onClick={() => setViewerIndex(i)}
              >
                <img
                  src={img.url}
                  alt={img.title ?? "Meme"}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white text-xs font-medium truncate">{img.title ?? "Meme"}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
