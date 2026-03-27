import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ImageIcon, Music, Download, Laugh, Wand2,
  Link2, Loader2, AlertCircle, Zap, Crown, LogOut, MessageCircle,
  CheckCircle2, CalendarDays, Plus, Trash2, Globe, Instagram,
  Youtube, Facebook, Twitter, Users, ExternalLink, TrendingUp,
  UserCheck, X, ChevronRight,
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

/* ── helpers ── */
const FREE_LIMIT = 10;
function getQuota() {
  const now = new Date();
  const month = `${now.getFullYear()}-${now.getMonth()}`;
  try { const p = JSON.parse(localStorage.getItem("tiktok-dl-quota") ?? "{}"); if (p.month === month) return p; } catch {}
  return { count: 0, month };
}
function incrementQuota() { const q = getQuota(); q.count += 1; localStorage.setItem("tiktok-dl-quota", JSON.stringify(q)); return q; }
function fmtExpiry(iso: string) { return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }); }
function getFollowed(): string[] { try { return JSON.parse(localStorage.getItem("followed-members") ?? "[]"); } catch { return []; } }
function saveFollowed(ids: string[]) { localStorage.setItem("followed-members", JSON.stringify(ids)); }

/* ── platform meta ── */
const PLATFORMS = ["Instagram","TikTok","Twitter/X","YouTube","Facebook","Snapchat","Pinterest","LinkedIn","WhatsApp","Telegram","Threads","BeReal","Other"];
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  Instagram, TikTok: Music, "Twitter/X": Twitter, YouTube: Youtube, Facebook, WhatsApp: MessageCircle, Telegram: MessageCircle,
};
function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform] ?? Globe;
  return <Icon className={className ?? "w-4 h-4"} />;
}
function platformColor(p: string) {
  const m: Record<string,string> = { Instagram:"text-pink-500", TikTok:"text-gray-900", "Twitter/X":"text-sky-500", YouTube:"text-red-500", Facebook:"text-blue-600", WhatsApp:"text-green-500", Telegram:"text-sky-400", Snapchat:"text-yellow-500", Pinterest:"text-red-600", LinkedIn:"text-blue-700" };
  return m[p] ?? "text-violet-500";
}

/* ── types ── */
interface SocialLink { id: string; platform: string; url: string; username?: string; created_at: string; }
interface Member { id: string; name: string; top_platform: string; top_url: string; top_username: string; link_count: string; }

/* ── quick access services ── */
const SERVICES = [
  { id: "wallpapers", label: "Wallpapers", desc: "Browse aesthetic collections", icon: ImageIcon, color: "from-blue-100 to-cyan-50", border: "border-blue-200", iconBg: "bg-blue-100", accent: "text-blue-600", href: "/wallpapers" },
  { id: "tiktoks",    label: "TikTok Gallery", desc: "Watch curated videos", icon: Music, color: "from-pink-100 to-rose-50", border: "border-pink-200", iconBg: "bg-pink-100", accent: "text-pink-600", href: "/tiktoks" },
  { id: "tiktok-dl", label: "TikTok Download", desc: "No watermark · HD quality", icon: Download, color: "from-orange-100 to-amber-50", border: "border-orange-200", iconBg: "bg-orange-100", accent: "text-orange-600", href: "/tiktok-download" },
  { id: "memes",     label: "Meme Gallery", desc: "Browse fresh memes daily", icon: Laugh, color: "from-yellow-100 to-amber-50", border: "border-yellow-200", iconBg: "bg-yellow-100", accent: "text-yellow-600", href: "/memes" },
  { id: "meme-mk",   label: "Meme Maker", desc: "Create your own — free", icon: Wand2, color: "from-green-100 to-emerald-50", border: "border-green-200", iconBg: "bg-green-100", accent: "text-green-600", href: "/meme-maker" },
];

