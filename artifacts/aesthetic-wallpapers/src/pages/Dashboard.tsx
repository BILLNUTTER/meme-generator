import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ImageIcon, Music, Download, Laugh, Wand2,
  Link2, Loader2, AlertCircle, Zap, Crown, LogOut, MessageCircle,
  CheckCircle2, CalendarDays, Plus, Trash2, Globe, Instagram,
  Youtube, Facebook, Twitter, Users, ExternalLink, TrendingUp, UserPlus,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContentViewer } from "@/components/ContentViewer";
import { AppInstallPrompt } from "@/components/AppInstallPrompt";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useGetDashboardImages } from "@workspace/api-client-react";
type Image = { id: string; url: string; title?: string | null; category: string; type: string; thumbnail?: string | null; destination: string; tiktokUrl?: string | null; createdAt: string; };
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FREE_LIMIT = 10;
function getQuota() {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  try {
    const raw = localStorage.getItem("tiktok-dl-quota");
    if (raw) { const p = JSON.parse(raw); if (p.month === month) return p; }
  } catch {}
  return { count: 0, month };
}
function incrementQuota() {
  const q = getQuota(); q.count += 1;
  localStorage.setItem("tiktok-dl-quota", JSON.stringify(q));
  return q;
}
function fmtExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

const PLATFORMS = [
  "Instagram","TikTok","Twitter/X","YouTube","Facebook",
  "Snapchat","Pinterest","LinkedIn","WhatsApp","Telegram","Threads","BeReal","Other",
];
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  Instagram, TikTok: Music, "Twitter/X": Twitter, YouTube: Youtube,
  Facebook, WhatsApp: MessageCircle, Telegram: MessageCircle,
};
function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe;
  return <Icon className={className ?? "w-4 h-4"} />;
}
function platformColor(platform: string): string {
  const map: Record<string, string> = {
    Instagram: "text-pink-500", TikTok: "text-black", "Twitter/X": "text-sky-500",
    YouTube: "text-red-500", Facebook: "text-blue-600", WhatsApp: "text-green-500",
    Telegram: "text-sky-400", Snapchat: "text-yellow-400", Pinterest: "text-red-600",
    LinkedIn: "text-blue-700", Threads: "text-black", BeReal: "text-black",
  };
  return map[platform] ?? "text-violet-500";
}

interface SocialLink { id: string; platform: string; url: string; username?: string; created_at: string; }
interface CommunityLink extends SocialLink { user_name: string; user_id: string; }
interface Member { id: string; name: string; top_platform: string; top_url: string; top_username: string; link_count: string; }

