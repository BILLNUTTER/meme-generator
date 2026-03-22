import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { LogOut, LayoutDashboard } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export function Header() {
  const [location, navigate] = useLocation();
  const isDashboard = location.startsWith("/dashboard");
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("userInfo");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { setUser(null); }
    }
    const onAuthChange = () => {
      const r = localStorage.getItem("userInfo");
      setUser(r ? JSON.parse(r) : null);
    };
    window.addEventListener("auth-change", onAuthChange);
    return () => window.removeEventListener("auth-change", onAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userInfo");
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-300">
            <span className="font-black text-sm text-white/90 tracking-tight select-none">𝐀</span>
          </div>
          <span className="font-display text-xl font-medium tracking-widest uppercase text-white/90">
            𝐀𝐄𝐒𝐓𝐓𝐇𝐄𝐓𝐈𝐂𝐒
          </span>
        </Link>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-white/60 hidden sm:block">
                Hi, <span className="text-white/90 font-medium">{user.name.split(" ")[0]}</span>
              </span>
              {!isDashboard && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors duration-200"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">My Gallery</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors duration-200 bg-white/5 px-3 py-2 rounded-full hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            !isDashboard && (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium transition-colors duration-200 text-muted-foreground hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium transition-colors duration-200 text-white bg-white/10 px-4 py-2 rounded-full hover:bg-white/20"
                >
                  Register Free
                </Link>
              </>
            )
          )}
        </nav>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  );
}
