// gemini.ts
// Jedini poziv ka Google Gemini API-ju (vision ekstrakcija JSON-a iz slika/teksta).
// Koriste ga lib/receiptExtract.ts (AKS priznanice), lib/waIntake/providers/vision.ts
// (WhatsApp Stage A/B) i lib/orderScreenshot/extract.ts (narudžbina iz slike).
// Testovi nikad ne zovu ovo uzivo — vision je iza interfejsa
// sa fake implementacijama (lib/gemini.test.ts samo mock-uje global fetch).

export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

// Gemini nedostupan/pogresno podesen (nema kljuca, mreza, HTTP greska) —
// rute ovo mapiraju u 503 sa citljivom porukom.
export class VisionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionUnavailableError";
  }
}

// Dnevni limit besplatnog Gemini nivoa (HTTP 429 ili RESOURCE_EXHAUSTED u telu).
// Nasledjuje VisionUnavailableError da postojeći catch putovi i dalje hvataju;
// nova ruta (order-screenshot) ovo proverava PRVO i vraća 429.
export class GeminiRateLimitError extends VisionUnavailableError {
  constructor(message: string) {
    super(message);
    this.name = "GeminiRateLimitError";
  }
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

// usageMetadata iz Gemini odgovora (promptTokenCount/candidatesTokenCount/totalTokenCount).
// Ruta ovo može logirati (ne vraća u odgovor UI-ju) — opcionalni onUsage callback.
export type GeminiUsage = { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };

// Jedan generateContent poziv: prompt + slike (base64 bez data: prefiksa),
// responseMimeType application/json + temperature 0, vraca parsiran JSON.
// model?: eksplicitni model (whitelist u ruti); podrazumevano geminiModel().
// onUsage?: opcionalni callback sa usageMetadata (tokeni) — ruta ga logira, ne vraća u odgovor.
// Baca VisionUnavailableError za nedostupnost, GeminiRateLimitError za
// 429/RESOURCE_EXHAUSTED, SyntaxError ako odgovor nije JSON.
export async function geminiVision(
  prompt: string,
  images: string[],
  model?: string,
  onUsage?: (usage: GeminiUsage) => void,
): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new VisionUnavailableError("GEMINI_API_KEY nije podešen u .env.local");
  const useModel = model?.trim() || geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${key}`;
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          ...images.map((data) => ({ inline_data: { mime_type: "image/jpeg", data } })),
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0 },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new VisionUnavailableError(`Gemini nije dostupan (mreža?): ${reason}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429 || /RESOURCE_EXHAUSTED/.test(detail)) {
      throw new GeminiRateLimitError(`Gemini dnevni limit (429): ${detail.slice(0, 200)}`);
    }
    throw new VisionUnavailableError(`Gemini greška ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: GeminiUsage;
  } | null;
  if (json?.usageMetadata && onUsage) onUsage(json.usageMetadata);
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text);
}
