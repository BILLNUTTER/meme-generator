import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  ArrowLeft, Loader2, AlertCircle, CreditCard,
  MessageCircle, X, CheckCircle2, Sparkles, Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type PayState = "form" | "iframe" | "confirming" | "success" | "failed";

export default function PesapalPayment() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isReady } = useUserAuth();

  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payState, setPayState] = useState<PayState>("form");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ confirmationCode?: string; paymentMethod?: string } | null>(null);

  const orderTrackingIdRef = useRef<string>("");

  const AMOUNT = 70;

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  // Listen for postMessage from /pay/success loaded inside the iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "PESAPAL_SUCCESS") return;
      const trackingId: string = event.data.orderTrackingId || orderTrackingIdRef.current;
      if (!trackingId) return;
      setIframeUrl(null);
      setPayState("confirming");
      confirmPayment(trackingId);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmPayment = async (trackingId: string) => {
    const token = localStorage.getItem("userToken");
    try {
      const res = await fetch(
        `${BASE_URL}/api/pesapal/confirm?orderTrackingId=${encodeURIComponent(trackingId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = await res.json() as { paid?: boolean; confirmationCode?: string; paymentMethod?: string; error?: string };
      if (data.paid) {
        setConfirmResult({ confirmationCode: data.confirmationCode, paymentMethod: data.paymentMethod });
        setPayState("success");
      } else {
        setPayState("failed");
        setError("Payment not yet confirmed. If you paid, please contact support.");
      }
    } catch {
      setPayState("failed");
      setError("Could not verify payment. Contact support if you were charged.");
    }
  };

  const handlePay = async () => {
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem("userToken");
      const callbackUrl = `${window.location.origin}${BASE_URL}/pay/success`;
      const res = await fetch(`${BASE_URL}/api/pesapal/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: AMOUNT,
          currency: "KES",
          email: email.trim(),
          description: "AESTHETICS — Unlimited TikTok Downloads (1 month)",
          callbackUrl,
        }),
      });
      const data = await res.json() as { redirectUrl?: string; orderTrackingId?: string; error?: string };
      if (data.redirectUrl) {
        orderTrackingIdRef.current = data.orderTrackingId || "";
        setPayState("iframe");
        setIframeUrl(data.redirectUrl);
      } else {
        setError(data.error || "Could not open payment. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Full-screen Pesapal iframe */}
      <AnimatePresence>
        {payState === "iframe" && iframeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/10 shrink-0">
              <div>
                <p className="text-white text-sm font-semibold">Complete Payment — Ksh {AMOUNT}</p>
                <p className="text-white/40 text-xs mt-0.5">Enter your M-Pesa number inside and tap Pay</p>
              </div>
              <button
                onClick={() => { setPayState("form"); setIframeUrl(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <iframe
              src={iframeUrl}
              title="Pesapal Payment"
              className="flex-1 w-full border-none bg-white"
              allow="payment *"
              sandbox="allow-scripts allow-same-origin allow-forms allow-top-navigation allow-popups allow-popups-to-escape-sandbox"
              style={{ minHeight: 0 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirming overlay */}
      <AnimatePresence>
        {payState === "confirming" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-semibold">Confirming your payment…</p>
              <p className="text-white/40 text-sm mt-1">Please wait</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-6 pt-28 pb-10">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* SUCCESS */}
          {payState === "success" && (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-24 h-24 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </motion.div>
              <h1 className="font-display text-3xl text-white mb-3">You're all set!</h1>
              <p className="text-white/50 text-sm mb-2">
                Your subscription is now active for <span className="text-white font-bold">30 days</span>.
              </p>
              {confirmResult?.confirmationCode && (
                <p className="text-white/30 text-xs mb-1">Ref: {confirmResult.confirmationCode}</p>
              )}
              {confirmResult?.paymentMethod && (
                <p className="text-white/30 text-xs mb-6">via {confirmResult.paymentMethod}</p>
              )}
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 mb-6 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
                  <p className="text-white text-sm font-medium">Unlimited no-watermark TikTok downloads</p>
                </div>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
                  <p className="text-white text-sm font-medium">Valid for 30 days from today</p>
                </div>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white rounded-xl py-3 font-semibold"
                onClick={() => setLocation("/tiktok-download")}
              >
                Start Downloading TikToks
              </Button>
            </div>
          )}

          {/* FORM (and failed state) */}
          {(payState === "form" || payState === "failed") && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-5">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
                <h1 className="font-display text-3xl text-white mb-2">Upgrade Your Plan</h1>
                <p className="text-white/50 text-sm">
                  Unlimited TikTok downloads for{" "}
                  <span className="text-white font-bold">Ksh 70/month</span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    placeholder="your@email.com"
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
                      <MessageCircle className="w-4 h-4" /> Contact Support on WhatsApp
                    </a>
                  </div>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-400 hover:to-pink-400 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50"
                  disabled={loading || !email.trim()}
                  onClick={handlePay}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opening payment…</>
                    : "Proceed to Pay — Ksh 70"}
                </Button>

                <p className="text-center text-white/25 text-xs">
                  Secured by Pesapal · M-Pesa, Visa, Mastercard accepted
                </p>
              </div>
            </>
          )}

        </motion.div>
      </main>
    </div>
  );
}
