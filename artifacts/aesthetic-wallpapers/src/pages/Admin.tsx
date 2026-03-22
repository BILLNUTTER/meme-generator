import { useState } from "react";
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
  Trash2,
  Plus,
  Image as ImageIcon,
  Loader2,
  Music,
  Laugh,
  RefreshCw,
  Users,
  LayoutGrid,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Nature", "Minimalism", "Cars", "Anime", "Vaporwave", "Memes", "Other"];
type ContentType = "wallpaper" | "meme" | "tiktok";

export default function Admin() {
  const { token, isAuthenticated, login, logout, isReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Content type for add form
  const [contentType, setContentType] = useState<ContentType>("wallpaper");

  // Shared form state
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [destination, setDestination] = useState("landing");

  // Pinterest resolution
  const [pinterestInput, setPinterestInput] = useState("");
  const [isResolvingPinterest, setIsResolvingPinterest] = useState(false);

  // Meme state
  const [memeText, setMemeText] = useState("");

  // TikTok state
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [tiktokThumbnail, setTiktokThumbnail] = useState("");
  const [tiktokTitle, setTiktokTitle] = useState("");
  const [isResolvingTiktok, setIsResolvingTiktok] = useState(false);

  // View tab
  const [viewTab, setViewTab] = useState<"landing" | "dashboard" | "memes" | "tiktoks" | "users">("landing");

  const { mutate: doLogin, isPending: isLoggingIn } = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        toast({ title: "Welcome back", description: "Successfully authenticated." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Access Denied", description: "Invalid credentials." });
      },
    },
  });

  // Use dashboard endpoint (no destination filter) so admin sees ALL content incl. dashboard-only TikToks
  const { data: allImages = [], isLoading: isLoadingImages } = useGetDashboardImages(undefined, {
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated && !!token },
  });

  const { data: users = [], isLoading: isLoadingUsers } = useGetAdminUsers({
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetImagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardImagesQueryKey() });
  };

  const { mutate: createImage, isPending: isCreating } = useCreateImage({
    request: { headers: { Authorization: `Bearer ${token}` } },
    mutation: {
      onSuccess: () => {
        invalidateAll();
        toast({ title: "Content Added", description: "Successfully added to gallery." });
        resetForm();
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to add content." });
      },
    },
  });

  const { mutate: deleteImage, isPending: isDeleting } = useDeleteImage({
    request: { headers: { Authorization: `Bearer ${token}` } },
    mutation: {
      onSuccess: () => {
        invalidateAll();
        toast({ title: "Removed", description: "Successfully deleted." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
      },
    },
  });

  const resetForm = () => {
    setUrl(""); setTitle(""); setCategory(CATEGORIES[0]); setDestination("landing");
    setPinterestInput(""); setMemeText("");
    setTiktokUrl(""); setTiktokThumbnail(""); setTiktokTitle("");
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); doLogin({ data: { username, password } }); };

  const handleResolvePinterest = async () => {
    if (!pinterestInput) return;
    setIsResolvingPinterest(true);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${baseUrl}/api/images/resolve-pinterest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pinterestInput }),
      });
      const data = await resp.json() as { imageUrl?: string; error?: string };
      if (data.imageUrl) {
        setUrl(data.imageUrl);
        toast({ title: "Resolved!", description: "Pinterest image URL extracted." });
      } else {
        toast({ variant: "destructive", title: "Failed", description: data.error || "Could not resolve URL." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error resolving Pinterest URL." });
    } finally {
      setIsResolvingPinterest(false);
    }
  };

  const handleResolveTiktok = async () => {
    if (!tiktokUrl) return;
    setIsResolvingTiktok(true);
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tiktokUrl }),
      });
      const data = await resp.json() as { thumbnail?: string; title?: string; downloadUrl?: string; error?: string };
      if (data.thumbnail) {
        setTiktokThumbnail(data.thumbnail);
        setTiktokTitle(data.title || "TikTok Video");
        setUrl(data.thumbnail);
        setTitle(data.title || "TikTok Video");
        toast({ title: "TikTok Resolved!", description: "Video info fetched successfully." });
      } else {
        toast({ variant: "destructive", title: "Failed", description: data.error || "Could not fetch TikTok info." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error resolving TikTok." });
    } finally {
      setIsResolvingTiktok(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Meme: generate canvas image from text ──
    if (contentType === "meme") {
      if (!memeText.trim()) {
        toast({ variant: "destructive", title: "Required", description: "Enter meme text first." });
        return;
      }
      const dataUrl = generateMemeImage(memeText.trim());
      createImage({
        data: {
          url: dataUrl,
          title: memeText.trim().slice(0, 80) || null,
          category: "Memes",
          destination,
          type: "meme",
          tiktokUrl: null,
        },
      });
      return;
    }

    if (contentType === "tiktok") {
      if (!tiktokUrl) {
        toast({ variant: "destructive", title: "Required", description: "Paste a TikTok URL first." });
        return;
      }
      // Auto-resolve if not yet done
      if (!url) {
        setIsResolvingTiktok(true);
        try {
          const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
          const resp = await fetch(`${baseUrl}/api/images/tiktok-info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: tiktokUrl }),
          });
          const data = await resp.json() as { thumbnail?: string; title?: string; error?: string };
          if (data.thumbnail) {
            setTiktokThumbnail(data.thumbnail);
            setTiktokTitle(data.title || "TikTok Video");
            createImage({
              data: {
                url: data.thumbnail,
                title: data.title || "TikTok Video",
                category: "TikTok",
                destination,
                type: "tiktok",
                tiktokUrl,
              },
            });
          } else {
            toast({ variant: "destructive", title: "Failed", description: data.error || "Could not fetch TikTok info." });
          }
        } catch {
          toast({ variant: "destructive", title: "Error", description: "Network error resolving TikTok." });
        } finally {
          setIsResolvingTiktok(false);
        }
        return;
      }
      // Already resolved
      createImage({
        data: {
          url,
          title: tiktokTitle || null,
          category: "TikTok",
          destination,
          type: "tiktok",
          tiktokUrl,
        },
      });
      return;
    }

    if (!url) {
      toast({ variant: "destructive", title: "Required", description: "Image URL is required" });
      return;
    }
    createImage({
      data: {
        url,
        title: title || null,
        category,
        destination,
        type: contentType,
        tiktokUrl: null,
      },
    });
  };

  // Filtered views
  const landingImages = allImages.filter(img => (img.destination === "landing" || img.destination === "both") && img.type !== "tiktok" && img.type !== "meme");
  const dashboardImages = allImages.filter(img => img.destination === "dashboard" && img.type !== "tiktok" && img.type !== "meme");
  const memeImages = allImages.filter(img => img.type === "meme");
  const tiktokImages = allImages.filter(img => img.type === "tiktok");

  if (!isReady) return null;

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-black">
        <Header />
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-black via-zinc-900 to-black" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md p-8 sm:p-12 glass-card rounded-3xl mx-4"
        >
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <span className="font-black text-xl text-white select-none">𝐀𝐖</span>
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
    <div className="min-h-screen flex flex-col pt-20">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-display text-4xl text-white">Admin Studio</h1>
            <p className="text-muted-foreground mt-1">Manage your aesthetic collection</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="border-white/10">Sign Out</Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Wallpapers", count: allImages.filter(i => i.type !== "meme" && i.type !== "tiktok").length, icon: ImageIcon, color: "text-blue-400" },
            { label: "Memes", count: memeImages.length, icon: Laugh, color: "text-yellow-400" },
            { label: "TikToks", count: tiktokImages.length, icon: Music, color: "text-pink-400" },
            { label: "Users", count: users.length, icon: Users, color: "text-green-400" },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="glass-card rounded-2xl p-5 flex items-center gap-4">
                <Icon className={cn("w-6 h-6", stat.color)} />
                <div>
                  <p className="text-2xl font-bold text-white">{stat.count}</p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Add Content Form ── */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6 sticky top-28">
              <h2 className="text-xl font-display mb-5 flex items-center gap-2">
                <Plus className="w-5 h-5 text-white/60" /> Add Content
              </h2>

              {/* Type selector buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {([
                  { id: "wallpaper" as ContentType, label: "Wallpaper", icon: ImageIcon },
                  { id: "meme" as ContentType, label: "Meme", icon: Laugh },
                  { id: "tiktok" as ContentType, label: "TikTok", icon: Music },
                ] as const).map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setContentType(t.id); resetForm(); }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200",
                        contentType === t.id
                          ? "bg-white text-black border-white"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* TikTok URL resolver */}
                {contentType === "tiktok" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-wider">TikTok URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={tiktokUrl}
                          onChange={e => setTiktokUrl(e.target.value)}
                          placeholder="https://www.tiktok.com/@user/video/..."
                          className="flex-1 text-xs"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={handleResolveTiktok}
                          disabled={isResolvingTiktok || !tiktokUrl}
                          className="shrink-0"
                        >
                          {isResolvingTiktok ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    {tiktokThumbnail && (
                      <div className="rounded-xl overflow-hidden aspect-video bg-white/5 relative">
                        <img src={tiktokThumbnail} alt="TikTok thumbnail" className="w-full h-full object-cover" />
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

                {/* ── Meme: text input → auto-generate black+white image ── */}
                {contentType === "meme" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-wider">Meme Text</label>
                      <textarea
                        value={memeText}
                        onChange={e => setMemeText(e.target.value)}
                        placeholder="Type your meme here…"
                        rows={4}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
                      />
                      <p className="text-xs text-white/30">Auto-generates a black background + white text image</p>
                    </div>
                    {/* Live preview */}
                    {memeText.trim() && (
                      <div className="rounded-xl overflow-hidden aspect-square bg-black border border-white/10 flex items-center justify-center p-4">
                        <p
                          className="text-white text-center font-black uppercase leading-tight break-words"
                          style={{ fontSize: memeText.length > 80 ? "14px" : memeText.length > 40 ? "18px" : "24px", fontFamily: "Impact, Arial Black, sans-serif", wordBreak: "break-word" }}
                        >
                          {memeText.toUpperCase()}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* ── Wallpaper: Pinterest resolver + direct URL ── */}
                {contentType === "wallpaper" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-white/50 uppercase tracking-wider">Pinterest URL</label>
                      <div className="flex gap-2">
                        <Input
                          value={pinterestInput}
                          onChange={e => setPinterestInput(e.target.value)}
                          placeholder="https://pin.it/... or pinterest.com/..."
                          className="flex-1 text-xs"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={handleResolvePinterest}
                          disabled={isResolvingPinterest || !pinterestInput}
                          className="shrink-0"
                        >
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
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground focus:outline-none appearance-none"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-neutral-900">{cat}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* Destination — common to all types */}
                <div className="space-y-2">
                  <label className="text-xs text-white/50 uppercase tracking-wider">Show On</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "landing", label: "Landing" },
                      { val: "dashboard", label: "Dashboard" },
                      { val: "both", label: "Both" },
                    ].map(d => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => setDestination(d.val)}
                        className={cn(
                          "py-2 text-xs rounded-lg border transition-all duration-200",
                          destination === d.val
                            ? "bg-white text-black border-white font-semibold"
                            : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={
                    isCreating || isResolvingTiktok ||
                    (contentType === "tiktok" ? !tiktokUrl : contentType === "meme" ? !memeText.trim() : !url)
                  }
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${contentType === "tiktok" ? "TikTok" : contentType === "meme" ? "Meme" : "Wallpaper"}`}
                </Button>
              </form>
            </div>
          </div>

          {/* ── Content Sections ── */}
          <div className="lg:col-span-2">
            {/* View Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                { id: "landing", label: "Landing", icon: LayoutGrid },
                { id: "dashboard", label: "Dashboard", icon: ImageIcon },
                { id: "memes", label: "Memes", icon: Laugh },
                { id: "tiktoks", label: "TikToks", icon: Music },
                { id: "users", label: "Users", icon: Users },
              ] as const).map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      viewTab === tab.id
                        ? "bg-white text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {isLoadingImages && viewTab !== "users" ? (
              <div className="h-40 flex items-center justify-center glass-card rounded-2xl">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
              </div>
            ) : (
              <>
                {/* Landing Wallpapers */}
                {viewTab === "landing" && <ImageList images={landingImages} label="Landing Page Wallpapers" onDelete={id => deleteImage({ id })} isDeleting={isDeleting} />}
                {/* Dashboard Wallpapers */}
                {viewTab === "dashboard" && <ImageList images={dashboardImages} label="Dashboard Wallpapers" onDelete={id => deleteImage({ id })} isDeleting={isDeleting} />}
                {/* Memes */}
                {viewTab === "memes" && <ImageList images={memeImages} label="Memes" onDelete={id => deleteImage({ id })} isDeleting={isDeleting} badge="😂" />}
                {/* TikToks */}
                {viewTab === "tiktoks" && <TikTokList images={tiktokImages} onDelete={id => deleteImage({ id })} isDeleting={isDeleting} />}
                {/* Users */}
                {viewTab === "users" && (
                  isLoadingUsers ? (
                    <div className="h-40 flex items-center justify-center glass-card rounded-2xl">
                      <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="h-40 flex items-center justify-center glass-card rounded-2xl text-white/40">No registered users yet.</div>
                  ) : (
                    <div className="glass-card rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 border-b border-white/10 text-white/60 uppercase tracking-wider text-xs">
                          <tr>
                            <th className="px-6 py-4 font-medium">Name</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {users.map(user => (
                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                              <td className="px-6 py-4 text-white/70">{user.email}</td>
                              <td className="px-6 py-4 text-white/50">{new Date(user.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function generateMemeImage(text: string): string {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  const upper = text.toUpperCase();
  const maxWidth = size - 120;
  let fontSize = text.length > 120 ? 60 : text.length > 60 ? 78 : text.length > 30 ? 96 : 120;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 8;
  ctx.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`;

  const words = upper.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  lines.push(line);

  const lineH = fontSize * 1.25;
  const totalH = lines.length * lineH;
  const startY = (size - totalH) / 2 + lineH / 2;
  lines.forEach((l, i) => ctx.fillText(l, size / 2, startY + i * lineH, maxWidth));

  return canvas.toDataURL("image/jpeg", 0.92);
}

function ImageList({ images, label, onDelete, isDeleting, badge }: {
  images: { id: string; url: string; title?: string | null; category?: string; destination?: string }[];
  label: string;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  badge?: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display text-white/80 mb-4">
        {label} <span className="text-white/40 text-sm">({images.length})</span>
      </h2>
      {images.length === 0 ? (
        <div className="h-32 flex items-center justify-center glass-card rounded-2xl text-white/40">Nothing here yet.</div>
      ) : (
        images.map(img => (
          <motion.div
            key={img.id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-4 flex items-center gap-4 group hover:bg-white/[0.07] transition-colors"
          >
            <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-white/5 relative">
              <img src={img.url} alt={img.title || ""} className="w-full h-full object-cover" />
              {badge && <span className="absolute top-1 left-1 text-xs">{badge}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">{img.title || "Untitled"}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{img.category}</span>
                <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded">{img.destination}</span>
              </div>
            </div>
            <Button
              variant="ghost" size="icon"
              className="shrink-0 text-white/30 hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(img.id)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        ))
      )}
    </div>
  );
}

function TikTokList({ images, onDelete, isDeleting }: {
  images: { id: string; url: string; title?: string | null; tiktokUrl?: string | null }[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display text-white/80 mb-4">
        TikTok Videos <span className="text-white/40 text-sm">({images.length})</span>
      </h2>
      {images.length === 0 ? (
        <div className="h-32 flex items-center justify-center glass-card rounded-2xl text-white/40">No TikToks yet. Add one using the form!</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              <button
                onClick={() => onDelete(img.id)}
                disabled={isDeleting}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-black/80 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
