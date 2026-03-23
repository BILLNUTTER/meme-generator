import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, Download, RefreshCw, Sparkles, Type } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { generateMemeImage } from "@/lib/generate-meme";

const PROMPTS = [
  "When the WiFi drops for 2 seconds and you think your whole life is over",
  "Me: I'll just watch one video. YouTube at 3am:",
  "POV: You forgot to save the document",
  "My brain at midnight when I have to wake up at 6am",
  "When someone says 'it'll only take 5 minutes'",
  "Monday morning vs Friday afternoon",
  "When the code works and you have no idea why",
  "That feeling when you finally find the bug",
];

const MEME_DL_KEY = "meme-dl-count";
const MEME_DL_LIMIT = 50;

function getMemeDownloadCount(): number {
  try { return parseInt(localStorage.getItem(MEME_DL_KEY) || "0", 10); } catch { return 0; }
}
function incrementMemeDownloadCount(): number {
  const next = getMemeDownloadCount() + 1;
  try { localStorage.setItem(MEME_DL_KEY, String(next)); } catch {}
  return next;
}

export function MemeMakerPage() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated } = useUserAuth();
  const [text, setText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isReady && !isAuthenticated) setLocation("/login");
  }, [isReady, isAuthenticated, setLocation]);

  const generate = () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const dataUrl = generateMemeImage(text);
      setPreviewUrl(dataUrl);
      setIsGenerating(false);
    }, 50);
  };

  const download = () => {
    if (!previewUrl) return;
    const count = incrementMemeDownloadCount();
    if (count > MEME_DL_LIMIT) {
      setShowPaywall(true);
      return;
    }
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "meme-nutterx.jpg";
    a.click();
    if (count === MEME_DL_LIMIT) {
      setShowPaywall(true);
    }
  };

  const randomPrompt = () => {
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setText(prompt);
    setPreviewUrl(null);
  };

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col pt-20 bg-background">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium mb-3">
            <Sparkles className="w-3 h-3" /> Always free · No limits
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-2">
            Meme <span className="italic text-yellow-400">Maker</span>
          </h1>
          <p className="text-white/40 text-sm">
            Type your text, generate a 1080×1080 meme, download instantly.
          </p>
        </div>

        <div className="space-y-4">
          {/* Text input */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-2">
                <Type className="w-3.5 h-3.5" /> Meme Text
              </label>
              <button
                onClick={randomPrompt}
                className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Random idea
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); setPreviewUrl(null); }}
              placeholder="Type your meme text here…&#10;&#10;Short & punchy = BIG bold letters!"
              rows={4}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none transition-colors"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-white/20">{text.length} chars</span>
              <span className="text-xs text-white/20">
                {text.length > 140 ? "Very long — font auto-shrinks" : text.length > 80 ? "Long — wraps naturally" : text.length > 40 ? "Medium — fits neatly" : text.length > 0 ? "Short — big bold text" : ""}
              </span>
            </div>
          </div>

          {/* Live preview — matches the generated image exactly */}
          {text.trim() && !previewUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden bg-[#080808] border border-white/10"
              style={{ aspectRatio: "1080 / 800", maxHeight: "260px" }}
            >
              <div className="w-full h-full flex items-center justify-start px-[3.7%]">
                <p
                  className="text-white text-left w-full"
                  style={{
                    fontSize: "3.24%",
                    lineHeight: "1.4",
                    fontFamily: "Impact, 'Arial Black', sans-serif",
                    overflowWrap: "break-word",
                    wordBreak: "break-word",
                    WebkitTextStroke: "0.5px #000",
                    textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
                  }}
                >
                  {text}
                </p>
              </div>
            </motion.div>
          )}

          {/* Generated image preview */}
          {previewUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl overflow-hidden border border-white/10"
              style={{ maxHeight: "300px", aspectRatio: "1080 / 800" }}
            >
              <img
                src={previewUrl}
                alt="Meme preview"
                className="w-full h-full object-contain bg-black"
              />
            </motion.div>
          )}

          {/* Generate button */}
          <Button
            onClick={generate}
            disabled={!text.trim() || isGenerating}
            className="w-full h-12 text-base bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          >
            {isGenerating ? "Generating…" : "Generate Meme"}
          </Button>

          {/* Download button */}
          {previewUrl && (
            <Button
              onClick={download}
              variant="outline"
              className="w-full h-12 text-base border-white/20 hover:border-white/40 gap-2"
            >
              <Download className="w-5 h-5" /> Download JPG (1080×1080)
            </Button>
          )}

          {/* Tips */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-1.5">
            <p className="text-xs font-semibold text-white/50">Tips for great memes</p>
            <ul className="text-xs text-white/30 space-y-1">
              <li>• Short text = BIG bold letters (most impactful)</li>
              <li>• Classic black background with white Impact font</li>
              <li>• Download is free · watermark embedded</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />

      {/* Meme download paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 text-center space-y-4"
          >
            <div className="text-3xl">🎉</div>
            <h2 className="font-display text-xl text-white">You've made {MEME_DL_LIMIT} memes!</h2>
            <p className="text-white/50 text-sm">
              Pay a small fee of <span className="text-white font-bold">Ksh 20</span> to keep downloading memes without limits.
            </p>
            <Button
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
              onClick={() => { setShowPaywall(false); setLocation("/pay"); }}
            >
              Pay Ksh 20 to Continue
            </Button>
            <button
              onClick={() => setShowPaywall(false)}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
