// Integracioni testovi ekstrakcije: poredi izlaz extractReceipt (logika rute
// /api/receipt-extract) sa ocekivanim vrednostima iz docs/uzorci-priznanica/ocekivano.md.
// NE ulaze u default `npm test` (vitest.config.ts ih iskljucuje) — pokrecu se sa
// `npm run test:receipts` i zahtevaju pokrenutu lokalnu Ollamu + uzorke slika.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { extractReceipt, DEFAULT_OLLAMA_URL } from "./receiptExtract";
import { canonicalPhone, foldName } from "./receiptMatcher";

type Expected = { imePrimaoca: string; telefonPrimaoca: string; brojPosiljke: string };

const OLLAMA_URL = process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL;
const samplesDir = path.resolve(process.cwd(), "docs", "uzorci-priznanica");
const expectedPath = path.join(samplesDir, "ocekivano.md");

function loadExpected(): Record<string, Expected> {
  const markdown = fs.readFileSync(expectedPath, "utf8");
  const fence = markdown.match(/```json\s*([\s\S]*?)```/);
  if (!fence) throw new Error(`Nema \`\`\`json bloka u ${expectedPath}`);
  return JSON.parse(fence[1]) as Record<string, Expected>;
}

const samplesReady = fs.existsSync(expectedPath);
const ollamaUp = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })
  .then((r) => r.ok)
  .catch(() => false);

if (!samplesReady) {
  console.warn(`[receiptExtract.integration] Preskacem: nema ${expectedPath}`);
}
if (!ollamaUp) {
  console.warn(`[receiptExtract.integration] Preskacem: Ollama nije dostupna na ${OLLAMA_URL}`);
}

describe.skipIf(!samplesReady || !ollamaUp)("ekstrakcija AKS priznanica (Ollama qwen2.5vl)", () => {
  const expected = samplesReady ? loadExpected() : {};

  for (const [filename, want] of Object.entries(expected)) {
    const imagePath = path.join(samplesDir, filename);
    const imageExists = fs.existsSync(imagePath);
    if (!imageExists) {
      console.warn(`[receiptExtract.integration] Preskacem ${filename}: slika nije u ${samplesDir}`);
    }

    it.skipIf(!imageExists)(filename, async () => {
      const base64 = fs.readFileSync(imagePath).toString("base64");
      const actual = await extractReceipt(base64);

      // Tolerantna poredjenja: cifre za broj, kanonski telefon, folded ime
      // (velika/mala slova, dijakritike, cirilica -> sve normalizovano).
      expect(actual.brojPosiljke.replace(/\D/g, "")).toBe(want.brojPosiljke.replace(/\D/g, ""));
      expect(canonicalPhone(actual.telefonPrimaoca)).toBe(canonicalPhone(want.telefonPrimaoca));
      expect(foldName(actual.imePrimaoca)).toBe(foldName(want.imePrimaoca));
    });
  }
});
