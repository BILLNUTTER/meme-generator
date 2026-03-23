import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLoginUser } from "@workspace/api-client-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Lock, Mail, ImageIcon, Laugh, Music } from "lucide-react";

const FEATURES = [
  { icon: ImageIcon, text: "Premium aesthetic wallpapers" },
  { icon: Laugh,     text: "Fresh memes daily"           },
  { icon: Music,     text: "TikTok downloads — no watermark" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isReady, isAuthenticated } = useUserAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate: doLogin, isPending } = useLoginUser({
    mutation: {
      onSuccess: (res) => {
        if (res.token && res.user) {
          login(res.token, res.user);
          toast({ title: "Welcome back!", description: "Successfully logged in." });
          setLocation("/dashboard");
        }
      },
      onError: () => {
        toast({ variant: "destructive", title: "Login Failed", description: "Invalid email or password." });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin({ data: { email, password } });
  };

  if (!isReady) return null;
  if (isAuthenticated) { setLocation("/dashboard"); return null; }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center pt-16 pb-12 px-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left — branding */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block"
          >
            <Link href="/">
              <span className="font-display text-3xl font-semibold tracking-widest uppercase text-foreground/90">
                𝐀𝐄𝐒𝐓𝐇𝐄𝐓𝐈𝐂𝐒
              </span>
            </Link>
            <p className="mt-4 text-foreground/50 text-base leading-relaxed">
              Your premium destination for aesthetic content — sign in to access your full library.
            </p>
            <div className="mt-8 space-y-4">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-foreground/8 border border-foreground/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-foreground/60" />
                  </div>
                  <span className="text-sm text-foreground/60">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full glass-card rounded-2xl p-8 sm:p-10"
          >
            <div className="mb-8">
              <div className="w-10 h-10 rounded-xl bg-foreground/8 border border-foreground/10 flex items-center justify-center mb-5">
                <Lock className="w-5 h-5 text-foreground/60" />
              </div>
              <h1 className="font-display text-3xl text-foreground mb-1.5">Welcome back</h1>
              <p className="text-foreground/45 text-sm">Sign in to your account to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 bg-foreground/4 border-foreground/10 focus:border-foreground/30 rounded-xl h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-foreground/4 border-foreground/10 focus:border-foreground/30 rounded-xl h-11"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl mt-2"
                disabled={isPending}
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Signing in…</>
                  : <>Sign In <ArrowRight className="w-4 h-4 ml-1.5" /></>
                }
              </Button>
            </form>

            <div className="mt-7 pt-6 border-t border-foreground/8 text-center">
              <p className="text-sm text-foreground/45">
                Don't have an account?{" "}
                <Link href="/register" className="text-foreground font-semibold hover:opacity-80 transition-opacity">
                  Register free →
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
