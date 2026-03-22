import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "aw-install-dismissed-until";
const REDISPLAY_MS = 2 * 24 * 60 * 60 * 1000;

export function AppInstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(ios);

    // Show promptly — 1.5s delay
    const t = setTimeout(() => setShow(true), 1500);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      clearTimeout(t);
      setTimeout(() => setShow(true), 1500);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShow(false);
    });

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
        setInstalled(true);
        return;
      }
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + REDISPLAY_MS));
  };

  if (installed || !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[70] p-4 pb-8"
          >
            <div className="max-w-sm mx-auto bg-zinc-900 border border-white/15 rounded-3xl p-6 shadow-2xl">
              {/* App icon */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center shrink-0 shadow-xl">
                  <span className="font-black text-2xl text-white select-none leading-none">𝐀</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg leading-tight">𝐀𝐄𝐒𝐓𝐇𝐄𝐓𝐈𝐂𝐒</p>
                  <p className="text-white/40 text-sm">Aesthetic Wallpapers & More</p>
                </div>
                <button onClick={handleDismiss} className="text-white/30 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-white/60 text-sm mb-5 leading-relaxed">
                {isIOS
                  ? "Add to your Home Screen for the best experience — offline access, faster loading, and a native app feel."
                  : "Install on your device for instant access, offline browsing, and a native app experience — no app store needed."}
              </p>

              {!isIOS ? (
                <button
                  onClick={handleInstall}
                  className="w-full flex items-center justify-center gap-2.5 bg-white text-black font-bold text-base py-3.5 rounded-2xl hover:bg-white/90 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" />
                  Install App — Free
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white/[0.04] rounded-2xl p-3.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Share className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">1. Tap the Share icon</p>
                      <p className="text-white/40 text-xs">The square with an arrow at the bottom of Safari</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/[0.04] rounded-2xl p-3.5">
                    <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">2. Tap "Add to Home Screen"</p>
                      <p className="text-white/40 text-xs">Scroll down and tap Add to complete</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleDismiss}
                className="w-full text-center text-white/25 text-xs mt-4 hover:text-white/50 transition-colors py-1"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
