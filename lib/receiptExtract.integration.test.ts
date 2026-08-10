// Integracioni testovi ekstrakcije: poredi izlaz extractReceipt (logika rute
// /api/receipt-extract) sa ocekivanim vrednostima iz docs/uzorci-priznanica/ocekivano.md.
// NE ulaze u default `npm test` (vitest.config.ts ih iskljucuje) — pokrecu se sa
// `npm run test:receipts` i zahtevaju GEMINI_API_KEY u okruzenju + uzorke slika
// (jedini deo test suite-a koji STVARNO zove Gemini; bez kljuca se preskace).

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { extractReceipt } from "./receiptExtract";
import { canonicalPhone, foldName } from "./receiptMatcher";

type Expected = { imePrimaoca: string; telefonPrimaoca: string; brojPosiljke: string };

const samplesDir = path.resolve(process.cwd(), "docs", "uzorci-priznanica");
const expectedPath = path.join(samplesDir, "ocekivano.md");

function loadExpected(): Record<string, Expected> {
  const markdown = fs.readFileSync(expectedPath, "utf8");
  const fence = markdown.match(/```json\s*([\s\S]*?)```/);
  if (!fence) throw new Error(`Nema \`\`\`json bloka u ${expectedPath}`);
  return JSON.parse(fence[1]) as Record<string, Expected>;
}

const samplesReady = fs.existsSync(expectedPath);
const geminiReady = Boolean(process.env.GEMINI_API_KEY?.trim());

if (!samplesReady) {
  console.warn(`[receiptExtract.integration] Preskacem: nema ${expectedPath}`);
}
if (!geminiReady) {
  console.warn(`[receiptExtract.integration] Preskacem: GEMINI_API_KEY nije podesen`);
}

describe.skipIf(!samplesReady || !geminiReady)("ekstrakcija AKS priznanica (Gemini)", () => {
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
