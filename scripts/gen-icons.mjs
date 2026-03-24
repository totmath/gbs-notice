import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

for (const size of [192, 512]) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#6366f1";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${size * 0.35}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("공지", size / 2, size / 2);
  writeFileSync(`public/icons/icon-${size}.png`, canvas.toBuffer("image/png"));
  console.log(`icon-${size}.png 생성 완료`);
}
