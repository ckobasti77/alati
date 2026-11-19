// POST /api/order-screenshot — "Popuni narudžbinu iz slike".
// FormData: { file: File, token: string, model?: "gemini-3.5-flash" }.
// Vraća ScreenshotDraft (PREDLOG) — ništa se ne snima automatski.
// Provera tokena: isti obrazac kao /api/social (auth.session, admin uloga) → 401.
// Greške: 429 (Gemini dnevni limit), 503 (Gemini nedostupan), 500 (ostalo).

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { GeminiRateLimitError, VisionUnavailableError } from "@/lib/gemini";
import { extractOrderFromScreenshot } from "@/lib/orderScreenshot/extract";
import type { CatalogProduct } from "@/lib/orderScreenshot/types";

export const runtime = "nodejs";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const RATE_LIMIT_MESSAGE = "Dnevni besplatni limit za čitanje slika je potrošen -- pokušaj sutra ili popuni ručno.";
const EXTRA_MODEL = "gemini-3.5-flash"; // "jača provera" — isti besplatan nivo, znatno manji dnevni limit

const jsonResponse = (data: unknown, status?: number) => NextResponse.json(data, { status: status ?? 200 });

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // 1) token — bez njega ili nevažeći: 401 (isti obrazac kao /api/social)
    const token = String(form.get("token") ?? "").trim();
    if (!token) {
      return jsonResponse({ error: "Nedostaje token (prijavi se ponovo)." }, 401);
    }
    if (!CONVEX_URL) {
      return jsonResponse({ error: "NEXT_PUBLIC_CONVEX_URL nije podešen." }, 500);
    }
    const convex = new ConvexHttpClient(CONVEX_URL);
    const session = await convex.query(api.auth.session, { token });
    if (!session || session.user.role !== "admin") {
      return jsonResponse({ error: "Neautorizovan pristup." }, 401);
    }

    // 2) model — whitelist: podrazumevani (GEMINI_MODEL / gemini-flash-lite-latest)
    //    ili "gemini-3.5-flash" za jaču proveru; sve ostalo → 400
    const modelParam = String(form.get("model") ?? "").trim();
    if (modelParam && modelParam !== EXTRA_MODEL) {
      return jsonResponse({ error: `Nepoznat model: ${modelParam} (dozvoljen: ${EXTRA_MODEL}).` }, 400);
    }

    // 3) fajl
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return jsonResponse({ error: "Nedostaje fajl (polje 'file' u FormData)." }, 400);
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const fileName = (file as { name?: string }).name ?? "unknown";

    // 4) katalog (products.list već vraća varijante = tipove proizvoda)
    type RawProduct = {
      _id: string;
      name: string;
      kpName?: string;
      nabavnaCena: number;
      prodajnaCena: number;
      variants?: { id: string; label: string; nabavnaCena: number; prodajnaCena: number; isDefault: boolean }[];
    };
    const products = (await convex.query(api.products.list, { token })) as RawProduct[];
    const catalog: CatalogProduct[] = products.map((product) => ({
      id: product._id,
      name: product.name,
      kpName: product.kpName,
      nabavnaCena: product.nabavnaCena,
      prodajnaCena: product.prodajnaCena,
      variants: product.variants?.map((variant) => ({
        id: variant.id,
        label: variant.label,
        nabavnaCena: variant.nabavnaCena,
        prodajnaCena: variant.prodajnaCena,
        isDefault: variant.isDefault,
      })),
    }));

    const draft = await extractOrderFromScreenshot(base64, catalog, {
      model: modelParam === EXTRA_MODEL ? EXTRA_MODEL : undefined,
      // Tokene (usageMetadata) logujemo, ne vraćamo u odgovor — UI draft ostaje čist.
      onUsage: (usage) =>
        console.log(
          `[order-shots] tokens image=${fileName} ` +
            `prompt=${usage.promptTokenCount ?? "?"} out=${usage.candidatesTokenCount ?? "?"} total=${usage.totalTokenCount ?? "?"}`,
        ),
    });
    return jsonResponse(draft);
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      // Proveriti PRED VisionUnavailableError (RateLimit je njegova potklasa).
      console.error("[order-screenshot] Gemini dnevni limit:", error.message);
      return jsonResponse({ error: RATE_LIMIT_MESSAGE }, 429);
    }
    if (error instanceof VisionUnavailableError) {
      console.error("[order-screenshot] Gemini nedostupan:", error.message);
      return jsonResponse({ error: `Gemini nije dostupan: ${error.message}` }, 503);
    }
    console.error("[order-screenshot] ekstrakcija nije uspela", error);
    return jsonResponse({ error: "Ekstrakcija iz slike nije uspela." }, 500);
  }
}
