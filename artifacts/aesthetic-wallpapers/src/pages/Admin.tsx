import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  useAdminLogin,
  useGetDashboardImages,
  useCreateImage,
  useDeleteImage,
  useGetAdminUsers,
  getGetImagesQueryKey,
  getGetDashboardImagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, Plus, Image as ImageIcon, Loader2, Music, Laugh,
  RefreshCw, Users, LayoutGrid, Search, Settings, CreditCard,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, BarChart3,
  ShieldOff, ShieldCheck, DollarSign, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateMemeImage } from "@/lib/generate-meme";

const CATEGORIES = ["Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes", "Other"];
type ContentType = "wallpaper" | "meme" | "tiktok";

type Section = "overview" | "add" | "landing" | "dashboard" | "memes" | "tiktoks" | "users" | "settings";

const SECTIONS: { id: Section; label: string; icon: React.ElementType; desc: string; color: string; border: string; accent: string }[] = [
  { id: "overview",  label: "Overview",    icon: BarChart3,   desc: "Stats & recent activity",   color: "from-white/5 to-white/[0.02]",       border: "border-white/10",    accent: "text-white/70"    },
  { id: "add",       label: "Add Content", icon: Plus,        desc: "Upload wallpapers, memes, TikToks", color: "from-blue-600/20 to-cyan-600/10",  border: "border-blue-500/20", accent: "text-blue-400"    },
  { id: "landing",   label: "Landing",     icon: LayoutGrid,  desc: "Manage landing images",     color: "from-violet-600/20 to-purple-600/10", border: "border-violet-500/20",accent: "text-violet-400"  },
  { id: "dashboard", label: "Dashboard",   icon: ImageIcon,   desc: "Dashboard wallpapers",      color: "from-cyan-600/20 to-teal-600/10",     border: "border-cyan-500/20", accent: "text-cyan-400"    },
  { id: "memes",     label: "Memes",       icon: Laugh,       desc: "View & delete memes",       color: "from-yellow-600/20 to-amber-600/10",  border: "border-yellow-500/20",accent: "text-yellow-400"  },
  { id: "tiktoks",   label: "TikToks",     icon: Music,       desc: "Manage TikTok gallery",     color: "from-pink-600/20 to-rose-600/10",     border: "border-pink-500/20", accent: "text-pink-400"    },
  { id: "users",     label: "Users",       icon: Users,       desc: "Registered members",        color: "from-green-600/20 to-emerald-600/10", border: "border-green-500/20",accent: "text-green-400"   },
  { id: "settings",  label: "Settings",    icon: Settings,    desc: "Pesapal payment config",    color: "from-orange-600/20 to-amber-600/10",  border: "border-orange-500/20",accent: "text-orange-400"  },
];

