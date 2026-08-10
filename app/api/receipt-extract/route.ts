import { NextResponse } from "next/server";
import { extractReceipt, VisionUnavailableError } from "@/lib/receiptExtract";

// Tanka ruta nad lib/receiptExtract.ts (prompt, Gemini poziv i parsiranje zive tamo,
// pa ih integracioni testovi pokrivaju bez next/server importa).
//
// Bez auth-a: ruta samo prosledjuje sliku Gemini ekstrakciji i ne dira Convex/podatke.
// Feature se koristi iskljucivo lokalno (npm run dev). Ako se app ikad javno
// deploy-uje, ovu rutu treba gate-ovati tokenom kao app/api/social.

export const runtime = "nodejs";

const jsonResponse = (data: unknown, init?: number) => NextResponse.json(data, { status: init ?? 200 });

export async function POST(request: Request) {
  try {
    const form = await request.formData();
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
    return jsonResponse({ error: "Neocekivana greska pri ekstrakciji." }, 500);
  }
}
