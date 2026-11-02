// PWA ikonice iz public/logo.png (500×500): 192, 512, maskable 512 i apple-touch-icon 180.
//   node scripts/ux/make-icons.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = path.resolve("public/logo.png");
const OUT = path.resolve("public/icons");
// Ista boja kao dark --page-bg i theme_color u app/manifest.ts.
const BACKGROUND = "#0a0a0a";

fs.mkdirSync(OUT, { recursive: true });

async function icon(file, size, { scale = 1, background = null } = {}) {
  const inner = Math.round(size * scale);
  const logo = await sharp(SOURCE).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  await canvas
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file));
  console.log(`${file} ${size}×${size}`);
}

// "any": logo preko cele površine na tamnoj pozadini (ikonica mora da se vidi i na svetlom launcher-u).
await icon("icon-192.png", 192, { scale: 0.86, background: BACKGROUND });
await icon("icon-512.png", 512, { scale: 0.86, background: BACKGROUND });
// "maskable": sadržaj u bezbednoj zoni (80%), launcher seče ivice.
await icon("icon-maskable-512.png", 512, { scale: 0.72, background: BACKGROUND });
// iOS ne podržava providnost na home screen ikonici.
await icon("apple-touch-icon.png", 180, { scale: 0.86, background: BACKGROUND });
