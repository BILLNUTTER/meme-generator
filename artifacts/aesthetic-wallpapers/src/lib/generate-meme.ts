export function generateMemeImage(text: string): string {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, size, size);

  // Watermark
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const wm = "Nutterx Technologies";
  const wmW = 200;
  const wmH = 85;
  for (let row = -3; row < size / wmH + 3; row++) {
    for (let col = -3; col < size / wmW + 3; col++) {
      const x = col * wmW + (row % 2 === 0 ? 0 : wmW / 2);
      const y = row * wmH;
      ctx.save();
      ctx.translate(x + wmW / 2, y + wmH / 2);
      ctx.rotate(-Math.PI / 3);
      ctx.fillText(wm, -wmW / 2, 0);
      ctx.restore();
    }
  }
  ctx.restore();

  const leftMargin = 40;
  const maxWidth = size - leftMargin - 40; // 1000px usable

  // Normalise: collapse explicit newlines / extra spaces into single spaces
  const clean = text.trim().replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Greedy word-wrap at a given font size
  function wrapText(fs: number): string[] {
    ctx.font = `${fs}px Impact, "Arial Black", sans-serif`;
    const words = clean.split(" ");
    const result: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
    return result;
  }

  // ── Strategy ──────────────────────────────────────────────────────────────
  // 1. Try to keep text on ONE line. Calculate the largest font that fits the
  //    entire text in maxWidth without any wrapping.
  // 2. If that font would be smaller than MIN_1LINE (too small to read),
  //    accept two lines and find the largest font for 2-line layout.
  // 3. Hard-cap at 2 lines.

  const MAX_FONT = 210;
  const MIN_1LINE = 68;  // Below this we fall back to 2 lines
  const MIN_FONT  = 36;  // Absolute floor

  ctx.font = `${MAX_FONT}px Impact, "Arial Black", sans-serif`;
  const fullWidth = ctx.measureText(clean).width;

  // Largest font that fits the whole text on a single line
  const singleLineFont = Math.floor(MAX_FONT * (maxWidth / fullWidth));

  let fontSize: number;
  let lines: string[];

  if (singleLineFont >= MIN_1LINE) {
    // ── 1-line layout ──────────────────────────────────────────────────────
    // Cap so short text doesn't become absurdly huge
    fontSize = Math.min(singleLineFont, MAX_FONT);
    lines = wrapText(fontSize); // should always be 1, but recalc for safety
  } else {
    // ── 2-line layout ──────────────────────────────────────────────────────
    // Start from the font that would theoretically halve the line width,
    // then shrink until it actually wraps into ≤ 2 lines.
    fontSize = Math.min(Math.floor(singleLineFont * 1.8), MAX_FONT);
    lines = wrapText(fontSize);
    while (lines.length > 2 && fontSize > MIN_FONT) {
      fontSize -= 4;
      lines = wrapText(fontSize);
    }
    if (lines.length > 2) lines = lines.slice(0, 2);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const lineH   = fontSize * 1.22;
  const totalH  = lines.length * lineH;
  const startY  = (size - totalH) / 2 + lineH / 2;

  lines.forEach((l, i) => {
    const y = startY + i * lineH;
    ctx.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
    ctx.shadowColor   = "transparent";
    ctx.shadowBlur    = 0;
    ctx.lineWidth     = fontSize * 0.12;
    ctx.lineJoin      = "round";
    ctx.strokeStyle   = "#000000";
    ctx.strokeText(l, leftMargin, y, maxWidth);
    ctx.fillStyle     = "#ffffff";
    ctx.fillText(l, leftMargin, y, maxWidth);
  });

  return canvas.toDataURL("image/jpeg", 0.93);
}
