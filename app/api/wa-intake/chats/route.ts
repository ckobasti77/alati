// GET /api/wa-intake/chats?account=porudzbine|papirici — dev-helper: lista
// WhatsApp chatova (ime + ID) da se proveri ime chata za WA_PORUDZBINE_CHAT /
// WA_PAPIRICI_CHAT u .env.local. Koristi isti whatsapp-web.js singleton po
// nalogu kao uvoz porudzbina / papirica.
//
// Bez auth-a: ne dira Convex/podatke, samo lokalno (npm run dev), kao
// app/api/receipt-extract.

import { NextResponse } from "next/server";
import { getWhatsAppSource } from "@/lib/waIntake/providers/whatsapp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const account = new URL(request.url).searchParams.get("account") ?? "porudzbine";
  if (account !== "porudzbine" && account !== "papirici") {
    return NextResponse.json(
      { error: 'Nepoznat account (dozvoljeno: "porudzbine" ili "papirici").' },
      { status: 400 },
    );
  }
  try {
    const whatsapp = getWhatsAppSource(account);
    const chats = await whatsapp.listChats();
    return NextResponse.json({ chats });
  } catch (error) {
    console.error(`[wa-intake:${account}] listChats nije uspeo`, error);
    const message = error instanceof Error ? error.message : "Nepoznata greska.";
    return NextResponse.json(
      { error: `${message} Ako je ovo prvo pokretanje naloga, skeniraj QR iz konzole servera pa probaj ponovo.` },
      { status: 503 },
    );
  }
}
