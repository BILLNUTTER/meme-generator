import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useUserAuth } from "@/hooks/use-user-auth";
import { ArrowLeft, Loader2, AlertCircle, CreditCard, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PesapalPayment() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isReady } = useUserAuth();

  const [email, setEmail]   = useState(user?.email || "");
  const [phone, setPhone]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const AMOUNT = 70;

  const initiate = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("userToken");
      const res = await fetch(`${BASE_URL}/api/pesapal/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: AMOUNT,
          currency: "KES",
          email: email || undefined,
          phone: phone || undefined,
          description: "Aesthetic Wallpapers — Unlimited TikTok Downloads (1 month)",
        }),
      });
      const data = await res.json() as { redirectUrl?: string; error?: string };
      if (data.redirectUrl) {
        setIframeUrl(data.redirectUrl);
      } else {
        setError(data.error || "Could not initiate payment. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  if (isReady && !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-5">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-3xl text-white mb-2">Upgrade Your Plan</h1>
            <p className="text-white/50 text-sm">
              Unlimited no-watermark TikTok downloads for <span className="text-white font-bold">Ksh 70/month</span>
            </p>
          </div>

          {!iframeUrl ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-5">
              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Phone (M-Pesa)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="0712345678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition"
                />
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Unlimited TikTok Downloads (1 month)</span>
                  <span className="text-white font-bold">Ksh 70</span>
                </div>
              </div>

              {error && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                  <a
                    href="https://wa.me/254713881613"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact Support on WhatsApp
                  </a>
                </div>
              )}

              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
                disabled={loading || (!email && !phone)}
                onClick={initiate}
              >
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : "Pay Ksh 70 via Pesapal"}
              </Button>

              <p className="text-center text-white/25 text-xs">
                Secured by Pesapal · M-Pesa, Visa, Mastercard accepted
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-white">
              <iframe
                src={iframeUrl}
                title="Pesapal Payment"
                className="w-full"
                style={{ height: "600px", border: "none" }}
                allow="payment"
              />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
