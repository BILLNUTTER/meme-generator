import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Music, Play } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContentViewer } from "@/components/ContentViewer";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useGetDashboardImages } from "@workspace/api-client-react";

export function TikToksPage() {
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

  const tiktoks = (data ?? []).filter((img) => img.type === "tiktok");

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-background">
      <Header />

      {viewerIndex !== null && (
        <ContentViewer
          items={tiktoks}
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-white">TikTok Gallery</h1>
          </div>
          <p className="text-white/40 ml-[52px]">{tiktoks.length} videos · tap to play watermark-free</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/5 animate-pulse aspect-[9/16]" />
            ))}
          </div>
        ) : tiktoks.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-white/30 text-sm glass-card rounded-2xl">
            No TikToks yet — the admin is adding them daily!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {tiktoks.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group rounded-2xl overflow-hidden aspect-[9/16] bg-white/5 cursor-pointer active:scale-95 transition-transform"
                onClick={() => setViewerIndex(i)}
              >
                <img
                  src={img.thumbnail ?? img.url}
                  alt={img.title ?? "TikTok"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs font-medium line-clamp-2">{img.title ?? "TikTok"}</p>
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
