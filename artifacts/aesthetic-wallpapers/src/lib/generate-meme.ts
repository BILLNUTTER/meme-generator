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

  // ── Text rendering ────────────────────────────────────────────────────────
  const FONT_SIZE  = 35;
  const FONT       = `${FONT_SIZE}px Impact, "Arial Black", sans-serif`;
  const LEFT       = 40;
  const MAX_W      = size - LEFT - 40;   // 1000px usable width
  const LINE_H     = FONT_SIZE * 1.4;

  ctx.font          = FONT;
  ctx.textAlign     = "left";
  ctx.textBaseline  = "top";

  // Greedy word-wrap: fill each line completely before starting the next
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > MAX_W && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  // Vertically center the text block
  const totalH = lines.length * LINE_H;
  const startY = (size - totalH) / 2;

  // Draw each line — black stroke outline + white fill
  lines.forEach((line, i) => {
    const y = startY + i * LINE_H;
    ctx.font        = FONT;
    ctx.lineWidth   = FONT_SIZE * 0.12;
    ctx.lineJoin    = "round";
    ctx.strokeStyle = "#000000";
    ctx.strokeText(line, LEFT, y, MAX_W);
    ctx.fillStyle   = "#ffffff";
    ctx.fillText(line, LEFT, y, MAX_W);
  });

  return canvas.toDataURL("image/jpeg", 0.93);
}
