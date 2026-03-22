import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetImages } from "@workspace/api-client-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AppInstallPrompt } from "@/components/AppInstallPrompt";
import { cn } from "@/lib/utils";
import {
  MessageCircle, Lock, Download, Smile, Image as ImageIcon,
  Video, Zap, ShieldCheck, Star, ArrowRight, Check, Link2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("userToken"));
    const onAuth = () => setIsLoggedIn(!!localStorage.getItem("userToken"));
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  const { data: images = [], isLoading } = useGetImages(
    activeCategory === "All" ? undefined : { category: activeCategory }
  );

  const samples = images.slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col pt-20 overflow-x-hidden">
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

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative text-center max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20">
        <div className="absolute inset-0 -z-10 blur-[120px] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, #7c3aed 0%, transparent 70%)" }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 rounded-full mb-6">
            Your aesthetic content hub
          </span>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 leading-tight mb-8">
            Wallpapers · Memes<br />
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              &amp; TikToks
            </span>
          </h1>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {[
            { icon: Video,     label: "TikTok videos — no watermark" },
            { icon: Smile,     label: "Meme generator" },
            { icon: ImageIcon, label: "Aesthetic wallpapers" },
            { icon: Download,  label: "Free downloads after signup" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70">
              <Icon className="w-3.5 h-3.5 text-violet-400" />
              {label}
            </div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-base md:text-lg text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          One platform to browse premium aesthetic wallpapers, generate custom memes with your branding,
          and download any TikTok video in full HD — completely watermark-free. Everything curated daily,
          all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 rounded-full text-base font-semibold gap-2">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 rounded-full text-base border-white/15 hover:bg-white/5">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </motion.div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24">

        {/* ── WhatsApp strip ──────────────────────────────────── */}
        <div className="mb-14 max-w-2xl mx-auto">
          <a
            href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 py-3 px-6 rounded-2xl transition-colors duration-300 w-full font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            <span>📢 Follow us on WhatsApp for daily drops →</span>
          </a>
        </div>

        {/* ── Category filter ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {CATEGORIES.map(cat => (
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

        {/* ── 2 Sample cards for active category ──────────────── */}
        <div className="mb-20 min-h-[320px] flex items-center justify-center">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="w-full"
              >
                {samples.length === 0 ? (
                  <div className="text-center py-20 text-white/30 border border-white/5 rounded-3xl bg-white/[0.02]">
                    <p className="font-display text-xl italic">No samples yet for this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {samples.map(img => (
                      <div
                        key={img.id}
                        className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-white/5 cursor-pointer group"
                        onClick={() => setShowAuthDialog(true)}
                      >
                        <img
                          src={img.url}
                          alt={img.title || "Sample"}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {img.type !== "meme" && (
                        <div className="absolute inset-0 flex flex-col justify-end p-6">
                          <p className="text-white font-display text-xl mb-1">{img.title || "Untitled"}</p>
                          <p className="text-white/50 text-xs uppercase tracking-widest">{img.category}</p>
                        </div>
                      )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-2 text-sm font-medium text-white">
                            <Lock className="w-4 h-4" /> Register to download free
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ── How to use ──────────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">Simple steps</span>
            <h2 className="font-display text-4xl mt-3 text-white">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Star,
                title: "Create a free account",
                desc: "Sign up in seconds — no credit card, no spam. Just your name, email and a password.",
              },
              {
                step: "02",
                icon: Download,
                title: "Browse & download",
                desc: "Explore wallpapers, memes and TikTok videos. One tap downloads anything directly to your device.",
              },
              {
                step: "03",
                icon: Link2,
                title: "Paste any TikTok link",
                desc: "Got a TikTok you love? Paste the link in the TikTok Link tool and download it watermark-free — 3 free per month, or upgrade for unlimited.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 group hover:border-violet-500/30 hover:bg-white/[0.05] transition-all duration-300">
                <div className="text-5xl font-display text-white/5 absolute top-6 right-6">{step}</div>
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-display text-lg text-white mb-3">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why choose us ───────────────────────────────────── */}
        <section className="mb-24">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-widest text-pink-400 font-semibold">Reasons to join</span>
            <h2 className="font-display text-4xl mt-3 text-white">Why choose Aesthetic?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Video,
                title: "TikTok without watermarks",
                desc: "Download any TikTok video in HD without the distracting TikTok watermark logo.",
                color: "from-pink-500/20 to-rose-500/5",
                border: "border-pink-500/20",
                iconColor: "text-pink-400",
              },
              {
                icon: Smile,
                title: "Meme generator",
                desc: "Type your text, our system generates a professional 1080×1080 meme image instantly — Impact font, black background, branded watermark.",
                color: "from-yellow-500/20 to-orange-500/5",
                border: "border-yellow-500/20",
                iconColor: "text-yellow-400",
              },
              {
                icon: ImageIcon,
                title: "Aesthetic wallpapers",
                desc: "Hand-picked wallpapers across Nature, Cars, Anime, Minimalism, Vaporwave and more — updated daily.",
                color: "from-blue-500/20 to-cyan-500/5",
                border: "border-blue-500/20",
                iconColor: "text-blue-400",
              },
              {
                icon: ShieldCheck,
                title: "Free & secure",
                desc: "Everything is free to browse. Sign up to download. No ads, no trackers, no nonsense.",
                color: "from-green-500/20 to-emerald-500/5",
                border: "border-green-500/20",
                iconColor: "text-green-400",
              },
            ].map(({ icon: Icon, title, desc, color, border, iconColor }) => (
              <div key={title} className={cn("rounded-2xl border bg-gradient-to-br p-6 transition-transform duration-300 hover:-translate-y-1", color, border)}>
                <Icon className={cn("w-8 h-8 mb-4", iconColor)} />
                <h3 className="font-display text-white text-lg mb-2">{title}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing teaser ──────────────────────────────────── */}
        <section className="mb-24">
          <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-pink-500/5 to-transparent p-10 text-center max-w-3xl mx-auto">
            <Zap className="w-10 h-10 text-violet-400 mx-auto mb-5" />
            <h2 className="font-display text-3xl text-white mb-4">Upgrade for unlimited TikTok downloads</h2>
            <p className="text-white/55 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
              Free users get 3 no-watermark TikTok downloads per month. Upgrade to unlimited downloads
              for just <span className="text-white font-bold">Ksh 70/month</span>. Contact us on WhatsApp to activate.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              {["3 free TikTok downloads/month", "Unlimited wallpaper downloads", "Free meme generator", "New content daily"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-white/70">
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> {f}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {!isLoggedIn && (
                <Link href="/register">
                  <Button size="lg" className="rounded-full px-8">Start Free</Button>
                </Link>
              )}
              {isLoggedIn && (
                <Link href="/pay">
                  <Button size="lg" className="rounded-full px-8">Upgrade — Ksh 70/month</Button>
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <AppInstallPrompt />

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
