import { motion, AnimatePresence } from "framer-motion";
import { Download, X, CheckCircle2, Loader2 } from "lucide-react";

export interface DownloadItem {
  id: string;
  filename: string;
  progress: number;
  done: boolean;
  error?: boolean;
}

interface Props {
  downloads: DownloadItem[];
  onDismiss: (id: string) => void;
}

export function DownloadProgressBar({ downloads, onDismiss }: Props) {
  if (downloads.length === 0) return null;

  const visible = downloads.slice(-3);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[min(92vw,400px)]">
      <AnimatePresence>
        {visible.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="bg-zinc-900/98 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3 mb-2.5">
              {item.error ? (
                <X className="w-4 h-4 text-red-400 shrink-0" />
              ) : item.progress === 100 || item.done ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : item.progress === -1 ? (
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
              )}

              <span className="text-white/90 text-xs font-medium truncate flex-1">
                {item.filename}
              </span>

              {item.progress >= 0 && !item.error && (
                <span className="text-white/40 text-xs font-mono tabular-nums shrink-0">
                  {item.progress === -1 ? "…" : `${item.progress}%`}
                </span>
              )}

              {(item.done || item.error || item.progress === 100) && (
                <button
                  onClick={() => onDismiss(item.id)}
                  className="shrink-0 ml-1 text-white/30 hover:text-white/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
              <motion.div
                animate={{
                  width: item.progress === -1 ? "60%" : `${Math.max(item.progress, 2)}%`,
                }}
                transition={{ ease: "easeOut", duration: 0.3 }}
                className={`h-full rounded-full ${
                  item.error
                    ? "bg-red-500"
                    : item.progress === 100 || item.done
                    ? "bg-green-400"
                    : "bg-gradient-to-r from-orange-500 to-amber-400"
                } ${item.progress === -1 ? "animate-pulse" : ""}`}
              />
            </div>

            {(item.progress === 100 || item.done) && !item.error && (
              <p className="text-green-400/70 text-[11px] mt-1.5">Saved to Downloads ✓</p>
            )}
            {item.error && (
              <p className="text-red-400/70 text-[11px] mt-1.5">Download failed — try again</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
