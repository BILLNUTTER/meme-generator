import { useState, useEffect, useMemo } from "react";
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
  Users, Wand2, Crown,
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

  const samples = useMemo(() => {
    if (activeCategory === "All") {
      const car = images.find(img => img.category === "Cars");
      const anime = images.find(img => img.category === "Anime");
      return [car, anime].filter(Boolean) as typeof images;
    }
    return images.slice(0, 2);
  }, [images, activeCategory]);

  return (
    <div className="min-h-screen flex flex-col pt-16 overflow-x-hidden bg-background">
      <div className="fixed top-16 left-0 right-0 z-30 bg-orange-50/90 backdrop-blur-md border-b border-orange-200/60">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-sm font-semibold text-orange-700">
          <span>✅ Register free — download wallpapers, memes &amp; TikToks without watermarks</span>
          {!isLoggedIn && (
            <Link href="/register" className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs hover:bg-orange-400 transition-colors font-bold">
              Join Free
            </Link>
          )}
        </div>
      </div>

      <Header />

      {/* ── HERO ── */}
      <section className="relative text-center max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16">
        <div className="absolute inset-0 -z-10 blur-[140px] opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, #f97316 0%, transparent 65%)" }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/25 px-4 py-1.5 rounded-full mb-6">
            Your aesthetic content hub
          </span>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-tight mb-6 text-foreground">
            Wallpapers · Memes<br />
            <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
              &amp; TikToks
            </span>
          </h1>
          <p className="text-base md:text-lg text-foreground/65 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            One platform to browse premium aesthetic wallpapers, generate custom memes, download any TikTok watermark-free, and connect with the community.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 rounded-full text-base font-bold gap-2 bg-orange-500 hover:bg-orange-400 text-white">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 rounded-full text-base font-bold gap-2 bg-orange-500 hover:bg-orange-400 text-white">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-12 px-8 rounded-full text-base border-foreground/20 hover:bg-foreground/5 font-semibold">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </motion.div>

        {/* Feature pills */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3">
          {[
            { icon: Video,     label: "TikTok — no watermark" },
            { icon: Smile,     label: "Meme generator" },
            { icon: ImageIcon, label: "Aesthetic wallpapers" },
            { icon: Users,     label: "Social community" },
            { icon: Download,  label: "Free downloads" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-foreground/10 text-sm text-foreground/70 shadow-sm font-medium">
              <Icon className="w-3.5 h-3.5 text-orange-500" />
              {label}
            </div>
          ))}
        </motion.div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24">

        {/* ── ALL FEATURES GRID ── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-widest text-orange-500 font-bold">Everything included</span>
            <h2 className="font-display text-4xl mt-2 text-foreground">All features, all visible</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: ImageIcon, title: "Aesthetic Wallpapers",
                desc: "Hand-picked wallpapers across Nature, Cars, Anime, Minimalism, Vaporwave and more — updated daily by the admin.",
                color: "from-blue-500/10 to-cyan-500/5", border: "border-blue-200", iconBg: "bg-blue-100", iconColor: "text-blue-600",
                href: "/wallpapers", cta: "Browse Wallpapers",
              },
              {
                icon: Smile, title: "Meme Gallery",
                desc: "Browse fresh memes curated daily. Click any to view full-size, share or download — always free.",
                color: "from-yellow-500/10 to-amber-500/5", border: "border-yellow-200", iconBg: "bg-yellow-100", iconColor: "text-yellow-600",
                href: "/memes", cta: "Browse Memes",
              },
              {
                icon: Video, title: "TikTok Gallery",
                desc: "Watch and download curated TikTok videos from the gallery — premium content chosen by the team.",
                color: "from-pink-500/10 to-rose-500/5", border: "border-pink-200", iconBg: "bg-pink-100", iconColor: "text-pink-600",
                href: "/tiktoks", cta: "Watch TikToks",
              },
              {
                icon: Link2, title: "TikTok Downloader",
                desc: "Paste any TikTok link and download the original HD video without the watermark. 10 free downloads/month.",
                color: "from-orange-500/10 to-amber-500/5", border: "border-orange-200", iconBg: "bg-orange-100", iconColor: "text-orange-600",
                href: "/tiktok-download", cta: "Download TikTok",
              },
              {
                icon: Wand2, title: "Meme Maker",
                desc: "Create your own professional memes instantly — type your text, download the 1080×1080 Impact-font image. 100% free forever.",
                color: "from-green-500/10 to-emerald-500/5", border: "border-green-200", iconBg: "bg-green-100", iconColor: "text-green-600",
                href: "/meme-maker", cta: "Make a Meme",
              },
              {
                icon: Users, title: "Social Links Community",
                desc: "Share your social media profiles and discover others. Follow interesting people directly from their TikTok, Instagram, YouTube and more.",
                color: "from-violet-500/10 to-purple-500/5", border: "border-violet-200", iconBg: "bg-violet-100", iconColor: "text-violet-600",
                href: "/dashboard", cta: "Connect Now",
              },
            ].map(({ icon: Icon, title, desc, color, border, iconBg, iconColor, href, cta }) => (
              <motion.div
                key={title}
                whileHover={{ y: -3 }}
                className={cn("rounded-2xl border bg-gradient-to-br p-6 transition-shadow hover:shadow-md", color, border)}
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-4", iconBg)}>
                  <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
                <h3 className="font-display text-lg text-foreground mb-2">{title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed mb-4 font-medium">{desc}</p>
                <Link href={isLoggedIn ? href : "/register"}
                  className={cn("inline-flex items-center gap-1.5 text-sm font-bold", iconColor)}>
                  {cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── WhatsApp strip ── */}
        <div className="mb-16">
          <a href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-4 px-6 rounded-2xl transition-colors duration-300 w-full font-semibold">
            <MessageCircle className="w-5 h-5" />
            <span>📢 Follow us on WhatsApp for daily content drops →</span>
          </a>
        </div>

        {/* ── Sample gallery ── */}
        <section className="mb-20">
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-widest text-orange-500 font-bold">Preview</span>
            <h2 className="font-display text-4xl mt-2 text-foreground">Browse by category</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                  activeCategory === cat
                    ? "bg-orange-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.35)]"
                    : "bg-white text-foreground/70 hover:bg-orange-50 hover:text-orange-600 border border-foreground/15"
                )}>
                {cat}
              </button>
            ))}
          </div>

          <div className="min-h-[280px] flex items-center justify-center">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={activeCategory} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="w-full">
                  {samples.length === 0 ? (
                    <div className="text-center py-20 text-foreground/40 border border-foreground/10 rounded-3xl bg-foreground/[0.02]">
                      <p className="font-display text-xl italic">No samples yet for this category.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {samples.map(img => (
                        <div key={img.id} className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-foreground/5 cursor-pointer group shadow-md"
                          onClick={() => setShowAuthDialog(true)}>
                          <img src={img.url} alt={img.title || "Sample"}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute inset-0 flex flex-col justify-end p-6">
                            <p className="text-white font-display text-xl mb-1">{img.title || "Untitled"}</p>
                            <p className="text-white/60 text-xs uppercase tracking-widest">{img.category}</p>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-2 text-sm font-semibold text-white">
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
        </section>

        {/* ── How it works ── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-widest text-orange-500 font-bold">Simple steps</span>
            <h2 className="font-display text-4xl mt-2 text-foreground">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: Star, title: "Create a free account", desc: "Sign up in seconds — no credit card. Just your name, email and password." },
              { step: "02", icon: Download, title: "Browse & download", desc: "Explore wallpapers, memes and TikTok videos. One tap downloads anything to your device." },
              { step: "03", icon: Users, title: "Share & connect", desc: "Add your social media links to your profile. Discover and follow other users in the community." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-2xl border border-foreground/10 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-5xl font-display text-orange-100 absolute top-6 right-6">{step}</div>
                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-display text-lg text-foreground mb-3">{title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why us ── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-widest text-blue-500 font-bold">Reasons to join</span>
            <h2 className="font-display text-4xl mt-2 text-foreground">Why choose AESTHETICS?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Video, title: "No watermarks", desc: "Download TikToks in full HD without logos or watermarks.", color: "bg-orange-50 border-orange-200", iconColor: "text-orange-500" },
              { icon: Smile, title: "Meme generator", desc: "Professional 1080×1080 memes in seconds — Impact font, free forever.", color: "bg-yellow-50 border-yellow-200", iconColor: "text-yellow-600" },
              { icon: ShieldCheck, title: "Free & secure", desc: "No ads, no trackers. Sign up free and download everything.", color: "bg-green-50 border-green-200", iconColor: "text-green-600" },
              { icon: Users, title: "Community", desc: "Share your social profiles and discover great creators.", color: "bg-violet-50 border-violet-200", iconColor: "text-violet-600" },
            ].map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title} className={cn("rounded-2xl border p-6 hover:-translate-y-1 transition-transform duration-300 shadow-sm", color)}>
                <Icon className={cn("w-8 h-8 mb-4", iconColor)} />
                <h3 className="font-display text-foreground text-lg mb-2">{title}</h3>
                <p className="text-foreground/60 text-xs leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing teaser ── */}
        <section className="mb-10">
          <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-10 text-center max-w-3xl mx-auto shadow-sm">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Crown className="w-7 h-7 text-orange-500" />
            </div>
            <h2 className="font-display text-3xl text-foreground mb-4">Upgrade for unlimited TikTok downloads</h2>
            <p className="text-foreground/65 text-sm leading-relaxed mb-8 max-w-lg mx-auto font-medium">
              Free users get 10 no-watermark TikTok downloads/month. Upgrade to unlimited for just{" "}
              <span className="text-orange-600 font-bold">Ksh 70/month</span>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {["10 free TikTok downloads/month", "Unlimited wallpaper downloads", "Free meme generator — forever", "New content added daily"].map(f => (
                <div key={f} className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-orange-100 text-sm text-foreground/70 font-medium">
                  <Check className="w-4 h-4 text-green-500 shrink-0" /> {f}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {!isLoggedIn ? (
                <Link href="/register">
                  <Button size="lg" className="rounded-full px-8 bg-orange-500 hover:bg-orange-400 text-white font-bold">Start Free</Button>
                </Link>
              ) : (
                <Link href="/pay">
                  <Button size="lg" className="rounded-full px-8 bg-orange-500 hover:bg-orange-400 text-white font-bold">Upgrade — Ksh 70/month</Button>
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>

      <Footer />
      <AppInstallPrompt />

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md bg-white border-foreground/10 text-foreground">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-orange-500" />
            </div>
            <DialogTitle className="text-center font-display text-2xl">Download Restricted</DialogTitle>
            <DialogDescription className="text-center text-foreground/60 font-medium">
              Create a free account to download wallpapers, memes and TikTok videos without watermarks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Link href="/register" className="w-full">
              <Button className="w-full h-12 text-base bg-orange-500 hover:bg-orange-400 text-white font-bold">Register Free</Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full h-12 text-base border-foreground/15 font-semibold">Login</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
