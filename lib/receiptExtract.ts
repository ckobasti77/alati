// receiptExtract.ts
// Ekstrakcija podataka sa fotografije AKS priznanice preko lokalne Ollame
// (vision model qwen2.5vl:7b). Ovde zivi sva logika rute /api/receipt-extract
// (prompt, poziv, parsiranje, post-processing) da bi bila testabilna bez
// importa next/server — integracioni testovi ciljaju extractReceipt direktno.

export type ReceiptExtraction = {
  imePrimaoca: string;
  telefonPrimaoca: string;
  brojPosiljke: string; // samo cifre posle post-processinga
  warning?: string;
};

export class OllamaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaUnavailableError";
  }
}

export const RECEIPT_EXTRACT_MODEL = "qwen2.5vl:7b";

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

// Instrukcije na engleskom (qwen2.5vl ih najpouzdanije prati), JSON kljucevi srpski.
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

function parseModelJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

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

export async function extractReceipt(
  imageBase64: string,
  opts?: { ollamaUrl?: string; timeoutMs?: number },
): Promise<ReceiptExtraction> {
  const baseUrl = (opts?.ollamaUrl ?? process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
  const timeoutMs = opts?.timeoutMs ?? 120_000;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: RECEIPT_EXTRACT_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0 },
        messages: [{ role: "user", content: RECEIPT_EXTRACT_PROMPT, images: [imageBase64] }],
      }),
    });
  } catch {
    throw new OllamaUnavailableError(
      `Ollama nije dostupna na ${baseUrl}. Proveri da li je pokrenuta (ollama serve).`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new OllamaUnavailableError(
      `Ollama je vratila gresku ${response.status} za model ${RECEIPT_EXTRACT_MODEL}. ${body.slice(0, 200)}`,
    );
  }

  const payload = (await response.json().catch(() => null)) as { message?: { content?: string } } | null;
  const content = payload?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return { imePrimaoca: "", telefonPrimaoca: "", brojPosiljke: "", warning: "Model nije vratio sadrzaj." };
  }

  const parsed = parseModelJson(content);
  if (!parsed) {
    return { imePrimaoca: "", telefonPrimaoca: "", brojPosiljke: "", warning: "Model nije vratio validan JSON." };
  }

  return postProcess(parsed);
}
