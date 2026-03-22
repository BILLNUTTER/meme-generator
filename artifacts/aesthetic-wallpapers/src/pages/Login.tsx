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
import { Loader2, ArrowRight } from "lucide-react";

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
          toast({ title: "Welcome back", description: "Successfully logged in." });
          setLocation("/dashboard");
        }
      },
      onError: () => {
        toast({ variant: "destructive", title: "Login Failed", description: "Invalid credentials." });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin({ data: { email, password } });
  };

  if (!isReady) return null;
  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-black pt-20 flex-col">
      <Header />
      
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-zinc-900 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0,transparent_100%)]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md p-8 sm:p-12 glass-card rounded-3xl mx-4 mb-20 mt-10"
      >
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-white mb-3">Welcome Back</h1>
          <p className="text-white/50 text-sm">Sign in to access unlimited premium downloads.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">Email</label>
            <Input 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@example.com" 
              className="bg-black/40 border-white/10"
              required
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
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 text-base mt-4" disabled={isPending}>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </Button>
          
          <div className="text-center pt-6 mt-6 border-t border-white/10">
            <p className="text-sm text-white/50">
              Don't have an account?{" "}
              <Link href="/register" className="text-white hover:text-white/80 transition-colors font-medium inline-flex items-center gap-1">
                Register <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </form>
      </motion.div>
      <Footer />
    </div>
  );
}
