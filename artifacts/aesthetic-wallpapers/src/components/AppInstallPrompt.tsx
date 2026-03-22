import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "aw-install-dismissed-until";
const REDISPLAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function AppInstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Respect temporary dismiss (re-show after 7 days)
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(ios);

    // Show after a short delay on all devices
    setTimeout(() => setShow(true), 4000);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") { setShow(false); return; }
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + REDISPLAY_MS));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom">
      <div className="max-w-md mx-auto bg-zinc-900 border border-white/15 rounded-2xl p-4 shadow-2xl flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <span className="font-black text-base text-white select-none">𝐀</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Install 𝐀𝐄𝐒𝐓𝐓𝐇𝐄𝐓𝐈𝐂𝐒</p>
          <p className="text-white/60 text-xs mt-0.5">
            {isIOS
              ? 'Tap the Share icon then "Add to Home Screen" for the best experience.'
              : "Install the app for faster access, offline browsing and native feel."}
          </p>
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-3 flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors"
            >
              <Download className="w-3 h-3" />
              Install App
            </button>
          )}
          {isIOS && (
            <div className="mt-2 flex items-center gap-1.5 text-white/50 text-xs">
              <Smartphone className="w-3 h-3 shrink-0" />
              <span>Safari → Share → Add to Home Screen</span>
            </div>
          )}
        </div>
        <button onClick={handleDismiss} className="text-white/40 hover:text-white transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
