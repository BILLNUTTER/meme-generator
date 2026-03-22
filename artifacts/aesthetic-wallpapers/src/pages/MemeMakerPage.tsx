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

export function MemeMakerPage() {
  const [, setLocation] = useLocation();
  const { isReady, isAuthenticated } = useUserAuth();
  const [text, setText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "meme-nutterx.jpg";
    a.click();
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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" /> Always free · No limits
          </div>
          <h1 className="font-display text-4xl sm:text-6xl text-white mb-3">
            Meme <span className="italic text-yellow-400">Maker</span>
          </h1>
          <p className="text-white/40 text-lg">
            Type your text, generate a 1080×1080 meme image, and download it instantly.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6">
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
                placeholder="Type your meme text here…&#10;&#10;Tip: Keep it short and punchy for best results!"
                rows={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none transition-colors"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/20">{text.length} chars</span>
                <span className="text-xs text-white/20">
                  {text.length > 140 ? "Very long — text will be small" : text.length > 80 ? "Long" : text.length > 40 ? "Medium" : text.length > 0 ? "Short — big text" : ""}
                </span>
              </div>
            </div>

            <Button
              onClick={generate}
              disabled={!text.trim() || isGenerating}
              className="w-full h-12 text-base bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              {isGenerating ? "Generating…" : "Generate Meme"}
            </Button>

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
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
              <p className="text-xs font-semibold text-white/50">Tips for great memes</p>
              <ul className="text-xs text-white/30 space-y-1">
                <li>• Short text = BIG bold letters (most impactful)</li>
                <li>• Classic black background with white Impact font</li>
                <li>• Works best under 12 words</li>
                <li>• Download is free, always — no limits</li>
              </ul>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-white/30 uppercase tracking-wider">Preview</p>
            <motion.div
              className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center"
              animate={{ opacity: 1 }}
            >
              {previewUrl ? (
                <motion.img
                  key={previewUrl}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={previewUrl}
                  alt="Meme preview"
                  className="w-full h-full object-contain"
                />
              ) : text.trim() ? (
                <div className="w-full h-full bg-[#080808] flex items-center justify-center p-4">
                  <p
                    className="text-white text-center leading-tight w-full"
                    style={{
                      fontSize:
                        text.length > 120 ? "clamp(9px, 1.8vw, 11px)" :
                        text.length > 70  ? "clamp(11px, 2.4vw, 14px)" :
                        text.length > 40  ? "clamp(14px, 3vw, 18px)" :
                        text.length > 20  ? "clamp(18px, 3.8vw, 26px)" :
                        text.length > 10  ? "clamp(26px, 5.5vw, 38px)" :
                                            "clamp(34px, 7vw, 52px)",
                      fontFamily: "Impact, 'Arial Black', sans-serif",
                      overflowWrap: "break-word",
                      wordBreak: "break-word",
                      WebkitTextStroke: "0.5px #000",
                      textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
                      minWidth: text.length <= 20 ? "67%" : undefined,
                    }}
                  >
                    {text}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-white/20 text-sm mb-2">Your meme preview</p>
                  <p className="text-white/10 text-xs">Type text on the left to see a preview</p>
                </div>
              )}
            </motion.div>
            {previewUrl && (
              <p className="text-xs text-white/20 text-center">
                Tap Generate again to update after editing · Subtle watermark embedded
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
