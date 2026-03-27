import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRegisterUser } from "@workspace/api-client-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, User, Lock, Mail, Check } from "lucide-react";

const PERKS = [
  "Unlimited wallpaper & meme downloads",
  "10 free TikTok watermark-free downloads/month",
  "Meme Maker — create your own memes",
  "New content added daily by the admin",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login, isReady, isAuthenticated } = useUserAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate: doRegister, isPending } = useRegisterUser({
    mutation: {
      onSuccess: (res) => {
        if (res.token && res.user) {
          login(res.token, res.user);
          toast({ title: "Welcome!", description: "Account created successfully." });
          setLocation("/dashboard");
        }
      },
      onError: () => {
        toast({ variant: "destructive", title: "Registration Failed", description: "Email might be in use or invalid." });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doRegister({ data: { name, email, password } });
  };

  if (!isReady) return null;
  if (isAuthenticated) { setLocation("/dashboard"); return null; }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center pt-16 pb-12 px-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left — perks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block card-live-3 rounded-3xl overflow-hidden p-8"
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-white bg-white/20 border border-white/30 px-3 py-1 rounded-full mb-5">
              Free forever
            </span>
            <h2 className="font-display text-3xl text-white mb-4 leading-snug">
              Everything you need<br />for aesthetic content.
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-8">
              Join thousands of users who download wallpapers, memes, and watermark-free TikToks every day.
            </p>
            <ul className="space-y-3.5">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-white/85 font-medium">{perk}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full card-live-1 rounded-2xl overflow-hidden p-8 sm:p-10"
          >
            <div className="mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/25 flex items-center justify-center mb-5">
                <User className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-display text-3xl text-white mb-1.5">Create account</h1>
              <p className="text-white/75 text-sm">It's free — no credit card required.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <Input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your Name"
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 rounded-xl h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 rounded-xl h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 rounded-xl h-11"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold rounded-xl mt-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white"
                disabled={isPending}
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account…</>
                  : <>Create Free Account <ArrowRight className="w-4 h-4 ml-1.5" /></>
                }
              </Button>
            </form>

            <div className="mt-7 pt-6 border-t border-white/20 text-center">
              <p className="text-sm text-white/75">
                Already have an account?{" "}
                <Link href="/login" className="text-white font-semibold hover:opacity-80 transition-opacity">
                  Sign in →
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
