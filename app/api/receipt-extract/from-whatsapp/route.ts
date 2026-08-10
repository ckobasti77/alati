// POST /api/receipt-extract/from-whatsapp — povuce nove poruke sa slikama
// (AKS priznanice) iz WhatsApp chata naloga "papirici" (WA_PAPIRICI_CHAT) i
// vrati ih kao base64. Ekstrakcija, bar-kod i matcher ostaju NA KLIJENTU:
// stranica /narudzbine/uvoz ubacuje slike kroz isti pipeline kao drag-drop.
//
// Bez auth-a: ne dira Convex/podatke, samo lokalno (npm run dev), kao
// app/api/receipt-extract.

import { NextResponse } from "next/server";
import { getWhatsAppSource } from "@/lib/waIntake/providers/whatsapp";

export const runtime = "nodejs";

export async function POST() {
  try {
    const whatsapp = getWhatsAppSource("papirici");
    // Bez checkpointa (nema nove seme): uvek poslednjih 48h. Dedup je na
    // klijentu (po messageId u sesiji) + markPoslatoBatch "vec poslato" skip.
    const messages = await whatsapp.fetchMessagesSince(null);
    const images = messages.flatMap((message) =>
      message.images.map((data, imageIndex) => ({
        messageId: message.id,
        imageIndex,
        ts: message.ts,
        data, // base64 bez data: prefiksa (provider filtrira na image/*)
      })),
    );
    return NextResponse.json({ images, scannedMessages: messages.length });
  } catch (error) {
    console.error("[wa-intake:papirici] povlacenje papirica nije uspelo", error);
    const message = error instanceof Error ? error.message : "Nepoznata greska.";
    return NextResponse.json(
      { error: `${message} Ako je ovo prvo pokretanje naloga, skeniraj QR iz konzole servera pa probaj ponovo.` },
      { status: 503 },
    );
  }
}
