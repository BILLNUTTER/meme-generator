import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Camera } from "lucide-react";

export function Header() {
  const [location] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors duration-300">
            <Camera className="w-5 h-5 text-white/80" />
          </div>
          <span className="font-display text-xl font-medium tracking-widest uppercase text-white/90">
            Aesthetic
          </span>
        </Link>
        
        <nav className="flex items-center gap-6">
          <Link 
            href="/" 
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              location === "/" ? "text-white" : "text-muted-foreground hover:text-white"
            )}
          >
            Gallery
          </Link>
          <Link 
            href="/admin" 
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              location === "/admin" ? "text-white" : "text-muted-foreground hover:text-white"
            )}
          >
            Admin
          </Link>
        </nav>
      </div>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  );
}
