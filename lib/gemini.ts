// gemini.ts
// Jedini poziv ka Google Gemini API-ju (vision ekstrakcija JSON-a iz slika/teksta).
// Koriste ga lib/receiptExtract.ts (AKS priznanice) i lib/waIntake/providers/vision.ts
// (WhatsApp Stage A/B). Testovi nikad ne zovu ovo uzivo — vision je iza interfejsa
// sa fake implementacijama.

export const DEFAULT_GEMINI_MODEL = "gemini-flash-lite-latest";

// Gemini nedostupan/pogresno podesen (nema kljuca, mreza, HTTP greska) —
// rute ovo mapiraju u 503 sa citljivom porukom.
export class VisionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionUnavailableError";
  }
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

// Jedan generateContent poziv: prompt + slike (base64 bez data: prefiksa),
// responseMimeType application/json + temperature 0, vraca parsiran JSON.
// Baca VisionUnavailableError za nedostupnost, SyntaxError ako odgovor nije JSON.
export async function geminiVision(prompt: string, images: string[]): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new VisionUnavailableError("GEMINI_API_KEY nije podesen u .env.local");
  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
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
    throw new VisionUnavailableError(`Gemini nije dostupan (mreza?): ${reason}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new VisionUnavailableError(`Gemini greska ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text);
}
