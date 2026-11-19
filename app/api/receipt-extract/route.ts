import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { extractReceipt, VisionUnavailableError } from "@/lib/receiptExtract";

// Tanka ruta nad lib/receiptExtract.ts (prompt, Gemini poziv i parsiranje zive tamo,
// pa ih integracioni testovi pokrivaju bez next/server importa).
// Provera tokena: isti obrazac kao /api/social (auth.session, admin uloga) → 401.

export const runtime = "nodejs";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const jsonResponse = (data: unknown, init?: number) => NextResponse.json(data, { status: init ?? 200 });

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // Token provera (bez njega ili nevažeći → 401) — sajt je javan, ruta mora biti gate-ovana.
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

    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return jsonResponse({ error: "Nedostaje fajl (polje 'file' u FormData)." }, 400);
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await extractReceipt(base64);
    return jsonResponse(result);
  } catch (error) {
    if (error instanceof VisionUnavailableError) {
      console.error("Receipt extract: Gemini unavailable", error.message);
      return jsonResponse(
        { error: `Gemini nije dostupan: ${error.message} Proveri GEMINI_API_KEY u .env.local.` },
        503,
      );
    }
    console.error("Receipt extract failed", error);
    return jsonResponse({ error: "Neočekivana greška pri ekstrakciji." }, 500);
  }
}
