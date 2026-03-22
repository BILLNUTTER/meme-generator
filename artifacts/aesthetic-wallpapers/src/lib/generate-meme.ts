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
  const maxWidth = size - leftMargin - 40; // usable width

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Word-wrap helper — returns lines at a given font size
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
    if (line) result.push(line);
    return result;
  }

  // Start with a large font and shrink until text fits in at most 2 lines
  const MAX_LINES = 2;
  const MIN_FONT = 40;
  let fontSize = 160; // start large — will shrink as needed

  let lines = wrapText(fontSize);

  // Shrink font until we get ≤ 2 lines
  while (lines.length > MAX_LINES && fontSize > MIN_FONT) {
    fontSize -= 4;
    lines = wrapText(fontSize);
  }

  // Hard cap: if still more than 2 lines at minimum font, keep first 2 lines
  if (lines.length > MAX_LINES) {
    lines = lines.slice(0, MAX_LINES);
  }

  // If text fits on 1 line and is shorter than 2/3 of canvas, scale up the font
  if (lines.length === 1) {
    ctx.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
    const lineWidth = ctx.measureText(lines[0]).width;
    const targetWidth = maxWidth * (2 / 3);
    if (lineWidth < targetWidth) {
      const scaled = Math.floor(fontSize * (targetWidth / lineWidth));
      const cappedFont = Math.min(scaled, 220);
      // Make sure scaling doesn't accidentally push to 2 lines
      const scaledLines = wrapText(cappedFont);
      if (scaledLines.length <= MAX_LINES) {
        fontSize = cappedFont;
        lines = scaledLines;
      }
    }
  }

  // Draw text
  ctx.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
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
    ctx.strokeText(l, leftMargin, y, maxWidth);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(l, leftMargin, y, maxWidth);
  });

  return canvas.toDataURL("image/jpeg", 0.93);
}
