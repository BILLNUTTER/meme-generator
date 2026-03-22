export function generateMemeImage(text: string): string {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, size, size);

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

  const maxWidth = size - 100;
  let fontSize = text.length > 140 ? 56 : text.length > 80 ? 70 : text.length > 40 ? 88 : text.length > 20 ? 108 : 130;
  ctx.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  lines.push(line);

  const lineH = fontSize * 1.22;
  const totalH = lines.length * lineH;
  const startY = (size - totalH) / 2 + lineH / 2;
  lines.forEach((l, i) => {
    const y = startY + i * lineH;
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

export function MemeMiniPreview({ text }: { text: string }) {
  return null;
}
