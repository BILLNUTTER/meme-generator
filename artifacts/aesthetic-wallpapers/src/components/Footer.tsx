import { MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-display italic text-white/25 text-sm">
          Nutterx Technologies · 2026
        </p>
        <a
          href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-green-500/60 hover:text-green-400 text-xs transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Channel
        </a>
      </div>
    </footer>
  );
}
