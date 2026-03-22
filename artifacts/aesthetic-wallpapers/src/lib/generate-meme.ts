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

  const maxWidth = size - 80;
  const minFillRatio = 2 / 3; // first line must fill at least 2/3 of canvas

  // Initial font size estimate based on character count
  let fontSize =
    text.length > 140 ? 56 :
    text.length > 80  ? 70 :
    text.length > 40  ? 88 :
    text.length > 20  ? 108 : 130;

  ctx.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Word-wrap helper
  function wrapText(fs: number): string[] {
    ctx.font = `${fs}px Impact, "Arial Black", sans-serif`;
    const words = text.split(" ");
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
    result.push(line);
    return result;
  }

  // Check if text fits on a single line at current font
  const singleLineWidth = ctx.measureText(text).width;
  const targetFill = size * minFillRatio; // 720px = 2/3 of 1080

  if (singleLineWidth <= maxWidth) {
    // Text fits on one line — scale up font so it fills at least 2/3 of canvas
    if (singleLineWidth < targetFill) {
      const scaledUp = Math.floor(fontSize * (targetFill / singleLineWidth));
      fontSize = Math.min(scaledUp, 220); // cap to avoid overshooting canvas
    }
  } else {
    // Text needs wrapping — check if first line fills at least 2/3
    // If not, slightly increase font (will cause more lines but each line is wider)
    // Only scale up if current first line is very short
    const lines = wrapText(fontSize);
    const firstLineWidth = ctx.measureText(lines[0]).width;
    if (firstLineWidth < targetFill && fontSize < 140) {
      // Try nudging font up until first line hits 2/3
      let tryFont = fontSize;
      while (tryFont < 220) {
        tryFont += 4;
        const tryLines = wrapText(tryFont);
        const tryFirstWidth = ctx.measureText(tryLines[0]).width;
        if (tryFirstWidth >= targetFill) { fontSize = tryFont; break; }
      }
    }
  }

  // Final word-wrap at chosen font size
  const lines = wrapText(fontSize);

  const lineH = fontSize * 1.22;
  const totalH = lines.length * lineH;
  const startY = (size - totalH) / 2 + lineH / 2;

  lines.forEach((l, i) => {
    const y = startY + i * lineH;
    ctx.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.lineWidth = fontSize * 0.12;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000000";
    ctx.strokeText(l, size / 2, y, maxWidth);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(l, size / 2, y, maxWidth);
  });

  return canvas.toDataURL("image/jpeg", 0.93);
}

/** Compute preview font size that matches the 2/3-fill rule for CSS previews */
export function previewFontSize(text: string, containerPx: number): number {
  if (!text.trim()) return 24;
  const charsPerLine = Math.round(containerPx / 14); // rough chars that fit at 14px
  const words = text.split(" ");
  const longestLine = words.reduce((acc, w) => {
    const test = acc + (acc ? " " : "") + w;
    return test.length <= charsPerLine ? test : acc;
  }, "");
  const fillRatio = longestLine.length / text.length;

  // Scale so the first line fills ~2/3 of container
  const base =
    text.length > 140 ? 11 :
    text.length > 80  ? 14 :
    text.length > 35  ? 18 :
    text.length > 20  ? 22 : 28;

  // If text is very short (fits on one line), push font up to fill 2/3
  if (text.length <= 20) return Math.min(42, Math.round(containerPx * 0.67 / (text.length * 0.6)));
  return base;
}
