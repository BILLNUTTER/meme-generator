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
  Video, Zap, ShieldCheck, ArrowRight, Check,
  Users, Wand2, Crown, TrendingUp, Play, Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes"];

const FEATURES = [
  {
    icon: ImageIcon, title: "Aesthetic Wallpapers",
    desc: "Hand-picked wallpapers across Nature, Cars, Anime, Minimalism, Vaporwave — updated daily.",
    color: "from-blue-50 to-cyan-50", border: "border-blue-200", iconBg: "bg-blue-100", accent: "text-blue-600",
  },
  {
    icon: Smile, title: "Meme Gallery",
    desc: "Browse fresh memes curated daily. View, share or download any meme — always free.",
    color: "from-yellow-50 to-amber-50", border: "border-yellow-200", iconBg: "bg-yellow-100", accent: "text-yellow-600",
  },
  {
    icon: Play, title: "TikTok Gallery",
    desc: "Watch and download curated TikTok videos — premium content picked by the team.",
    color: "from-pink-50 to-rose-50", border: "border-pink-200", iconBg: "bg-pink-100", accent: "text-pink-600",
  },
  {
    icon: Download, title: "TikTok Downloader",
    desc: "Paste any TikTok link — download the original HD video without any watermark. 10 free/month.",
    color: "from-orange-50 to-amber-50", border: "border-orange-200", iconBg: "bg-orange-100", accent: "text-orange-600",
  },
  {
    icon: Wand2, title: "Meme Maker",
    desc: "Type your text — get a professional 1080×800 Impact-font meme instantly. 100% free forever.",
    color: "from-green-50 to-emerald-50", border: "border-green-200", iconBg: "bg-green-100", accent: "text-green-600",
  },
  {
    icon: Users, title: "Social Community",
    desc: "Share your social media profiles. Discover and follow creators across 13 platforms.",
    color: "from-violet-50 to-purple-50", border: "border-violet-200", iconBg: "bg-violet-100", accent: "text-violet-600",
  },
];

const WHY = [
  { icon: Video,        title: "No watermarks",     desc: "Download TikToks in full HD without logos or watermarks.",           color: "bg-orange-50 border-orange-200", ic: "text-orange-500" },
  { icon: Wand2,        title: "Meme generator",     desc: "Professional memes in seconds — Impact font, free forever.",          color: "bg-yellow-50 border-yellow-200", ic: "text-yellow-600" },
  { icon: ShieldCheck,  title: "Free & secure",      desc: "No ads, no trackers. Sign up free, download everything.",             color: "bg-green-50  border-green-200",  ic: "text-green-600"  },
  { icon: TrendingUp,   title: "Social boost",       desc: "Share your profiles, discover creators, grow your following.",        color: "bg-violet-50 border-violet-200", ic: "text-violet-600" },
];

