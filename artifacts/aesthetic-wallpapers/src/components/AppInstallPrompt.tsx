import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppInstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const dismissed = typeof window !== "undefined" && localStorage.getItem("aw-install-dismissed");

  useEffect(() => {
    if (dismissed) return;

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const android = /android/i.test(ua);

    if (ios || android) {
      setIsIOS(ios);
      setTimeout(() => setShow(true), 3000);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (android) setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("aw-install-dismissed", "1");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom">
      <div className="max-w-md mx-auto bg-zinc-900 border border-white/15 rounded-2xl p-4 shadow-2xl flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <span className="font-black text-base text-white select-none">𝐀𝐖</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Add to Home Screen</p>
          <p className="text-white/60 text-xs mt-0.5">
            {isIOS
              ? 'Tap the Share icon then "Add to Home Screen" for the best experience.'
              : "Install the app for faster access and offline browsing."}
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
