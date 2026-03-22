import { Link } from "wouter";
import { MessageCircle, Image as ImageIcon, Smile, Video, Link2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center font-display text-lg text-white">
                AW
              </div>
              <span className="font-display text-xl tracking-widest uppercase text-white">Aesthetic</span>
            </div>
            <p className="text-white/45 text-sm leading-relaxed max-w-sm mb-6">
              Your daily source of aesthetic wallpapers, trending memes, and viral TikTok videos — 
              all curated and available to download without watermarks after a free signup.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: ImageIcon, label: "Wallpapers",          color: "text-blue-400"   },
                { icon: Smile,     label: "Meme Generator",      color: "text-yellow-400" },
                { icon: Video,     label: "TikTok Downloads",    color: "text-pink-400"   },
                { icon: Link2,     label: "Link Downloader",     color: "text-violet-400" },
              ].map(({ icon: Icon, label, color }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-white/50 bg-white/5 border border-white/8 px-3 py-1.5 rounded-full">
                  <Icon className={`w-3 h-3 ${color}`} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-5">Navigation</h4>
            <ul className="space-y-3">
              {[
                { label: "Home",      href: "/"          },
                { label: "Login",     href: "/login"     },
                { label: "Register",  href: "/register"  },
                { label: "Dashboard", href: "/dashboard" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-white/50 hover:text-white transition-colors duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-5">Community</h4>
            <a
              href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm text-green-400 hover:text-green-300 transition-colors duration-200 mb-4"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              WhatsApp Channel
            </a>
            <p className="text-white/30 text-xs leading-relaxed">
              Follow our WhatsApp channel for daily curated drops — new wallpapers, memes and TikToks every day.
            </p>

            <div className="mt-8">
              <h4 className="text-xs uppercase tracking-widest text-white/30 font-semibold mb-3">Pricing</h4>
              <p className="text-white/40 text-xs leading-relaxed">
                Free account · 3 TikTok downloads/month<br />
                <span className="text-violet-400 font-medium">Unlimited TikTok — Ksh 70/mo</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-display italic text-white/25 text-sm">
            Curated with love · Nutterx Technologies · 2026
          </p>
          <p className="text-white/20 text-xs">
            All content is for personal use only.
          </p>
        </div>
      </div>
    </footer>
  );
}
