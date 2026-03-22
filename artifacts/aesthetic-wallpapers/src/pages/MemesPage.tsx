import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Download, Laugh } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useGetImages } from "@workspace/api-client-react";
import { buildProxyUrl, downloadWithProgress } from "@/lib/utils";

export function MemesPage() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated } = useUserAuth();
  const [dlProgress, setDlProgress] = useState<{ name: string; percent: number } | null>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  const { data } = useGetImages(undefined, {
    request: { headers: { Authorization: `Bearer ${localStorage.getItem("userToken")}` } },
  });

  const memes = (data?.data ?? []).filter((img) => img.type === "meme");

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      {dlProgress && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl">
          <div className="w-32 h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-yellow-400 transition-all duration-300" style={{ width: `${dlProgress.percent}%` }} />
          </div>
          <span className="text-xs text-white/60">{dlProgress.percent}%</span>
        </div>
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
          <p className="text-white/40 ml-[52px]">{memes.length} memes · curated & updated daily</p>
        </div>

        {memes.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-white/30 text-sm glass-card rounded-2xl">
            No memes yet — check back soon!
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {memes.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="break-inside-avoid rounded-xl overflow-hidden group relative cursor-pointer bg-white/5"
              >
                <img
                  src={img.url}
                  alt={img.title ?? "Meme"}
                  className="w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-white text-xs font-medium truncate flex-1 mr-2">
                      {img.title ?? "Meme"}
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await downloadWithProgress(
                          buildProxyUrl(img.url, `meme-${img.id}.jpg`, import.meta.env.BASE_URL.replace(/\/$/, "")),
                          `meme-${img.id}.jpg`,
                          (p) => setDlProgress({ name: "meme", percent: p })
                        );
                        setDlProgress(null);
                      }}
                      className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
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