const SERVICES = [
  { id: "wallpapers", label: "Wallpapers", desc: "Browse aesthetic collections", icon: ImageIcon, color: "from-blue-100 to-cyan-50", border: "border-blue-200", iconBg: "bg-blue-100", accent: "text-blue-600", href: "/wallpapers" },
  { id: "tiktoks", label: "TikTok Gallery", desc: "Watch curated videos", icon: Music, color: "from-pink-100 to-rose-50", border: "border-pink-200", iconBg: "bg-pink-100", accent: "text-pink-600", href: "/tiktoks" },
  { id: "tiktok-download", label: "TikTok Download", desc: "No watermark · HD quality", icon: Download, color: "from-orange-100 to-amber-50", border: "border-orange-200", iconBg: "bg-orange-100", accent: "text-orange-600", href: "/tiktok-download" },
  { id: "memes", label: "Meme Gallery", desc: "Browse fresh memes daily", icon: Laugh, color: "from-yellow-100 to-amber-50", border: "border-yellow-200", iconBg: "bg-yellow-100", accent: "text-yellow-600", href: "/memes" },
  { id: "meme-maker", label: "Meme Maker", desc: "Create your own — always free", icon: Wand2, color: "from-green-100 to-emerald-50", border: "border-green-200", iconBg: "bg-green-100", accent: "text-green-600", href: "/meme-maker" },
];

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated, user, logout } = useUserAuth();
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [viewerItems, setViewerItems] = useState<Image[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // TikTok downloader
  const [tkUrl, setTkUrl] = useState("");
  const [tkLoading, setTkLoading] = useState(false);
  const [tkResult, setTkResult] = useState<{ downloadUrl: string; title: string; thumbnail: string } | null>(null);
  const [tkError, setTkError] = useState<string | null>(null);
  const [quota, setQuota] = useState(getQuota());
  const [dlProgress, setDlProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Subscription
  const [tiktokActive, setTiktokActive] = useState(false);
  const [tiktokExpiry, setTiktokExpiry] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [tiktokPaidMode, setTiktokPaidMode] = useState(false);

  // Social links
  const [myLinks, setMyLinks] = useState<SocialLink[]>([]);
  const [communityLinks, setCommunityLinks] = useState<CommunityLink[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newPlatform, setNewPlatform] = useState(PLATFORMS[0]);
  const [newUrl, setNewUrl] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [socialTab, setSocialTab] = useState<"mine" | "community">("mine");

  const token = localStorage.getItem("userToken");

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch(`${baseUrl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { tiktokActive?: boolean; tiktokExpiry?: string | null }) => {
        setTiktokActive(!!d.tiktokActive);
        setTiktokExpiry(d.tiktokExpiry ?? null);
      })
      .catch(() => {})
      .finally(() => setSubLoading(false));
    fetch(`${baseUrl}/api/settings`)
      .then(r => r.json())
      .then((d: { tiktokPaidMode?: boolean }) => setTiktokPaidMode(!!d.tiktokPaidMode))
      .catch(() => {});
    fetch(`${baseUrl}/api/social-links`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setMyLinks).catch(() => {});
    fetch(`${baseUrl}/api/community/social-links`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setCommunityLinks).catch(() => {});
    fetch(`${baseUrl}/api/community/members`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setMembers).catch(() => {});
  }, [isAuthenticated, token, baseUrl]);

  const { data, isLoading: picksLoading } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated && !!token, staleTime: 5 * 60 * 1000, queryKey: ["dashboard-images"] },
  } as any);
  const picks = (data ?? []).slice(0, 8);

  const remaining = Math.max(0, FREE_LIMIT - quota.count);
  const exhausted = tiktokPaidMode && !tiktokActive && remaining <= 0;

  const handleTkFetch = async () => {
    if (!tkUrl.trim() || exhausted) return;
    setTkError(null); setTkResult(null); setTkLoading(true);
    try {
      const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: tkUrl }),
      });
      const d = await resp.json() as { downloadUrl?: string; thumbnail?: string; title?: string; error?: string };
      if (d.downloadUrl) {
        setTkResult({ downloadUrl: d.downloadUrl, title: d.title ?? "TikTok", thumbnail: d.thumbnail ?? "" });
        setQuota(incrementQuota());
      } else { setTkError(d.error ?? "Could not fetch this TikTok."); }
    } catch { setTkError("Network error. Please try again."); }
    finally { setTkLoading(false); }
  };

  const handleTkDownload = async () => {
    if (!tkResult) return;
    setIsDownloading(true); setDlProgress(0);
    try {
      const resp = await fetch(`${baseUrl}/api/images/download-proxy?url=${encodeURIComponent(tkResult.downloadUrl)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok || !resp.body) throw new Error();
      const len = Number(resp.headers.get("Content-Length") ?? "0");
      const reader = resp.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); received += value.length;
        if (len > 0) setDlProgress(Math.round((received / len) * 100));
      }
      const blob = new Blob(chunks as BlobPart[], { type: "video/mp4" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `${tkResult.title.slice(0, 40)}.mp4`; a.click();
    } catch { setTkError("Download failed. Try again."); }
    finally { setIsDownloading(false); setDlProgress(0); }
  };

  const handleAddLink = async () => {
    if (!newUrl.trim()) { setLinkError("Please enter a URL"); return; }
    setLinkSaving(true); setLinkError(null);
    try {
      const resp = await fetch(`${baseUrl}/api/social-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ platform: newPlatform, url: newUrl.trim(), username: newUsername.trim() || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) { setLinkError(data.error ?? "Failed to save"); return; }
      setMyLinks(prev => [...prev.filter(l => l.platform !== newPlatform), data]);
      setNewUrl(""); setNewUsername("");
    } catch { setLinkError("Network error"); }
    finally { setLinkSaving(false); }
  };

  const handleDeleteLink = async (id: string) => {
    await fetch(`${baseUrl}/api/social-links/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    setMyLinks(prev => prev.filter(l => l.id !== id));
  };

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-background">
      <Header />
      <AppInstallPrompt />

      {viewerIndex !== null && viewerItems.length > 0 && (
        <ContentViewer items={viewerItems} startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)} baseUrl={baseUrl} token={token} />
      )}

      {isDownloading && dlProgress > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-foreground/15 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl min-w-[220px]">
          <div className="w-32 h-1.5 rounded-full bg-foreground/15">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${dlProgress}%` }} />
          </div>
          <span className="text-xs text-foreground/70 font-bold">{dlProgress}%</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">

        {/* ── Welcome bar ── */}
        <div className="pt-10 pb-6 flex items-center justify-between">
          <div>
            <p className="text-foreground/55 text-sm font-semibold">Welcome back</p>
            <h1 className="font-display text-3xl text-foreground">{user?.name ?? "Member"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 px-3 py-2 rounded-xl border border-green-200 bg-green-50 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <button onClick={() => { logout(); setLocation("/"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground/55 hover:text-foreground px-3 py-2 rounded-xl border border-foreground/10 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>

        {/* ── Subscription status ── */}
        {!subLoading && (
          <div className="mb-8">
            {tiktokActive ? (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Premium Active</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <CalendarDays className="w-3 h-3 text-foreground/40" />
                    <p className="text-xs text-foreground/60 font-medium">
                      Expires {tiktokExpiry ? fmtExpiry(tiktokExpiry) : "—"} · Unlimited TikTok downloads
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-100 border border-yellow-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-xs font-bold text-yellow-700">Unlimited</span>
                </div>
              </motion.div>
            ) : !tiktokPaidMode ? (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">TikTok Free Mode</p>
                  <p className="text-xs text-foreground/60 mt-0.5 font-medium">Downloads are free for everyone right now — no limits</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs font-bold text-green-700">Free</span>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-foreground/10 bg-white px-5 py-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Free Plan</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-foreground/10 max-w-[120px]">
                      <div className={cn("h-full rounded-full transition-all", remaining === 0 ? "bg-red-500" : remaining <= 3 ? "bg-orange-400" : "bg-green-500")}
                        style={{ width: `${Math.min(100, (quota.count / FREE_LIMIT) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-foreground/55 font-semibold">{quota.count}/{FREE_LIMIT} TikTok downloads used</p>
                  </div>
                </div>
                <Button size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold" onClick={() => setLocation("/pay")}>
                  Upgrade Ksh 70
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── QUICK ACCESS (Social Media Boost FIRST, glowing) ── */}
        <div className="mb-10">
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-4">Quick Access</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            {/* Social Media Boost — FIRST, glowing */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setSocialTab("mine")}
              style={{ gridColumn: "span 1" }}
              className={cn(
                "relative rounded-2xl border-2 border-orange-400 p-4 text-left overflow-hidden transition-all",
                "bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300",
                "shadow-[0_0_24px_rgba(249,115,22,0.45)] hover:shadow-[0_0_36px_rgba(249,115,22,0.65)]"
              )}
            >
              {/* Animated glow pulse */}
              <div className="absolute inset-0 rounded-2xl animate-pulse bg-white/10 pointer-events-none" />
              <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <p className="font-display text-sm text-white mb-0.5 drop-shadow-sm">Social Boost</p>
              <p className="text-white/80 text-xs font-semibold">Share &amp; grow your reach</p>
              <span className="absolute top-2 right-2 text-[9px] font-black bg-white text-orange-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">🔥 Hot</span>
            </motion.button>

            {/* Regular services */}
            {SERVICES.map((svc) => {
              const Icon = svc.icon;
              return (
                <motion.button key={svc.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setLocation(svc.href)}
                  className={cn("rounded-2xl border p-4 text-left bg-gradient-to-br transition-shadow hover:shadow-md", svc.color, svc.border)}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", svc.iconBg)}>
                    <Icon className={cn("w-4 h-4", svc.accent)} />
                  </div>
                  <p className="font-display text-sm text-foreground mb-0.5">{svc.label}</p>
                  <p className="text-foreground/55 text-xs font-medium">{svc.desc}</p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── TODAY'S PICKS — two-column layout ── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-foreground">Today's Picks</h2>
            <button onClick={() => setLocation("/wallpapers")} className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors">View all →</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT column — Members to follow (scrollable) */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-bold text-foreground">Members to follow</p>
                <span className="text-xs text-foreground/40 font-medium ml-auto">{members.length} online</span>
              </div>
              <div className="flex-1 rounded-2xl border border-violet-100 bg-white overflow-hidden shadow-sm">
                {members.length === 0 ? (
                  <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-violet-300" />
                    </div>
                    <p className="text-sm font-semibold text-foreground/50">No members yet</p>
                    <p className="text-xs text-foreground/35 font-medium">Be the first to add your social links!</p>
                    <button onClick={() => setSocialTab("mine")}
                      className="mt-1 text-xs font-bold text-violet-600 border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors">
                      Add my links →
                    </button>
                  </div>
                ) : (
                  <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                    {members.map((member, i) => (
                      <motion.div key={member.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-4 py-3 border-b border-foreground/5 last:border-0 hover:bg-violet-50/50 transition-colors group">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{member.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={cn("w-3 h-3", platformColor(member.top_platform))}>
                              <PlatformIcon platform={member.top_platform} className="w-3 h-3" />
                            </span>
                            <p className="text-xs text-foreground/50 font-medium truncate">
                              {member.top_username || member.top_platform}
                            </p>
                            {Number(member.link_count) > 1 && (
                              <span className="ml-1 text-[10px] text-foreground/35 font-semibold">+{Number(member.link_count) - 1} more</span>
                            )}
                          </div>
                        </div>
                        <a href={member.top_url} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs font-bold text-violet-600 border border-violet-200 px-2.5 py-1 rounded-lg bg-white hover:bg-violet-50">
                          <ExternalLink className="w-3 h-3" /> Follow
                        </a>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT column — Image picks grid */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-bold text-foreground">Latest content</p>
              </div>
              {picksLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-foreground/5 animate-pulse aspect-square" />
                  ))}
                </div>
              ) : picks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {picks.slice(0, 6).map((img, i) => {
                    const typeLabel = img.type === "meme" ? "Meme" : img.type === "tiktok" ? "TikTok" : "Wallpaper";
                    const badgeColor = img.type === "meme" ? "bg-yellow-100 text-yellow-700" : img.type === "tiktok" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";
                    return (
                      <motion.div key={img.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="rounded-2xl overflow-hidden relative group cursor-pointer aspect-square bg-foreground/5 active:scale-95 transition-transform shadow-sm"
                        onClick={() => { setViewerItems(picks); setViewerIndex(i); }}>
                        <img src={img.thumbnail ?? img.url} alt={img.title ?? typeLabel}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                          <p className="text-white font-semibold text-xs truncate">{img.title ?? img.category}</p>
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-bold ${badgeColor}`}>{typeLabel}</div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 min-h-[320px] flex items-center justify-center text-foreground/40 text-sm bg-white border border-foreground/10 rounded-2xl font-medium">
                  Content coming soon!
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── TikTok Downloader ── */}
        <div className="mb-10">
          <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-600 text-xs font-bold mb-3">
                  <Zap className="w-3 h-3" /> Watermark-free
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-1">TikTok Downloader</h2>
                <p className="text-foreground/60 text-sm font-medium">Paste any TikTok link and download the original HD video — no watermark.</p>
              </div>
              <button onClick={() => setLocation("/tiktok-download")}
                className="shrink-0 text-xs font-bold text-orange-600 hover:text-orange-700 border border-orange-200 bg-white px-4 py-2 rounded-xl transition-colors">
                Full page →
              </button>
            </div>

            {tiktokActive ? (
              <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-white px-4 py-3 mb-5">
                <Crown className="w-4 h-4 text-yellow-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Premium — Unlimited downloads</p>
                  <p className="text-xs text-foreground/55 font-medium">{tiktokExpiry ? `Expires ${fmtExpiry(tiktokExpiry)}` : "Active subscription"}</p>
                </div>
                <span className="text-xs font-bold text-yellow-700 px-2 py-1 rounded-lg bg-yellow-100">∞</span>
              </div>
            ) : exhausted ? (
              <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-4 mb-5">
                <Crown className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Monthly limit reached — {FREE_LIMIT}/{FREE_LIMIT} used</p>
                  <p className="text-xs text-foreground/55 font-medium">Upgrade for unlimited · Resets next month</p>
                </div>
                <Button size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold" onClick={() => setLocation("/pay")}>
                  Upgrade Ksh 70
                </Button>
              </div>
            ) : (
              <p className="text-xs font-semibold text-foreground/60 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {remaining} free {remaining === 1 ? "download" : "downloads"} left this month
              </p>
            )}

            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                <Input value={tkUrl} onChange={e => { setTkUrl(e.target.value); setTkError(null); setTkResult(null); }}
                  onKeyDown={e => e.key === "Enter" && handleTkFetch()}
                  placeholder="https://www.tiktok.com/@user/video/..."
                  disabled={exhausted || tkLoading}
                  className="pl-9 bg-white border-foreground/20 h-12 font-medium" />
              </div>
              <Button onClick={handleTkFetch} disabled={!tkUrl.trim() || exhausted || tkLoading}
                className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white h-12 px-6 font-bold">
                {tkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>

            {tkError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" /> {tkError}
              </div>
            )}

            {tkResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-foreground/10 bg-white p-4 flex items-center gap-4 shadow-sm">
                {tkResult.thumbnail && (
                  <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-foreground/5">
                    <img src={tkResult.thumbnail} alt="thumb" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-bold line-clamp-1 mb-1">{tkResult.title}</p>
                  <p className="text-foreground/50 text-xs mb-3 font-medium">HD · No watermark</p>
                  <Button onClick={handleTkDownload} disabled={isDownloading} size="sm"
                    className="bg-orange-500 hover:bg-orange-400 text-white font-bold gap-2">
                    {isDownloading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {dlProgress > 0 ? `${dlProgress}%` : "…"}</> : <><Download className="w-3.5 h-3.5" /> Download MP4</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Social Links ── */}
        <div className="mb-10">
          <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-foreground">Social Links</h2>
                <p className="text-foreground/60 text-sm font-medium">Share your profiles — others can find and follow you</p>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {(["mine", "community"] as const).map(tab => (
                <button key={tab} onClick={() => setSocialTab(tab)}
                  className={cn("px-4 py-2 rounded-full text-sm font-bold transition-all",
                    socialTab === tab ? "bg-violet-500 text-white shadow-md" : "bg-white border border-violet-200 text-foreground/60 hover:text-foreground")}>
                  {tab === "mine" ? `My Links (${myLinks.length})` : `Community (${communityLinks.length})`}
                </button>
              ))}
            </div>

            {socialTab === "mine" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-violet-100 p-4">
                  <p className="text-xs font-bold text-foreground/60 uppercase tracking-widest mb-3">Add or update a link</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-foreground/15 bg-white text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300">
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                      placeholder="https://instagram.com/yourname"
                      className="bg-white border-foreground/15 font-medium" />
                    <Input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                      placeholder="@username (optional)"
                      className="bg-white border-foreground/15 font-medium" />
                  </div>
                  {linkError && <p className="text-red-500 text-xs font-semibold mb-2">{linkError}</p>}
                  <Button onClick={handleAddLink} disabled={linkSaving}
                    className="bg-violet-500 hover:bg-violet-600 text-white font-bold gap-2">
                    {linkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Save Link</>}
                  </Button>
                </div>

                {myLinks.length === 0 ? (
                  <div className="text-center py-8 text-foreground/40 font-medium text-sm bg-white rounded-2xl border border-violet-100">
                    No links yet — add your first social profile above
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {myLinks.map(link => (
                      <div key={link.id} className="flex items-center gap-3 bg-white rounded-2xl border border-violet-100 px-4 py-3">
                        <div className={cn("w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0", platformColor(link.platform))}>
                          <PlatformIcon platform={link.platform} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">{link.platform}</p>
                          {link.username && <p className="text-xs text-foreground/55 font-medium">{link.username}</p>}
                          <a href={link.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-violet-600 hover:text-violet-700 truncate block font-semibold">{link.url}</a>
                        </div>
                        <button onClick={() => handleDeleteLink(link.id)}
                          className="text-foreground/30 hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {socialTab === "community" && (
              <div>
                {communityLinks.length === 0 ? (
                  <div className="text-center py-8 text-foreground/40 font-medium text-sm bg-white rounded-2xl border border-violet-100">
                    No community links yet — be the first to add yours!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {communityLinks.map(link => (
                      <div key={link.id} className="flex items-center gap-3 bg-white rounded-2xl border border-violet-100 px-4 py-3">
                        <div className={cn("w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0", platformColor(link.platform))}>
                          <PlatformIcon platform={link.platform} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-violet-600">{link.platform}</p>
                          <p className="text-sm font-bold text-foreground truncate">{link.user_name}</p>
                          {link.username && <p className="text-xs text-foreground/55 font-medium">{link.username}</p>}
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-violet-500 hover:text-violet-600 transition-colors p-1">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Meme Maker card ── */}
        <div className="mb-10">
          <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-bold mb-3">
                  <CheckCircle2 className="w-3 h-3" /> Always free · No limits
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-2">Meme Maker</h2>
                <p className="text-foreground/60 text-sm font-medium max-w-lg">
                  Create custom memes with your text in seconds — Impact font, 1080×800. Download instantly, completely free.
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={() => setLocation("/meme-maker")}
                className="shrink-0 flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-colors">
                <Wand2 className="w-4 h-4" /> Create Meme
              </motion.button>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
