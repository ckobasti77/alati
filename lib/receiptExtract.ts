// receiptExtract.ts
// Ekstrakcija podataka sa fotografije AKS priznanice preko Gemini vision API-ja
// (lib/gemini.ts). Ovde zivi sva logika rute /api/receipt-extract
// (prompt, poziv, parsiranje, post-processing) da bi bila testabilna bez
// importa next/server — integracioni testovi ciljaju extractReceipt direktno.

import { geminiVision } from "./gemini";

export { VisionUnavailableError } from "./gemini";

export type ReceiptExtraction = {
  imePrimaoca: string;
  telefonPrimaoca: string;
  brojPosiljke: string; // samo cifre posle post-processinga
  warning?: string;
};

// Instrukcije na engleskom (vision modeli ih najpouzdanije prate), JSON kljucevi srpski.
export const RECEIPT_EXTRACT_PROMPT = `You are reading a photo of an AKS courier shipping receipt from Serbia.
The photo may contain several overlapping receipts. Read ONLY the frontmost,
most fully visible receipt and ignore all others.

Each receipt has two blocks:
- "PRIMALAC" (recipient) - the ONLY block you must read. It contains the
  recipient's full name, then "Adresa:" with a street and a postal line like
  "23300 Kikinda", then "Kontakt:" followed by a phone number (e.g. "063 272 666").
- "POSILJALAC" / "POŠILJALAC" (sender) - ALWAYS IGNORE this block. It always
  contains IVAN RISTOVIC, Novi Pazar, phone 0641303177 and bank account
  265000000761511990. Never output any of these values.

Also on the receipt:
- The tracking number is a 14-digit number starting with "92", printed directly
  under the large barcode. That is "brojPosiljke".
- IGNORE "Kurir:" followed by a short number (e.g. "Kurir: 92008") - courier ID,
  not a tracking number.
- IGNORE "Prateci paketi:" / "Prateći paketi:" and any numbers after it.
- IGNORE dates, times, weights and prices.

Return STRICT JSON with exactly these keys and nothing else:
{"imePrimaoca": "", "telefonPrimaoca": "", "brojPosiljke": ""}

Rules:
- imePrimaoca: recipient name from the PRIMALAC block, exactly as printed.
- telefonPrimaoca: the phone after "Kontakt:" in the PRIMALAC block, as printed.
  It must NOT be 0641303177.
- brojPosiljke: the 14-digit number under the main barcode, digits only, no spaces.
- Use "" for any field you cannot read confidently.
- Output ONLY the JSON object.`;

const SENDER_PHONE_DIGITS = "0641303177";
const SENDER_ACCOUNT_DIGITS = "265000000761511990";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// Deterministicki cistac poznatih promasaja modela: procitan POSILJALAC blok,
// "Kurir:" broj umesto broja posiljke, broj racuna umesto telefona.
function postProcess(raw: Record<string, unknown>): ReceiptExtraction {
  const warnings: string[] = [];

  let imePrimaoca = asString(raw.imePrimaoca);
  if (imePrimaoca.toUpperCase().includes("IVAN RISTOVIC") || imePrimaoca.toUpperCase().includes("IVAN RISTOVIĆ")) {
    imePrimaoca = "";
    warnings.push("Model je procitao posiljaoca umesto primaoca.");
  }

  let telefonPrimaoca = asString(raw.telefonPrimaoca);
  const phoneDigits = digitsOnly(telefonPrimaoca);
  if (phoneDigits === SENDER_PHONE_DIGITS || phoneDigits.includes(SENDER_ACCOUNT_DIGITS)) {
    telefonPrimaoca = "";
    warnings.push("Model je procitao telefon/racun posiljaoca — proveri rucno.");
  }

  let brojPosiljke = digitsOnly(asString(raw.brojPosiljke));
  if (brojPosiljke === SENDER_PHONE_DIGITS.replace(/^0/, "") || brojPosiljke.includes(SENDER_ACCOUNT_DIGITS)) {
    brojPosiljke = "";
    warnings.push("Model je procitao podatke posiljaoca umesto broja posiljke.");
  } else if (brojPosiljke && brojPosiljke.length < 10) {
    // "Kurir: 92008" i slicni kratki brojevi nisu broj posiljke.
    brojPosiljke = "";
    warnings.push("Procitan broj je prekratak (verovatno sifra kurira) — proveri rucno.");
  } else if (brojPosiljke && !/^92\d{12}$/.test(brojPosiljke)) {
    warnings.push("Broj posiljke ne lici na standardni AKS format (14 cifara, pocinje sa 92).");
  }

  return {
    imePrimaoca,
    telefonPrimaoca,
    brojPosiljke,
    warning: warnings.length > 0 ? warnings.join(" ") : undefined,
  };
}

export async function extractReceipt(imageBase64: string): Promise<ReceiptExtraction> {
  let parsed: unknown;
  try {
    parsed = await geminiVision(RECEIPT_EXTRACT_PROMPT, [imageBase64]);
  } catch (error) {
    // Gemini vratio ne-JSON sadrzaj: isti fallback kao pre (prazna polja + warning);
    // VisionUnavailableError i ostalo ide dalje ka ruti.
    if (error instanceof SyntaxError) {
      return { imePrimaoca: "", telefonPrimaoca: "", brojPosiljke: "", warning: "Model nije vratio validan JSON." };
    }
    throw error;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { imePrimaoca: "", telefonPrimaoca: "", brojPosiljke: "", warning: "Model nije vratio validan JSON." };
  }

  return postProcess(parsed as Record<string, unknown>);
}