export default function Home() {
  const [activeCatIdx, setActiveCatIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const activeCategory = CATEGORIES[activeCatIdx];

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("userToken"));
    const onAuth = () => setIsLoggedIn(!!localStorage.getItem("userToken"));
    window.addEventListener("auth-change", onAuth);
    return () => window.removeEventListener("auth-change", onAuth);
  }, []);

  /* Auto-advance category every 2 seconds */
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setActiveCatIdx(i => (i + 1) % CATEGORIES.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const { data: images = [], isLoading } = useGetImages(
    activeCategory === "All" ? undefined : { category: activeCategory }
  );

  const samples = useMemo(() => {
    if (activeCategory === "All") {
      const car   = images.find(img => img.category === "Cars");
      const anime = images.find(img => img.category === "Anime");
      return [car, anime].filter(Boolean) as typeof images;
    }
    return images.slice(0, 2);
  }, [images, activeCategory]);

  return (
    <div className="min-h-screen flex flex-col pt-16 overflow-x-hidden page-live">
      <Header />

      {/* ══════════════════════════════════════════════════════════
          HERO — AESTHETICS Community
      ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* warm gradient blob */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[140px] opacity-25"
            style={{ background: "radial-gradient(ellipse, #f97316 0%, #fbbf24 40%, transparent 70%)" }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>

            {/* eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-3 h-3" /> AESTHETICS Community
            </div>

            {/* headline */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-foreground leading-tight mb-6">
              Your{" "}
              <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                aesthetic
              </span>
              {" "}content<br className="hidden sm:block" /> &amp; creator hub
            </h1>

            {/* sub */}
            <p className="text-base sm:text-lg text-foreground/65 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              Browse wallpapers, generate memes, download TikToks watermark-free, and connect
              with a growing community of creators — all in one platform, completely free to join.
            </p>

            {/* CTA buttons */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              {isLoggedIn ? (
                <Link href="/dashboard">
                  <Button size="lg" className="h-13 px-10 rounded-full text-base font-bold gap-2 bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-200">
                    Open Dashboard <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="h-13 px-10 rounded-full text-base font-bold gap-2 bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-200">
                      Join Free <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="h-13 px-10 rounded-full text-base font-semibold border-foreground/20 hover:bg-foreground/5">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>

            {/* stat chips */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="flex flex-wrap justify-center gap-3">
              {[
                { icon: ImageIcon, label: "Aesthetic wallpapers" },
                { icon: Smile,     label: "Fresh memes daily" },
                { icon: Video,     label: "TikToks — no watermark" },
                { icon: Wand2,     label: "Meme maker — free" },
                { icon: Users,     label: "Social community" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-foreground/10 shadow-sm text-sm text-foreground/70 font-medium">
                  <Icon className="w-3.5 h-3.5 text-orange-500" /> {label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════ */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24">

        {/* ── ALL 6 FEATURES GRID ── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-orange-500 font-bold mb-2">Everything included</p>
            <h2 className="font-display text-4xl text-foreground">6 powerful features, all free</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => {
              const cycleClass = [`card-live`,`card-live-1`,`card-live-2`,`card-live-3`,`card-live-4`,`card-live-5`][i % 6];
              return (
                <motion.div key={title} whileHover={{ y: -4, scale: 1.01 }}
                  className={cn("rounded-2xl border-0 p-6 shadow-md hover:shadow-xl transition-shadow overflow-hidden", cycleClass)}>
                  <div className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-white drop-shadow" />
                  </div>
                  <h3 className="font-display text-lg text-white mb-2 drop-shadow">{title}</h3>
                  <p className="text-white/85 text-sm leading-relaxed font-medium mb-4">{desc}</p>
                  <Link href={isLoggedIn ? "#" : "/register"}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-white/90 hover:text-white">
                    Get started <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── WhatsApp strip ── */}
        <div className="mb-20">
          <a href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-4 px-6 rounded-2xl transition-colors w-full font-semibold">
            <MessageCircle className="w-5 h-5" />
            <span>📢 Follow us on WhatsApp for daily content drops →</span>
          </a>
        </div>

        {/* ── SAMPLE GALLERY ── */}
        <section className="mb-20">
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-widest text-orange-500 font-bold mb-2">Preview</p>
            <h2 className="font-display text-4xl text-foreground">Browse by category</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {CATEGORIES.map((cat, i) => (
              <button key={cat} onClick={() => { setDirection(i > activeCatIdx ? 1 : -1); setActiveCatIdx(i); }}
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

          <div className="min-h-[280px] flex items-center justify-center overflow-hidden">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            ) : (
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div key={activeCategory}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ x: d * 80, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit:  (d: number) => ({ x: d * -80, opacity: 0 }),
                  }}
                  initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="w-full">
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

        {/* ── SOCIAL COMMUNITY SPOTLIGHT ── */}
        <section className="mb-20">
          <div className="rounded-3xl card-live-1 overflow-hidden p-8 sm:p-12 relative">
            <div className="relative max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-wider mb-5">
                <TrendingUp className="w-3 h-3" /> Social Boost Feature
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">Connect with the community</h2>
              <p className="text-white/85 text-base font-medium leading-relaxed mb-6">
                Add your Instagram, TikTok, YouTube, Twitter and 9 other platforms to your profile.
                Browse fellow creators, tap to view their accounts, and grow your following — all inside the app.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Add links to 13 social platforms on your profile",
                  "Browse all community members in the Members feed",
                  "Tap a member card to open their profile in-app",
                  "Mark members as followed — they disappear from your feed",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/90 font-medium">
                    <Check className="w-4 h-4 text-white shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={isLoggedIn ? "/dashboard" : "/register"}>
                <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-full px-8 font-bold gap-2">
                  {isLoggedIn ? "Go to Dashboard" : "Join Free"} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-orange-500 font-bold mb-2">Simple steps</p>
            <h2 className="font-display text-4xl text-foreground">How it works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: Sparkles,   title: "Create a free account",   desc: "Sign up in seconds — no credit card. Just your name, email and password." },
              { step: "02", icon: Download,   title: "Browse & download",       desc: "Explore wallpapers, memes and TikTok videos. One tap downloads anything." },
              { step: "03", icon: Users,      title: "Share & connect",         desc: "Add your social links. Discover other members. Grow your following." },
            ].map(({ step, icon: Icon, title, desc }, i) => (
              <div key={step} className={`relative rounded-2xl overflow-hidden p-8 card-live-${i}`}>
                <div className="text-5xl font-display text-white/20 absolute top-6 right-6">{step}</div>
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-5">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-display text-lg text-white mb-3">{title}</h3>
                <p className="text-white/80 text-sm leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHY CHOOSE US ── */}
        <section className="mb-20">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-blue-500 font-bold mb-2">Reasons to join</p>
            <h2 className="font-display text-4xl text-foreground">Why choose AESTHETICS?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className={`rounded-2xl overflow-hidden p-6 hover:-translate-y-1 transition-transform duration-300 card-live-${i}`}>
                <Icon className="w-8 h-8 mb-4 text-white" />
                <h3 className="font-display text-white text-lg mb-2">{title}</h3>
                <p className="text-white/75 text-xs leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING TEASER ── */}
        <section className="mb-4">
          <div className="rounded-3xl card-live-3 overflow-hidden p-10 text-center max-w-3xl mx-auto">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <h2 className="font-display text-3xl text-white mb-4">Upgrade for unlimited TikTok downloads</h2>
            <p className="text-white/85 text-sm leading-relaxed mb-8 max-w-lg mx-auto font-medium">
              Free users get 10 watermark-free TikTok downloads/month. Upgrade to unlimited for just{" "}
              <span className="text-white font-bold underline decoration-white/50">Ksh 70/month</span>.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {["10 free TikTok downloads/month", "Unlimited wallpaper downloads", "Free meme maker — forever", "Social community — always free"].map(f => (
                <div key={f} className="flex flex-col items-center gap-2 p-3 bg-white/15 rounded-xl border border-white/25 text-sm text-white/90 font-medium">
                  <Check className="w-4 h-4 text-white shrink-0" /> {f}
                </div>
              ))}
            </div>
            {!isLoggedIn ? (
              <Link href="/register">
                <Button size="lg" className="rounded-full px-10 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold">
                  Join Free — Start Today
                </Button>
              </Link>
            ) : (
              <Link href="/pay">
                <Button size="lg" className="rounded-full px-10 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold">
                  Upgrade — Ksh 70/month
                </Button>
              </Link>
            )}
          </div>
        </section>

      </main>

      <Footer />
      <AppInstallPrompt />

      {/* ── Register gate dialog ── */}
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
