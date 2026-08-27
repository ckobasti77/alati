// legleExtract.ts
// Ekstrakcija podataka sa fotografije AKS "Specifikacije" (izvestaj o legllim
// pouzecima) preko Gemini vision API-ja (lib/gemini.ts). Za razliku od priznanice
// (jedan primalac po slici), specifikacija je TABELA sa vise redova — vracamo niz.
// Sva logika rute /api/legle-extract (prompt, poziv, parsiranje, post-processing)
// zivi ovde da bi bila testabilna bez importa next/server.

import { geminiVision } from "./gemini";

export { VisionUnavailableError } from "./gemini";

export type LegleRow = {
  platilac: string; // ime kupca/primaoca iz kolone "Platilac"
  nalogId: string; // samo cifre posle post-processinga (= brojPosiljke)
  warning?: string;
};

export type LegleExtraction = {
  rows: LegleRow[];
  warning?: string;
};

// Instrukcije na engleskom (vision modeli ih najpouzdanije prate), JSON kljucevi srpski.
export const LEGLE_EXTRACT_PROMPT = `You are reading a photo of an AKS courier "Specifikacija" report from Serbia.
It is a TABLE listing cash-on-delivery payments that have been settled. Each row
is one settled shipment. Read EVERY data row of the table.

The table columns are, in order:
- "#" - row number (ignore).
- "Vreme potvrde" - a date and time (ignore).
- "NalogID" - a 14-digit tracking number starting with "92". This is "nalogId".
- "Naziv" - ALWAYS the account holder "IVAN RISTOVIC" / "IVAN RISTOVIĆ". IGNORE it, never output it.
- "Iznos" - an amount of money (ignore).
- "Platilac" - the full name of the person who paid (the buyer/recipient). This is "platilac".
- "Mesto" - a place code (ignore).
- "Referenca 1" / "Referenca 2" - references (ignore).

Ignore the header row, the company header block at the top, and the "Ukupno" (total) summary row.

Return STRICT JSON with exactly this shape and nothing else:
{"rows": [{"platilac": "", "nalogId": ""}]}

Rules:
- One object per data row of the table, in top-to-bottom order.
- platilac: the name from the "Platilac" column, exactly as printed. Never "IVAN RISTOVIC".
- nalogId: the 14-digit number from the "NalogID" column, digits only, no spaces.
- Use "" for any field you cannot read confidently, but still output the row.
- Output ONLY the JSON object.`;

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// Deterministicki cistac poznatih promasaja modela: procitan "Naziv" (vlasnik
// naloga) umesto platioca, nalogId koji nije standardni AKS format.
function postProcessRow(raw: Record<string, unknown>): LegleRow | null {
  const warnings: string[] = [];

  let platilac = asString(raw.platilac);
  if (platilac.toUpperCase().includes("IVAN RISTOVI")) {
    // Model je procitao kolonu "Naziv" (vlasnik naloga) umesto "Platilac".
    platilac = "";
    warnings.push("Model je procitao vlasnika naloga umesto platioca.");
  }

  const nalogId = digitsOnly(asString(raw.nalogId));
  if (nalogId && !/^92\d{12}$/.test(nalogId)) {
    warnings.push("NalogID ne lici na standardni AKS format (14 cifara, pocinje sa 92).");
  }

  // Prazan red bez ijednog upotrebljivog podatka -> odbaci.
  if (!platilac && !nalogId) return null;

  return {
    platilac,
    nalogId,
    warning: warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}

const EMPTY = (warning: string): LegleExtraction => ({ rows: [], warning });

export async function extractLegle(imageBase64: string): Promise<LegleExtraction> {
  let parsed: unknown;
  try {
    parsed = await geminiVision(LEGLE_EXTRACT_PROMPT, [imageBase64]);
  } catch (error) {
    // Gemini vratio ne-JSON sadrzaj: isti fallback kao receiptExtract;
    // VisionUnavailableError i ostalo ide dalje ka ruti.
    if (error instanceof SyntaxError) {
      return EMPTY("Model nije vratio validan JSON.");
    }
    throw error;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return EMPTY("Model nije vratio validan JSON.");
  }

  const rawRows = (parsed as Record<string, unknown>).rows;
  if (!Array.isArray(rawRows)) {
    return EMPTY("Model nije vratio listu redova.");
  }

  const rows = rawRows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
    .map(postProcessRow)
    .filter((row): row is LegleRow => row !== null);

  return { rows, warning: rows.length === 0 ? "Nijedan red nije procitan sa specifikacije." : undefined };
}
