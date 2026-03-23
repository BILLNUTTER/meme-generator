import { Link } from "wouter";
import { MessageCircle, ExternalLink } from "lucide-react";

const LINKS = {
  explore: [
    { label: "Wallpapers",      href: "/wallpapers"      },
    { label: "Meme Gallery",    href: "/memes"           },
    { label: "TikTok Gallery",  href: "/tiktoks"         },
    { label: "TikTok Download", href: "/tiktok-download" },
    { label: "Meme Maker",      href: "/meme-maker"      },
  ],
  account: [
    { label: "Dashboard",  href: "/dashboard" },
    { label: "Login",      href: "/login"     },
    { label: "Register",   href: "/register"  },
  ],
};

export function Footer() {
  return (
    <footer className="mt-16 border-t border-foreground/6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/">
              <span className="font-display text-lg font-semibold tracking-widest uppercase text-foreground/90">
                𝐀𝐄𝐒𝐓𝐇𝐄𝐓𝐈𝐂𝐒
              </span>
            </Link>
            <p className="mt-3 text-xs text-foreground/40 leading-relaxed max-w-[200px]">
              Premium wallpapers, memes &amp; TikTok downloads — no watermarks.
            </p>
            <a
              href="https://whatsapp.com/channel/0029Vb6rOQtEAKW7qpF7w50d"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs text-green-500/70 hover:text-green-400 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp Channel
              <ExternalLink className="w-3 h-3 opacity-50" />
            </a>
          </div>

          {/* Explore */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-4">Explore</p>
            <ul className="space-y-2.5">
              {LINKS.explore.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-foreground/55 hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-4">Account</p>
            <ul className="space-y-2.5">
              {LINKS.account.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-foreground/55 hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-4">Support</p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://wa.me/254713881613"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground/55 hover:text-foreground transition-colors"
                >
                  WhatsApp Support
                </a>
              </li>
              <li>
                <span className="text-sm text-foreground/30">Ksh 70 / month</span>
              </li>
              <li>
                <span className="text-sm text-foreground/30">TikTok Premium</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-foreground/6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-foreground/30">
            &copy; 2026 Nutterx Technologies · All rights reserved
          </p>
          <p className="text-xs text-foreground/20 italic font-display">
            Curated aesthetic content, daily.
          </p>
        </div>
      </div>
    </footer>
  );
}
