import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forceDownload } from "@/lib/utils";
import type { Image } from "@workspace/api-client-react/src/generated/api.schemas";

interface LightboxProps {
  images: Image[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownloadClick?: (image: Image) => void;
}

export function Lightbox({ images, currentIndex, isOpen, onClose, onNavigate, onDownloadClick }: LightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((currentIndex - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onNavigate((currentIndex + 1) % images.length);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  const currentImage = images[currentIndex];

  const handleDownload = () => {
    if (!currentImage) return;
    if (onDownloadClick) {
      onDownloadClick(currentImage);
      return;
    }
    const filename = currentImage.title 
      ? `${currentImage.title.toLowerCase().replace(/\s+/g, '-')}.jpg` 
      : `aesthetic-${currentImage.id}.jpg`;
    forceDownload(currentImage.url, filename);
  };

  return (
    <AnimatePresence>
      {isOpen && currentImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl"
        >
          {/* Controls */}
          <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
            <Button variant="glass" size="icon" onClick={handleDownload} className="rounded-full rounded-full w-12 h-12">
              <Download className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="icon" onClick={onClose} className="rounded-full w-12 h-12">
              <X className="w-6 h-6" />
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-6 z-50 w-14 h-14 rounded-full bg-black/20 hover:bg-black/40 text-white border border-white/10"
            onClick={() => onNavigate((currentIndex - 1 + images.length) % images.length)}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-6 z-50 w-14 h-14 rounded-full bg-black/20 hover:bg-black/40 text-white border border-white/10"
            onClick={() => onNavigate((currentIndex + 1) % images.length)}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>

          {/* Main Image */}
          <motion.div
            key={currentImage.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-[90vw] max-h-[90vh]"
          >
            <img
              src={currentImage.url}
              alt={currentImage.title || "Wallpaper"}
              className="max-w-full max-h-[90vh] object-contain rounded-sm shadow-2xl"
            />
            {currentImage.title && (
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <h2 className="font-display text-2xl md:text-4xl text-white">{currentImage.title}</h2>
                <p className="text-white/60 mt-2 uppercase tracking-widest text-xs">{currentImage.category}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
