// Pikselsko poređenje dva foldera screenshotova (isti nazivi fajlova), preko Chrome canvas-a.
//
//   node scripts/ux/diff-shots.mjs <pre-folder> <posle-folder> [--out <folder za diff slike>]
//
// Za svaki par ispisuje broj različitih piksela; razlike crta crveno u --out folderu.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";

const { values: args, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
const [beforeDir, afterDir] = positionals;
if (!beforeDir || !afterDir) {
  console.error("Upotreba: node scripts/ux/diff-shots.mjs <pre> <posle> [--out <folder>]");
  process.exit(1);
}
if (args.out) fs.mkdirSync(args.out, { recursive: true });

const files = fs.readdirSync(beforeDir).filter((name) => name.endsWith(".png") && fs.existsSync(path.join(afterDir, name)));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
let changed = 0;

for (const name of files) {
  const toUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
  const result = await page.evaluate(
    async ([a, b, wantImage]) => {
      const load = (src) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      const [imgA, imgB] = await Promise.all([load(a), load(b)]);
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        return { size: `${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height}`, diff: -1 };
      }
      const canvas = (img) => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return [c, ctx.getImageData(0, 0, img.width, img.height)];
      };
      const [outCanvas, dataA] = canvas(imgA);
      const [, dataB] = canvas(imgB);
      let diff = 0;
      for (let i = 0; i < dataA.data.length; i += 4) {
        const delta =
          Math.abs(dataA.data[i] - dataB.data[i]) +
          Math.abs(dataA.data[i + 1] - dataB.data[i + 1]) +
          Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
        if (delta > 24) {
          diff += 1;
          dataA.data[i] = 255;
          dataA.data[i + 1] = 0;
          dataA.data[i + 2] = 0;
        }
      }
      if (!wantImage || diff === 0) return { diff };
      outCanvas.getContext("2d").putImageData(dataA, 0, 0);
      return { diff, image: outCanvas.toDataURL("image/png") };
    },
    [toUrl(path.join(beforeDir, name)), toUrl(path.join(afterDir, name)), Boolean(args.out)],
  );
  if (result.diff !== 0) changed += 1;
  console.log(`${result.diff === 0 ? "ISTO " : "RAZL "} ${name}  ${result.size ?? `${result.diff} px`}`);
  if (result.image && args.out) {
    fs.writeFileSync(path.join(args.out, name), Buffer.from(result.image.split(",")[1], "base64"));
  }
}

await browser.close();
console.log(`\n${files.length} parova, ${changed} sa razlikom.`);
process.exit(changed ? 1 : 0);
