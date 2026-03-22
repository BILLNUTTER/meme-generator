import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useAdminLogin, useGetImages, useCreateImage, useDeleteImage, useGetAdminUsers, getGetImagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Image as ImageIcon, Loader2 } from "lucide-react";

const CATEGORIES = ["Nature", "Minimalism", "Cars", "Anime", "Quotes", "Vaporwave"];

export default function Admin() {
  const { token, isAuthenticated, login, logout, isReady } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // New Image State
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [destination, setDestination] = useState("landing");

  // API Hooks
  const { mutate: doLogin, isPending: isLoggingIn } = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token);
        toast({ title: "Welcome back", description: "Successfully authenticated." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Access Denied", description: "Invalid credentials." });
      }
    }
  });

  const { data: images = [], isLoading: isLoadingImages } = useGetImages(undefined, {
    query: { enabled: isAuthenticated }
  });

  const { data: users = [], isLoading: isLoadingUsers } = useGetAdminUsers({
    request: { headers: { Authorization: `Bearer ${token}` } },
    query: { enabled: isAuthenticated }
  });

  const { mutate: createImage, isPending: isCreating } = useCreateImage({
    request: { headers: { Authorization: `Bearer ${token}` } },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetImagesQueryKey() });
        toast({ title: "Image Added", description: "Successfully added to gallery." });
        setUrl("");
        setTitle("");
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to add image. Check your token." });
      }
    }
  });

  const { mutate: deleteImage, isPending: isDeleting } = useDeleteImage({
    request: { headers: { Authorization: `Bearer ${token}` } },
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetImagesQueryKey() });
        toast({ title: "Image Removed", description: "Successfully deleted from gallery." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete image." });
      }
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin({ data: { username, password } });
  };

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return toast({ variant: "destructive", title: "Required", description: "Image URL is required" });
    createImage({ data: { url, title: title || null, category, destination } });
  };

  if (!isReady) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-black">
        <Header />
        {/* Abstract background for login */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/admin-bg.png`}
            alt="Abstract dark background"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md p-8 sm:p-12 glass-card rounded-3xl"
        >
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl text-white mb-3">Admin Portal</h1>
            <p className="text-white/50 text-sm">Enter your credentials to manage the gallery.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Username</label>
              <Input 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="admin" 
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Password</label>
              <Input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="bg-black/40 border-white/10"
              />
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
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="font-display text-4xl text-white">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your aesthetic collection.</p>
          </div>
          <Button variant="outline" onClick={logout}>Sign Out</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Image Form */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl p-6 sticky top-28">
              <h2 className="text-xl font-display mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-white/60" /> Add Visual
              </h2>
              <form onSubmit={handleAddImage} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs text-white/50 uppercase tracking-wider">Image URL</label>
                  {/* unspalsh random image for quick testing */}
                  <Input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="https://images.unsplash.com/..." 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/50 uppercase tracking-wider">Title (Optional)</label>
                  <Input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="Midnight Drive" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/50 uppercase tracking-wider">Category</label>
                  <select 
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-neutral-900">{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/50 uppercase tracking-wider">Destination</label>
                  <select 
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    className="w-full h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none"
                  >
                    <option value="landing" className="bg-neutral-900">Landing Page</option>
                    <option value="dashboard" className="bg-neutral-900">Dashboard</option>
                    <option value="both" className="bg-neutral-900">Both</option>
                  </select>
                </div>
                <Button type="submit" className="w-full mt-2" disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload Image"}
                </Button>
              </form>
            </div>
          </div>

          {/* Image List and Users */}
          <div className="lg:col-span-2 space-y-8">
            {/* Images */}
            <div className="space-y-4">
              <h2 className="text-xl font-display mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-white/60" /> Gallery Images ({images.length})
              </h2>
              {isLoadingImages ? (
                <div className="h-40 flex items-center justify-center glass-card rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                </div>
              ) : images.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center glass-card rounded-2xl text-white/40">
                  <ImageIcon className="w-8 h-8 mb-3 opacity-50" />
                  <p>No images in the gallery yet.</p>
                </div>
              ) : (
                images.map((img) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={img.id}
                    className="glass-card rounded-xl p-4 flex items-center gap-6 group hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-white/5">
                      <img src={img.url} alt={img.title || ""} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg text-white truncate">{img.title || "Untitled"}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs uppercase tracking-widest text-white/50 bg-white/5 px-2 py-1 rounded">
                          {img.category}
                        </span>
                        <span className="text-xs text-white/30">ID: {img.id}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="shrink-0 text-white/30 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteImage({ id: img.id })}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Users List */}
            <div className="space-y-4">
              <h2 className="text-xl font-display mb-4 mt-8 flex items-center gap-2">
                Registered Users ({users.length})
              </h2>
              {isLoadingUsers ? (
                <div className="h-40 flex items-center justify-center glass-card rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                </div>
              ) : users.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center glass-card rounded-2xl text-white/40">
                  <p>No registered users yet.</p>
                </div>
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
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
