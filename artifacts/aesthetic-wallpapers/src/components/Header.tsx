import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LogOut, LayoutDashboard, Menu, X,
  ImageIcon, Laugh, Music, Download, Wand2,
} from "lucide-react";

interface UserInfo { id: string; name: string; email: string; }

const NAV_LINKS = [
  { href: "/wallpapers",      label: "Wallpapers",   icon: ImageIcon },
  { href: "/memes",           label: "Memes",        icon: Laugh     },
  { href: "/tiktoks",         label: "TikToks",      icon: Music     },
  { href: "/tiktok-download", label: "TikTok DL",   icon: Download  },
  { href: "/meme-maker",      label: "Meme Maker",   icon: Wand2     },
];

export function Header() {
  const [location, navigate] = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isDashboard = location.startsWith("/dashboard");

  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem("userInfo");
      setUser(raw ? JSON.parse(raw) : null);
    };
    load();
    window.addEventListener("auth-change", load);
    return () => window.removeEventListener("auth-change", load);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userInfo");
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
    navigate("/");
  };

  const isActive = (href: string) => location === href || location.startsWith(href);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-foreground/5 border border-foreground/10 flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
              <span className="font-black text-xs text-foreground/90 select-none">𝐀</span>
            </div>
            <span className="font-display text-base font-semibold tracking-widest uppercase text-foreground/90 hidden sm:block">
              𝐀𝐄𝐒𝐓𝐇𝐄𝐓𝐈𝐂𝐒
            </span>
          </Link>

          {/* Desktop nav — only when logged in */}
          {user && (
            <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive(href)
                      ? "bg-orange-500/15 text-orange-600 border border-orange-500/20"
                      : "text-foreground/50 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <span className="text-sm text-foreground/60 hidden md:block">
                  <span className="text-foreground/90 font-medium">{user.name.split(" ")[0]}</span>
                </span>
                {!isDashboard && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-foreground/8"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-foreground/8"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
                {/* Mobile hamburger */}
                <button
                  className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/8 transition-colors"
                  onClick={() => setMenuOpen(o => !o)}
                >
                  {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-foreground/8"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 px-4 py-1.5 rounded-lg transition-colors"
                >
                  Join Free
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Bottom divider */}
        <div className="h-px w-full bg-foreground/5" />
      </header>

      {/* Mobile slide-down menu */}
      {menuOpen && user && (
        <div className="fixed top-16 left-0 right-0 z-[39] glass border-b border-foreground/8 py-3 px-4 lg:hidden">
          <nav className="flex flex-col gap-1 max-w-7xl mx-auto">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(href)
                    ? "bg-orange-500/15 text-orange-600"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/6"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