/* ── IframeMemberModal ── */
function IframeMemberModal({ member, onClose, onMarkFollowed }: {
  member: Member; onClose: () => void; onMarkFollowed: (id: string) => void;
}) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">{member.name}</p>
              <p className="text-xs text-foreground/50 font-medium">{member.top_platform}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onMarkFollowed(member.id); onClose(); }}
              className="flex items-center gap-1.5 text-xs font-bold text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors">
              <UserCheck className="w-3.5 h-3.5" /> Mark as followed
            </button>
            <a href={member.top_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-violet-600 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Open tab
            </a>
            <button onClick={onClose} className="text-foreground/50 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-foreground/5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* iframe */}
        <div className="flex-1 relative bg-gray-100">
          <iframe src={member.top_url} title={`${member.name} — ${member.top_platform}`}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer" />
          {/* Overlay fallback shown on top for blocked iframes */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-4 opacity-0 peer-empty:opacity-100">
            <p className="text-foreground/40 text-sm font-medium">Preview blocked by {member.top_platform}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════════════════ */
export function Dashboard() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated, user, logout } = useUserAuth();
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
  const socialLinksRef = useRef<HTMLDivElement>(null);

  const [viewerItems, setViewerItems] = useState<Image[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // TikTok downloader
  const [tkUrl, setTkUrl] = useState("");
  const [tkLoading, setTkLoading] = useState(false);
  const [tkResult, setTkResult] = useState<{ downloadUrl: string; title: string; thumbnail: string } | null>(null);
  const [tkError, setTkError] = useState<string | null>(null);
  const [quota, setQuota] = useState(getQuota());
  const [dlProgress, setDlProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Subscription
  const [tiktokActive, setTiktokActive] = useState(false);
  const [tiktokExpiry, setTiktokExpiry] = useState<string | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [tiktokPaidMode, setTiktokPaidMode] = useState(false);

  // Social links
  const [myLinks, setMyLinks] = useState<SocialLink[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [followed, setFollowed] = useState<string[]>(getFollowed());
  const [iframeTarget, setIframeTarget] = useState<Member | null>(null);
  const [newPlatform, setNewPlatform] = useState(PLATFORMS[0]);
  const [newUrl, setNewUrl] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showFollowed, setShowFollowed] = useState(false);

  const token = localStorage.getItem("userToken");

  useEffect(() => { if (isReady && !isAuthenticated) setLocation("/login"); }, [isReady, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetch(`${baseUrl}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((d: any) => { setTiktokActive(!!d.tiktokActive); setTiktokExpiry(d.tiktokExpiry ?? null); })
      .catch(() => {}).finally(() => setSubLoading(false));
    fetch(`${baseUrl}/api/settings`).then(r => r.json()).then((d: any) => setTiktokPaidMode(!!d.tiktokPaidMode)).catch(() => {});
    fetch(`${baseUrl}/api/social-links`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMyLinks).catch(() => {});
    fetch(`${baseUrl}/api/community/members`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(setMembers).catch(() => {});
  }, [isAuthenticated, token, baseUrl]);

  const { data, isLoading: picksLoading } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated && !!token, staleTime: 5 * 60 * 1000, queryKey: ["dashboard-images"] },
  } as any);
  const picks = (data ?? []).slice(0, 6);

  const remaining = Math.max(0, FREE_LIMIT - quota.count);
  const exhausted = tiktokPaidMode && !tiktokActive && remaining <= 0;

  const visibleMembers = members.filter(m => showFollowed ? followed.includes(m.id) : !followed.includes(m.id));

  const handleMarkFollowed = (id: string) => {
    const updated = followed.includes(id) ? followed.filter(f => f !== id) : [...followed, id];
    setFollowed(updated); saveFollowed(updated);
  };

  const scrollToSocialLinks = () => {
    setSocialTab("mine");
    setTimeout(() => socialLinksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleTkFetch = async () => {
    if (!tkUrl.trim() || exhausted) return;
    setTkError(null); setTkResult(null); setTkLoading(true);
    try {
      const d = await fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: tkUrl }),
      }).then(r => r.json()) as any;
      if (d.downloadUrl) { setTkResult({ downloadUrl: d.downloadUrl, title: d.title ?? "TikTok", thumbnail: d.thumbnail ?? "" }); setQuota(incrementQuota()); }
      else setTkError(d.error ?? "Could not fetch this TikTok.");
    } catch { setTkError("Network error. Please try again."); }
    finally { setTkLoading(false); }
  };

  const handleTkDownload = async () => {
    if (!tkResult) return;
    setIsDownloading(true); setDlProgress(0);
    try {
      const resp = await fetch(`${baseUrl}/api/images/download-proxy?url=${encodeURIComponent(tkResult.downloadUrl)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok || !resp.body) throw new Error();
      const len = Number(resp.headers.get("Content-Length") ?? "0");
      const reader = resp.body.getReader(); const chunks: Uint8Array[] = []; let received = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); received += value.length; if (len > 0) setDlProgress(Math.round((received / len) * 100)); }
      const blob = new Blob(chunks as BlobPart[], { type: "video/mp4" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${tkResult.title.slice(0, 40)}.mp4`; a.click();
    } catch { setTkError("Download failed. Try again."); }
    finally { setIsDownloading(false); setDlProgress(0); }
  };

  const handleAddLink = async () => {
    if (!newUrl.trim()) { setLinkError("Please enter a URL"); return; }
    setLinkSaving(true); setLinkError(null);
    try {
      const resp = await fetch(`${baseUrl}/api/social-links`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
    await fetch(`${baseUrl}/api/social-links/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setMyLinks(prev => prev.filter(l => l.id !== id));
  };

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-16 page-live">
      <Header />
      <AppInstallPrompt />

      {/* ── iframe member modal ── */}
      {iframeTarget && (
        <IframeMemberModal member={iframeTarget} onClose={() => setIframeTarget(null)}
          onMarkFollowed={(id) => { handleMarkFollowed(id); }} />
      )}

      {/* ── download progress ── */}
      {isDownloading && dlProgress > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-foreground/15 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl min-w-[220px]">
          <div className="w-32 h-1.5 rounded-full bg-foreground/15">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-300" style={{ width: `${dlProgress}%` }} />
          </div>
          <span className="text-xs text-foreground/70 font-bold">{dlProgress}%</span>
        </div>
      )}

      {viewerIndex !== null && viewerItems.length > 0 && (
        <ContentViewer items={viewerItems} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} baseUrl={baseUrl} token={token} />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">

        {/* ── welcome bar ── */}
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

        {/* ── subscription status ── */}
        {!subLoading && (
          <div className="mb-8">
            {tiktokActive ? (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0"><Crown className="w-5 h-5 text-yellow-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Premium Active</p>
                  <div className="flex items-center gap-1.5 mt-0.5"><CalendarDays className="w-3 h-3 text-foreground/40" />
                    <p className="text-xs text-foreground/60 font-medium">Expires {tiktokExpiry ? fmtExpiry(tiktokExpiry) : "—"} · Unlimited TikTok downloads</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-100 border border-yellow-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" /><span className="text-xs font-bold text-yellow-700">Unlimited</span>
                </div>
              </motion.div>
            ) : !tiktokPaidMode ? (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0"><Zap className="w-5 h-5 text-green-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">TikTok Free Mode</p>
                  <p className="text-xs text-foreground/60 mt-0.5 font-medium">Downloads are free for everyone right now</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-100 border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /><span className="text-xs font-bold text-green-700">Free</span>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-foreground/10 bg-white px-5 py-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center shrink-0"><Download className="w-5 h-5 text-foreground/50" /></div>
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
                <Button size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold" onClick={() => setLocation("/pay")}>Upgrade Ksh 70</Button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── QUICK ACCESS — Social Boost FIRST + animated ── */}
        <div className="mb-10">
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-4">Quick Access</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

            {/* Social Media Boost — first, animated colour-cycling glow */}
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={scrollToSocialLinks}
              className="relative rounded-2xl border-0 p-4 text-left overflow-hidden boost-card"
              style={{ boxShadow: "0 0 28px rgba(249,115,22,0.5)" }}>
              <div className="absolute inset-0 rounded-2xl animate-pulse bg-white/10 pointer-events-none" />
              <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-white drop-shadow" />
              </div>
              <p className="font-display text-sm text-white mb-0.5 drop-shadow">Social Boost</p>
              <p className="text-white/85 text-xs font-semibold">Share &amp; grow your reach</p>
              <span className="absolute top-2 right-2 text-[9px] font-black bg-white text-orange-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">🔥 Hot</span>
            </motion.button>

            {SERVICES.map((svc, i) => {
              const Icon = svc.icon;
              const cycleClass = [`card-live-1`, `card-live-2`, `card-live-3`, `card-live-4`, `card-live-5`][i % 5];
              return (
                <motion.button key={svc.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setLocation(svc.href)}
                  className={cn("rounded-2xl border-0 p-4 text-left overflow-hidden shadow-md hover:shadow-lg transition-shadow", cycleClass)}
                  style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                  <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-white drop-shadow" />
                  </div>
                  <p className="font-display text-sm text-white mb-0.5 drop-shadow">{svc.label}</p>
                  <p className="text-white/85 text-xs font-semibold">{svc.desc}</p>
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

            {/* LEFT — Members to follow as button-cards with iframe on tap */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-bold text-foreground">Members to follow</p>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowFollowed(!showFollowed)}
                    className={cn("text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors",
                      showFollowed ? "bg-violet-100 text-violet-700 border-violet-200" : "bg-white text-foreground/50 border-foreground/10")}>
                    {showFollowed ? "✓ Followed" : "All"}
                  </button>
                  <span className="text-xs text-foreground/40 font-medium">{visibleMembers.length}</span>
                </div>
              </div>

              <div className="flex-1 rounded-2xl border border-violet-100 bg-white overflow-hidden shadow-sm">
                {visibleMembers.length === 0 ? (
                  <div className="min-h-[340px] flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-violet-300" />
                    </div>
                    <p className="text-sm font-semibold text-foreground/50">
                      {showFollowed ? "No followed members yet" : "No members yet"}
                    </p>
                    {!showFollowed && (
                      <button onClick={scrollToSocialLinks}
                        className="mt-1 text-xs font-bold text-violet-600 border border-violet-200 px-3 py-1.5 rounded-xl hover:bg-violet-50 transition-colors">
                        Add my links →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-y-auto no-scrollbar" style={{ maxHeight: 420 }}>
                    {visibleMembers.map((member, i) => {
                      const isFollowed = followed.includes(member.id);
                      return (
                        <motion.button key={member.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => setIframeTarget(member)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-4 border-b border-white/20 last:border-0",
                            "text-left hover:brightness-110 active:brightness-90 transition-all group rounded-none",
                            ["card-live","card-live-1","card-live-2","card-live-3","card-live-4"][i % 5]
                          )}>
                          {/* Avatar */}
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm",
                            isFollowed ? "bg-green-500" : "bg-gradient-to-br from-violet-400 to-purple-600"
                          )}>
                            {isFollowed ? <UserCheck className="w-4 h-4" /> : member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white drop-shadow truncate">{member.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <PlatformIcon platform={member.top_platform} className="w-3 h-3 text-white/80" />
                              <p className="text-xs text-white/80 font-semibold truncate">
                                {member.top_username || member.top_platform}
                              </p>
                              {Number(member.link_count) > 1 && (
                                <span className="ml-1 text-[10px] text-white/60 font-semibold shrink-0">
                                  +{Number(member.link_count) - 1}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isFollowed ? (
                              <span className="text-[10px] font-bold text-white bg-green-500 border border-green-400 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                <UserCheck className="w-2.5 h-2.5" /> Done
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-lg flex items-center gap-0.5 backdrop-blur-sm">
                                Follow <ChevronRight className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Image picks grid */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <p className="text-sm font-bold text-foreground">Latest content</p>
              </div>
              {picksLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-2xl bg-foreground/5 animate-pulse aspect-square" />)}
                </div>
              ) : picks.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {picks.map((img, i) => {
                    const typeLabel = img.type === "meme" ? "Meme" : img.type === "tiktok" ? "TikTok" : "Wallpaper";
                    const badgeColor = img.type === "meme" ? "bg-yellow-100 text-yellow-700" : img.type === "tiktok" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";
                    return (
                      <motion.div key={img.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="rounded-2xl overflow-hidden relative group cursor-pointer aspect-square bg-foreground/5 active:scale-95 transition-transform shadow-sm"
                        onClick={() => { setViewerItems(picks); setViewerIndex(i); }}>
                        <img src={img.thumbnail ?? img.url} alt={img.title ?? typeLabel} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                          <p className="text-white font-semibold text-xs truncate">{img.title ?? img.category}</p>
                        </div>
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-xs font-bold ${badgeColor}`}>{typeLabel}</div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 min-h-[340px] flex items-center justify-center text-foreground/40 text-sm bg-white border border-foreground/10 rounded-2xl font-medium">
                  Content coming soon!
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── TikTok Downloader ── */}
        <div className="mb-10">
          <div className="rounded-3xl card-live overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold mb-3">
                  <Zap className="w-3 h-3" /> Watermark-free
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-1">TikTok Downloader</h2>
                <p className="text-white/80 text-sm font-medium">Paste any TikTok link — download original HD video, no watermark.</p>
              </div>
              <button onClick={() => setLocation("/tiktok-download")}
                className="shrink-0 text-xs font-bold text-white border border-white/30 bg-white/15 px-4 py-2 rounded-xl transition-colors hover:bg-white/25">
                Full page →
              </button>
            </div>

            {tiktokActive ? (
              <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-white px-4 py-3 mb-5">
                <Crown className="w-4 h-4 text-yellow-600 shrink-0" />
                <div className="flex-1"><p className="text-sm font-bold text-foreground">Premium — Unlimited downloads</p>
                  <p className="text-xs text-foreground/55 font-medium">{tiktokExpiry ? `Expires ${fmtExpiry(tiktokExpiry)}` : "Active"}</p>
                </div>
                <span className="text-xs font-bold text-yellow-700 px-2 py-1 rounded-lg bg-yellow-100">∞</span>
              </div>
            ) : exhausted ? (
              <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-white p-4 mb-5">
                <Crown className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex-1"><p className="text-sm font-bold text-foreground">Monthly limit reached</p>
                  <p className="text-xs text-foreground/55 font-medium">Upgrade for unlimited · Resets next month</p>
                </div>
                <Button size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold" onClick={() => setLocation("/pay")}>Upgrade Ksh 70</Button>
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
                  placeholder="https://www.tiktok.com/@user/video/..." disabled={exhausted || tkLoading}
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

        {/* ── SOCIAL LINKS ── */}
        <div className="mb-10" ref={socialLinksRef} id="social-links">
          <div className="rounded-3xl card-live-1 overflow-hidden p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-2xl text-white">Social Links</h2>
                <p className="text-white/80 text-sm font-medium">Share your profiles — others can find and follow you</p>
              </div>
            </div>

            {/* Only show My Links — no Community tab here */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-violet-100 p-4">
                <p className="text-xs font-bold text-foreground/60 uppercase tracking-widest mb-3">Add or update a link</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-foreground/15 bg-white text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://instagram.com/yourname" className="bg-white border-foreground/15 font-medium" />
                  <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="@username (optional)" className="bg-white border-foreground/15 font-medium" />
                </div>
                {linkError && <p className="text-red-500 text-xs font-semibold mb-2">{linkError}</p>}
                <Button onClick={handleAddLink} disabled={linkSaving} className="bg-violet-500 hover:bg-violet-600 text-white font-bold gap-2">
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
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:text-violet-700 truncate block font-semibold">{link.url}</a>
                      </div>
                      <button onClick={() => handleDeleteLink(link.id)} className="text-foreground/30 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Meme Maker ── */}
        <div className="mb-10">
          <div className="rounded-3xl card-live-2 overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold mb-3">
                  <CheckCircle2 className="w-3 h-3" /> Always free · No limits
                </div>
                <h2 className="font-display text-2xl sm:text-3xl text-white mb-2">Meme Maker</h2>
                <p className="text-white/80 text-sm font-medium max-w-lg">Create custom memes — Impact font, 1080×800. Download instantly, completely free.</p>
              </div>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setLocation("/meme-maker")}
                className="shrink-0 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-6 py-3 rounded-2xl border border-white/30 transition-colors">
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