export default function Admin() {
  const { token, isAuthenticated, login, logout, isReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [contentType, setContentType] = useState<ContentType>("wallpaper");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [destination, setDestination] = useState("dashboard");
  const [pinterestInput, setPinterestInput] = useState("");
  const [isResolvingPinterest, setIsResolvingPinterest] = useState(false);
  const [memeText, setMemeText] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [tiktokThumbnail, setTiktokThumbnail] = useState("");
  const [tiktokTitle, setTiktokTitle] = useState("");
  const [isResolvingTiktok, setIsResolvingTiktok] = useState(false);

  const [ppKey, setPpKey] = useState("");
  const [ppSecret, setPpSecret] = useState("");
  const [ppSandbox, setPpSandbox] = useState(true);
  const [ppDirectUrl, setPpDirectUrl] = useState("");
  const [ppLoading, setPpLoading] = useState(false);
  const [ppSaved, setPpSaved] = useState(false);
  const [ppError, setPpError] = useState<string | null>(null);
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  type RevenueData = { total: number; completedTotal: number; count: number; completedCount: number; payments: { id: string; email?: string | null; phone?: string | null; amount: number; currency: string; description: string; status: string; createdAt: string }[] };
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [suspendLoading, setSuspendLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localUsers, setLocalUsers] = useState<typeof users>([]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch(`${baseUrl}/api/settings/pesapal`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { pesapalConsumerKey?: string; pesapalConsumerSecret?: string; pesapalSandbox?: boolean; pesapalDirectUrl?: string }) => {
        if (d.pesapalConsumerKey)    setPpKey(d.pesapalConsumerKey);
        if (d.pesapalConsumerSecret) setPpSecret(d.pesapalConsumerSecret);
        if (typeof d.pesapalSandbox === "boolean") setPpSandbox(d.pesapalSandbox);
        if (d.pesapalDirectUrl)      setPpDirectUrl(d.pesapalDirectUrl);
      }).catch(() => {});
  }, [isAuthenticated, token, baseUrl]);

  const savePesapal = async () => {
    setPpLoading(true); setPpError(null); setPpSaved(false);
    try {
      const res = await fetch(`${baseUrl}/api/settings/pesapal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pesapalConsumerKey: ppKey, pesapalConsumerSecret: ppSecret, pesapalSandbox: ppSandbox, pesapalDirectUrl: ppDirectUrl }),
      });
      const d = await res.json() as { success?: boolean; error?: string };
      if (d.success) { setPpSaved(true); setTimeout(() => setPpSaved(false), 3000); }
      else setPpError(d.error || "Save failed.");
    } catch { setPpError("Network error."); }
    finally { setPpLoading(false); }
  };

  const { mutate: doLogin, isPending: isLoggingIn } = useAdminLogin({
    mutation: {
      onSuccess: (data) => { login(data.token); toast({ title: "Welcome back", description: "Authenticated successfully." }); },
      onError: () => { toast({ variant: "destructive", title: "Access Denied", description: "Invalid credentials." }); },
    },
  });

  const { data: allImages = [], isLoading: imagesLoading } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated && !!token },
  });

  const { data: users = [] } = useGetAdminUsers({
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated },
  });

  useEffect(() => { setLocalUsers(users as typeof localUsers); }, [users]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch(`${baseUrl}/api/admin/revenue`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setRevenue(d as RevenueData)).catch(() => {});
  }, [isAuthenticated, token, baseUrl]);

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setSuspendLoading(userId);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${userId}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suspended: suspend }),
      });
      const updated = await res.json() as { id: string; suspended: boolean };
      setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, suspended: updated.suspended } : u));
      toast({ title: suspend ? "User suspended" : "User reinstated", description: suspend ? "User cannot log in." : "User can log in again." });
    } catch { toast({ variant: "destructive", title: "Error", description: "Could not update user." }); }
    finally { setSuspendLoading(null); }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleteLoading(userId);
    try {
      const res = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setLocalUsers(prev => prev.filter(u => u.id !== userId));
      toast({ title: "User deleted", description: "The account has been permanently removed." });
    } catch { toast({ variant: "destructive", title: "Error", description: "Could not delete user." }); }
    finally { setDeleteLoading(null); setConfirmDeleteId(null); }
  };

  const [destLoading, setDestLoading] = useState<string | null>(null);

  const handleToggleLanding = async (imageId: string, currentDest: string) => {
    setDestLoading(imageId);
    const newDest = (currentDest === "landing" || currentDest === "both") ? "dashboard" : "both";
    try {
      await fetch(`${baseUrl}/api/admin/images/${imageId}/destination`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ destination: newDest }),
      });
      invalidateAll();
      toast({ title: newDest === "dashboard" ? "Hidden from landing" : "Visible on landing", description: newDest === "dashboard" ? "Image is now dashboard-only." : "Image is now shown on landing page." });
    } catch { toast({ variant: "destructive", title: "Error", description: "Could not update visibility." }); }
    finally { setDestLoading(null); }
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetImagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardImagesQueryKey() });
  };

  const { mutate: createImage, isPending: isCreating } = useCreateImage({
    request: { headers: { Authorization: `Bearer ${token}` } },
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Content Added", description: "Added to gallery." }); resetForm(); },
      onError: () => { toast({ variant: "destructive", title: "Error", description: "Failed to add content." }); },
    },
  });

  const { mutate: deleteImage, isPending: isDeleting } = useDeleteImage({
    request: { headers: { Authorization: `Bearer ${token}` } },
    mutation: {
      onSuccess: () => { invalidateAll(); toast({ title: "Removed", description: "Deleted successfully." }); },
      onError: () => { toast({ variant: "destructive", title: "Error", description: "Failed to delete." }); },
    },
  });

  const resetForm = () => {
    setUrl(""); setTitle(""); setCategory(CATEGORIES[0]); setDestination("dashboard");
    setPinterestInput(""); setMemeText("");
    setTiktokUrl(""); setTiktokThumbnail(""); setTiktokTitle("");
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); doLogin({ data: { username, password } }); };

  const handleResolvePinterest = async () => {
    if (!pinterestInput) return;
    setIsResolvingPinterest(true);
    try {
      const resp = await fetch(`${baseUrl}/api/images/resolve-pinterest`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pinterestInput }),
      });
      const data = await resp.json() as { imageUrl?: string; error?: string };
      if (data.imageUrl) { setUrl(data.imageUrl); toast({ title: "Resolved!", description: "Pinterest image URL extracted." }); }
      else toast({ variant: "destructive", title: "Failed", description: data.error || "Could not resolve URL." });
    } catch { toast({ variant: "destructive", title: "Error", description: "Network error." }); }
    finally { setIsResolvingPinterest(false); }
  };

  const handleResolveTiktok = async () => {
    if (!tiktokUrl) return;
    setIsResolvingTiktok(true);
    try {
      const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tiktokUrl }),
      });
      const data = await resp.json() as { thumbnail?: string; title?: string; error?: string };
      if (data.thumbnail) {
        setTiktokThumbnail(data.thumbnail); setTiktokTitle(data.title || "TikTok Video");
        setUrl(data.thumbnail); setTitle(data.title || "TikTok Video");
        toast({ title: "TikTok Resolved!" });
      } else toast({ variant: "destructive", title: "Failed", description: data.error || "Could not fetch TikTok info." });
    } catch { toast({ variant: "destructive", title: "Error", description: "Network error." }); }
    finally { setIsResolvingTiktok(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contentType === "meme") {
      if (!memeText.trim()) { toast({ variant: "destructive", title: "Required", description: "Enter meme text first." }); return; }
      const dataUrl = generateMemeImage(memeText.trim());
      createImage({ data: { url: dataUrl, title: memeText.trim().slice(0, 80) || null, category: "Memes", destination, type: "meme", tiktokUrl: null } });
      return;
    }
    if (contentType === "tiktok") {
      if (!tiktokUrl) { toast({ variant: "destructive", title: "Required", description: "Paste a TikTok URL first." }); return; }
      if (!url) {
        setIsResolvingTiktok(true);
        try {
          const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: tiktokUrl }),
          });
          const data = await resp.json() as { thumbnail?: string; title?: string; error?: string };
          if (data.thumbnail) {
            setTiktokThumbnail(data.thumbnail); setTiktokTitle(data.title || "TikTok Video");
            createImage({ data: { url: data.thumbnail, title: data.title || "TikTok Video", category: "TikTok", destination, type: "tiktok", tiktokUrl } });
          } else toast({ variant: "destructive", title: "Failed", description: data.error || "Could not fetch TikTok info." });
        } catch { toast({ variant: "destructive", title: "Error", description: "Network error." }); }
        finally { setIsResolvingTiktok(false); }
        return;
      }
      createImage({ data: { url, title: tiktokTitle || null, category: "TikTok", destination, type: "tiktok", tiktokUrl } });
      return;
    }
    if (!url) { toast({ variant: "destructive", title: "Required", description: "Image URL is required" }); return; }
    createImage({ data: { url, title: title || null, category, destination, type: contentType, tiktokUrl: null } });
  };

  const landingImages  = allImages.filter(i => (i.destination === "landing" || i.destination === "both") && i.type !== "tiktok" && i.type !== "meme");
  const dashboardImages = allImages.filter(i => i.destination === "dashboard" && i.type !== "tiktok" && i.type !== "meme");
  const memeImages     = allImages.filter(i => i.type === "meme");
  const tiktokImages   = allImages.filter(i => i.type === "tiktok");

  const scrollTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(SECTIONS.length - 1, idx));
    const el = sliderRef.current;
    if (!el) return;
    const card = el.children[clamped] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveSlide(clamped);
  };

  const selectSection = (s: Section, idx: number) => {
    setActiveSection(s);
    if (s === "add") resetForm();
    scrollTo(idx);
  };

  if (!isReady) return null;

  // ── Login ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-black">
        <Header />
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-black via-zinc-900 to-black" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md p-8 sm:p-12 glass-card rounded-3xl mx-4">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="font-black text-xl text-white select-none">𝐀</span>
            </div>
            <h1 className="font-display text-4xl text-white mb-3">Admin Portal</h1>
            <p className="text-white/50 text-sm">Enter your credentials to manage the gallery.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Username</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" className="bg-black/40 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-black/40 border-white/10" />
            </div>
            <Button type="submit" className="w-full h-12 text-base mt-4" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl text-white">Admin Studio</h1>
            <p className="text-white/30 text-sm mt-1">Aesthetic Wallpapers — Content Management</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="border-white/10 text-white/60 hover:text-white">
            Sign Out
          </Button>
        </div>

        {/* ── STATS SUMMARY ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Wallpapers", count: allImages.filter(i => i.type !== "meme" && i.type !== "tiktok").length, icon: ImageIcon, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Memes",      count: memeImages.length,     icon: Laugh,      color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
            { label: "TikToks",    count: tiktokImages.length,   icon: Music,      color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20"   },
            { label: "Members",    count: localUsers.length,     icon: Users,      color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20"  },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`rounded-2xl p-5 border flex items-center gap-4 ${stat.bg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">{stat.count}</p>
                  <p className="text-xs text-white/40">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── SLIDABLE SECTION HERO ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-white/30 uppercase tracking-widest">Sections</p>
            <div className="flex items-center gap-2">
              <button onClick={() => scrollTo(activeSlide - 1)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-1">
                {SECTIONS.map((_, i) => (
                  <button key={i} onClick={() => scrollTo(i)}
                    className={cn("h-1.5 rounded-full transition-all duration-300", activeSlide === i ? "bg-white w-4" : "bg-white/20 w-1.5")} />
                ))}
              </div>
              <button onClick={() => scrollTo(activeSlide + 1)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div ref={sliderRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2" style={{ scrollbarWidth: "none" }}>
            {SECTIONS.map((sec, i) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <motion.button key={sec.id} whileTap={{ scale: 0.97 }}
                  onClick={() => selectSection(sec.id, i)}
                  className={cn(
                    "snap-start shrink-0 w-[160px] sm:w-[180px] rounded-2xl border p-5 text-left relative overflow-hidden transition-all duration-200",
                    `bg-gradient-to-br ${sec.color}`, sec.border,
                    isActive ? "ring-1 ring-white/30 shadow-lg scale-[1.02]" : "opacity-70 hover:opacity-100"
                  )}>
                  <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center mb-3 bg-white/5", sec.border)}>
                    <Icon className={cn("w-4 h-4", sec.accent)} />
                  </div>
                  <p className="font-medium text-sm text-white mb-0.5">{sec.label}</p>
                  <p className="text-white/35 text-xs leading-tight">{sec.desc}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── CONTENT PANEL ── */}
        <div className="mt-2">

          {/* Overview */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl text-white">Overview</h2>

              {/* Revenue cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-white/40 uppercase tracking-wider">Total Revenue</p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {revenue ? `Ksh ${(revenue.completedTotal ?? revenue.total ?? 0).toLocaleString()}` : "—"}
                  </p>
                  <p className="text-xs text-white/30 mt-1">{revenue ? `${revenue.completedCount ?? revenue.count ?? 0} completed payments` : "Loading…"}</p>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-white/40 uppercase tracking-wider">All Payments</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{revenue ? (revenue.count ?? 0) : "—"}</p>
                  <p className="text-xs text-white/30 mt-1">{revenue ? `Ksh ${(revenue.total ?? 0).toLocaleString()} pending+completed` : "Loading…"}</p>
                </div>
                <div className="glass-card rounded-2xl p-5 col-span-2 sm:col-span-1 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-violet-400" />
                    <p className="text-xs text-white/40 uppercase tracking-wider">Active Users</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{localUsers.filter((u: { suspended?: boolean }) => !u.suspended).length}</p>
                  <p className="text-xs text-white/30 mt-1">{localUsers.filter((u: { suspended?: boolean }) => u.suspended).length} suspended</p>
                </div>
              </div>

              {/* Recent payments */}
              {revenue && (revenue.payments ?? []).length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Recent Payments</p>
                  <div className="space-y-3">
                    {(revenue.payments ?? []).slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", p.status === "completed" ? "bg-green-400" : "bg-yellow-400")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{p.description || "Payment"}</p>
                          <p className="text-white/30 text-xs">{p.email || p.phone || "—"} · {new Date(p.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={cn("text-xs font-bold shrink-0", p.status === "completed" ? "text-green-400" : "text-yellow-400")}>
                          Ksh {p.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl p-6">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Recent Wallpapers</p>
                  {landingImages.slice(0, 3).map(img => (
                    <div key={img.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/5">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">{img.title ?? "Untitled"}</p>
                        <p className="text-white/30 text-xs">{img.category}</p>
                      </div>
                    </div>
                  ))}
                  {landingImages.length === 0 && <p className="text-white/20 text-sm">No wallpapers yet</p>}
                </div>
                <div className="glass-card rounded-2xl p-6">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Recent Members</p>
                  {localUsers.slice(0, 4).map((u: { id: string; name: string; email: string; createdAt: string }) => (
                    <div key={u.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs text-violet-300 font-bold shrink-0">
                        {(u.name?.[0] ?? u.email[0]).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate">{u.name ?? u.email}</p>
                        <p className="text-white/30 text-xs">{new Date(u.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {localUsers.length === 0 && <p className="text-white/20 text-sm">No members yet</p>}
                </div>
              </div>
            </div>
          )}

          {/* Add Content */}
          {activeSection === "add" && (
            <div className="max-w-xl">
              <h2 className="font-display text-2xl text-white mb-6">Add Content</h2>
              <div className="glass-card rounded-2xl p-6">
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {([
                    { id: "wallpaper" as ContentType, label: "Wallpaper", icon: ImageIcon },
                    { id: "meme"      as ContentType, label: "Meme",      icon: Laugh    },
                    { id: "tiktok"    as ContentType, label: "TikTok",    icon: Music    },
                  ] as const).map(t => {
                    const Icon = t.icon;
                    return (
                      <button key={t.id} onClick={() => { setContentType(t.id); resetForm(); }}
                        className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200",
                          contentType === t.id ? "bg-white text-black border-white" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white")}>
                        <Icon className="w-4 h-4" /> {t.label}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {contentType === "tiktok" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">TikTok URL</label>
                        <div className="flex gap-2">
                          <Input value={tiktokUrl} onChange={e => setTiktokUrl(e.target.value)}
                            placeholder="https://www.tiktok.com/@user/video/..." className="flex-1 text-xs" />
                          <Button type="button" size="icon" variant="secondary"
                            onClick={handleResolveTiktok} disabled={isResolvingTiktok || !tiktokUrl} className="shrink-0">
                            {isResolvingTiktok ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {tiktokThumbnail && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-white/5 relative">
                          <img src={tiktokThumbnail} alt="thumbnail" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                              <Music className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">Title</label>
                        <Input value={tiktokTitle} onChange={e => setTiktokTitle(e.target.value)} placeholder="TikTok title" />
                      </div>
                    </>
                  )}

                  {contentType === "meme" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">Meme Text</label>
                        <textarea value={memeText} onChange={e => setMemeText(e.target.value)}
                          placeholder="Type your meme here…" rows={4}
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none" />
                        <p className="text-xs text-white/30">Auto-generates a black background + white text image</p>
                      </div>
                      {memeText.trim() && (
                        <div className="rounded-xl overflow-hidden aspect-square bg-black border border-white/10 flex items-center justify-center p-4">
                          <p className="text-white text-center leading-tight break-words"
                            style={{ fontSize: memeText.length > 120 ? "11px" : memeText.length > 70 ? "14px" : memeText.length > 35 ? "18px" : "24px",
                              fontFamily: "Impact, Arial Black, sans-serif", wordBreak: "break-word",
                              WebkitTextStroke: "0.5px #000",
                              textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000" }}>
                            {memeText}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {contentType === "wallpaper" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">Pinterest URL</label>
                        <div className="flex gap-2">
                          <Input value={pinterestInput} onChange={e => setPinterestInput(e.target.value)}
                            placeholder="https://pin.it/... or pinterest.com/..." className="flex-1 text-xs" />
                          <Button type="button" size="icon" variant="secondary"
                            onClick={handleResolvePinterest} disabled={isResolvingPinterest || !pinterestInput} className="shrink-0">
                            {isResolvingPinterest ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-white/30">Or paste a direct image URL below</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">Image URL</label>
                        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://images.unsplash.com/..." />
                      </div>
                      {url && (
                        <div className="rounded-xl overflow-hidden aspect-video bg-white/5">
                          <img src={url} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">Title (Optional)</label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="My favourite wallpaper" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)}
                          className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground focus:outline-none appearance-none">
                          {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-neutral-900">{cat}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-white/50 uppercase tracking-wider">Show On</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ val: "landing", label: "Landing" }, { val: "dashboard", label: "Dashboard" }, { val: "both", label: "Both" }].map(d => (
                        <button key={d.val} type="button" onClick={() => setDestination(d.val)}
                          className={cn("py-2 text-xs rounded-lg border transition-all duration-200",
                            destination === d.val ? "bg-white text-black border-white font-semibold" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10")}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" className="w-full mt-2"
                    disabled={isCreating || isResolvingTiktok || (contentType === "tiktok" ? !tiktokUrl : contentType === "meme" ? !memeText.trim() : !url)}>
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${contentType === "tiktok" ? "TikTok" : contentType === "meme" ? "Meme" : "Wallpaper"}`}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* Landing */}
          {activeSection === "landing" && (
            <div>
              <h2 className="font-display text-2xl text-white mb-2">Landing Page Images</h2>
              <p className="text-white/30 text-sm mb-6">Toggle visibility to show/hide images on the public landing page.</p>
              {(() => {
                const landingAll = allImages.filter(i => i.type !== "tiktok" && i.type !== "meme");
                if (imagesLoading) {
                  return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass-card rounded-xl p-4 h-24 animate-pulse bg-white/5" />)}</div>;
                }
                if (landingAll.length === 0) {
                  return <div className="h-32 flex items-center justify-center glass-card rounded-2xl text-white/30 text-sm">No wallpapers yet.</div>;
                }
                return (
                  <div className="space-y-3">
                    {landingAll.map(img => {
                      const isOnLanding = img.destination === "landing" || img.destination === "both";
                      return (
                        <motion.div key={img.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          className={cn("glass-card rounded-xl p-4 flex items-center gap-4 group transition-colors", !isOnLanding && "opacity-50")}>
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white/5">
                            <img src={img.url} alt={img.title || ""} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm truncate">{img.title || "Untitled"}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{img.category}</span>
                              <span className={cn("text-xs px-2 py-0.5 rounded font-medium", isOnLanding ? "text-green-400 bg-green-500/10" : "text-white/30 bg-white/5")}>
                                {isOnLanding ? "Visible on landing" : "Hidden (dashboard only)"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleLanding(img.id, img.destination ?? "landing")}
                              disabled={destLoading === img.id}
                              title={isOnLanding ? "Hide from landing" : "Show on landing"}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                isOnLanding
                                  ? "bg-white/5 text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border-white/10"
                                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20"
                              )}
                            >
                              {destLoading === img.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : isOnLanding
                                  ? <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                                  : <><Eye className="w-3.5 h-3.5" /> Show</>
                              }
                            </button>
                            <Button variant="ghost" size="icon"
                              className="text-white/25 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteImage({ id: img.id })} disabled={isDeleting}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <div>
              <h2 className="font-display text-2xl text-white mb-6">Dashboard Images</h2>
              {imagesLoading
                ? <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="glass-card rounded-xl p-4 h-20 animate-pulse bg-white/5" />)}</div>
                : <ImageList images={dashboardImages} label="Dashboard" onDelete={id => deleteImage({ id })} isDeleting={isDeleting} />}
            </div>
          )}

          {/* Memes */}
          {activeSection === "memes" && (
            <div>
              <h2 className="font-display text-2xl text-white mb-6">Meme Gallery</h2>
              {imagesLoading
                ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card rounded-xl p-4 h-20 animate-pulse bg-white/5" />)}</div>
                : <ImageList images={memeImages} label="Memes" onDelete={id => deleteImage({ id })} isDeleting={isDeleting} badge="😂" />}
            </div>
          )}

          {/* TikToks */}
          {activeSection === "tiktoks" && (
            <div>
              <h2 className="font-display text-2xl text-white mb-6">TikTok Gallery</h2>
              {imagesLoading
                ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-xl bg-white/5 animate-pulse aspect-[9/16]" />)}</div>
                : <TikTokList images={tiktokImages} onDelete={id => deleteImage({ id })} isDeleting={isDeleting} />}
            </div>
          )}

          {/* Users */}
          {activeSection === "users" && (
            <div>
              <h2 className="font-display text-2xl text-white mb-2">Registered Members</h2>
              <p className="text-white/30 text-sm mb-6">{localUsers.length} members · Suspend to block login · Delete to permanently remove</p>
              {localUsers.length === 0 ? (
                <div className="h-32 flex items-center justify-center glass-card rounded-2xl text-white/30 text-sm">No members yet.</div>
              ) : (
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden sm:table-cell">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider hidden md:table-cell">Joined</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {localUsers.map((user: { id: string; name: string; email: string; suspended?: boolean; createdAt: string }) => (
                        <tr key={user.id} className={cn("hover:bg-white/[0.02] transition-colors", user.suspended && "opacity-50")}>
                          <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                          <td className="px-6 py-4 text-white/60 hidden sm:table-cell">{user.email}</td>
                          <td className="px-6 py-4 text-white/40 text-sm hidden md:table-cell">{new Date(user.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            {user.suspended
                              ? <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">Suspended</span>
                              : <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">Active</span>
                            }
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Suspend / Reinstate */}
                              <button
                                onClick={() => handleSuspend(user.id, !user.suspended)}
                                disabled={suspendLoading === user.id}
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                  user.suspended
                                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                                    : "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20"
                                )}
                              >
                                {suspendLoading === user.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : user.suspended
                                    ? <><ShieldCheck className="w-3 h-3" /> Reinstate</>
                                    : <><ShieldOff className="w-3 h-3" /> Suspend</>
                                }
                              </button>

                              {/* Delete — two-step confirm */}
                              {confirmDeleteId === user.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={deleteLoading === user.id}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-500 transition-colors border border-red-500"
                                  >
                                    {deleteLoading === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1.5 rounded-lg text-xs text-white/40 hover:text-white transition-colors border border-white/10"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(user.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeSection === "settings" && (
            <div className="max-w-xl">
              <h2 className="font-display text-2xl text-white mb-6">Pesapal Settings</h2>
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Pesapal Payment Gateway</p>
                    <p className="text-white/35 text-xs">Configure your merchant credentials</p>
                  </div>
                </div>
                {/* Direct Payment URL — priority method */}
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-[10px] font-bold">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-300">Direct Payment Link <span className="text-orange-400/70 font-normal text-xs">(recommended — no API setup needed)</span></p>
                      <p className="text-xs text-white/40 mt-0.5">Paste your Pesapal "Pay by Link" URL here. It opens directly in the payment window — no credentials required.</p>
                    </div>
                  </div>
                  <Input
                    value={ppDirectUrl}
                    onChange={e => setPpDirectUrl(e.target.value)}
                    placeholder="https://pay.pesapal.com/checkout/link/..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono text-xs"
                  />
                  <p className="text-[11px] text-white/30">From your Pesapal dashboard → Pay by Link → Create Link (set amount to Ksh 70) → Copy Link.</p>
                </div>

                {/* API Credentials — fallback method */}
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white/60 text-[10px] font-bold">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/70">API Credentials <span className="text-white/30 font-normal text-xs">(fallback — requires valid keys)</span></p>
                      <p className="text-xs text-white/30 mt-0.5">Used only if no Direct Link is set above.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Consumer Key</label>
                    <Input value={ppKey} onChange={e => setPpKey(e.target.value)} placeholder="Your Pesapal consumer key"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Consumer Secret</label>
                    <Input type="password" value={ppSecret} onChange={e => setPpSecret(e.target.value)} placeholder="Your Pesapal consumer secret"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono text-sm" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm text-white font-medium">Sandbox mode <span className="text-orange-400 text-xs font-normal">(recommended ON)</span></p>
                      <p className="text-xs text-white/35">Keep ON — live endpoint has geo-restrictions</p>
                    </div>
                    <button onClick={() => setPpSandbox(v => !v)}
                      className={cn("relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center", ppSandbox ? "bg-orange-500" : "bg-white/20")}>
                      <span className={cn("absolute w-4 h-4 rounded-full bg-white shadow transition-all duration-300", ppSandbox ? "left-6" : "left-1")} />
                    </button>
                  </div>
                </div>
                {ppError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {ppError}
                  </div>
                )}
                {ppSaved && (
                  <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" /> Settings saved successfully!
                  </div>
                )}
                <Button className="w-full bg-orange-600 hover:bg-orange-500" disabled={ppLoading} onClick={savePesapal}>
                  {ppLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : "Save Payment Settings"}
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

function ImageList({ images, label, onDelete, isDeleting, badge }: {
  images: { id: string; url: string; title?: string | null; category?: string; destination?: string }[];
  label: string; onDelete: (id: string) => void; isDeleting: boolean; badge?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-white/40 text-xs">{images.length} {label.toLowerCase()}</p>
      {images.length === 0 ? (
        <div className="h-32 flex items-center justify-center glass-card rounded-2xl text-white/30 text-sm">Nothing here yet.</div>
      ) : images.map(img => (
        <motion.div key={img.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl p-4 flex items-center gap-4 group hover:bg-white/[0.07] transition-colors">
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white/5 relative">
            <img src={img.url} alt={img.title || ""} className="w-full h-full object-cover" />
            {badge && <span className="absolute top-1 left-1 text-xs">{badge}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm truncate">{img.title || "Untitled"}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{img.category}</span>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded">{img.destination}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon"
            className="shrink-0 text-white/25 hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(img.id)} disabled={isDeleting}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

function TikTokList({ images, onDelete, isDeleting }: {
  images: { id: string; url: string; title?: string | null; tiktokUrl?: string | null }[];
  onDelete: (id: string) => void; isDeleting: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-white/40 text-xs">{images.length} TikTok {images.length === 1 ? "video" : "videos"}</p>
      {images.length === 0 ? (
        <div className="h-32 flex items-center justify-center glass-card rounded-2xl text-white/30 text-sm">No TikToks yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-[9/16] bg-white/5">
              <img src={img.url} alt={img.title || "TikTok"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-white text-xs truncate font-medium">{img.title || "TikTok"}</p>
                {img.tiktokUrl && (
                  <a href={img.tiktokUrl} target="_blank" rel="noopener noreferrer"
                    className="text-pink-300 text-xs hover:underline">View original</a>
                )}
              </div>
              <button onClick={() => onDelete(img.id)} disabled={isDeleting}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-black/80 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
