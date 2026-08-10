// POST /api/wa-intake — orkestracija uvoza porudzbina iz WhatsApp chata (lokalno).
// Tok: lastImportedWa -> WhatsApp poruke -> Gemini segmentacija (Stage A) ->
// Gemini ekstrakcija po grupi (Stage B) -> productMatch -> KP cena -> pricing ->
// DraftOrder[] nazad stranici. NISTA se ne upisuje u bazu odavde — upis ide tek
// posle ljudske potvrde kroz orders.createBatchFromWa.
//
// Sva "ziva" spoljasnost (WhatsApp, Gemini, KP/Chrome) je iza interfejsa iz
// lib/waIntake; ova ruta radi samo lokalno (npm run dev), kao /api/receipt-extract.

import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { VisionUnavailableError } from "@/lib/gemini";
import {
  buildExtractionPrompt,
  buildSegmentationPrompt,
  parseExtraction,
  parseSegmentation,
} from "@/lib/waIntake/segment";
import { matchProduct } from "@/lib/waIntake/productMatch";
import { pricing, type KpPricingResult } from "@/lib/waIntake/pricing";
import { getWhatsAppSource } from "@/lib/waIntake/providers/whatsapp";
import { getVision } from "@/lib/waIntake/providers/vision";
import { getKpReader } from "@/lib/waIntake/providers/kp";
import type { CatalogProduct, DraftOrder, KpReader, SegmentGroup, VisionChat, WaMessage } from "@/lib/waIntake/types";

export const runtime = "nodejs";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const jsonResponse = (data: unknown, status?: number) => NextResponse.json(data, { status: status ?? 200 });

const round2 = (value: number) => Math.round(value * 100) / 100;

const computeConfidence = (draft: Pick<DraftOrder, "customerName" | "phone" | "address" | "pickup" | "productId" | "nabavnaCena" | "prodajnaCena">) => {
  let score = 1;
  if (!draft.phone) score -= 0.35;
  if (!draft.customerName) score -= 0.15;
  if (!draft.pickup && !draft.address) score -= 0.25;
  if (!draft.productId) score -= 0.1;
  if (draft.nabavnaCena === undefined) score -= 0.1;
  if (draft.prodajnaCena === undefined) score -= 0.15;
  return round2(Math.min(1, Math.max(0, score)));
};

async function buildDraft(
  group: SegmentGroup,
  messages: WaMessage[],
  catalog: CatalogProduct[],
  vision: VisionChat,
  kp: KpReader,
): Promise<DraftOrder> {
  const groupMessages = group.messageIndexes
    .map((index) => messages.find((message) => message.index === index))
    .filter((message): message is WaMessage => Boolean(message));
  const text = groupMessages.map((message) => message.text).filter(Boolean).join("\n");
  const images = groupMessages.flatMap((message) => message.images);

  const extractionRaw = await vision.chatJson(buildExtractionPrompt(group.tip, text), images);
  const fields = parseExtraction(extractionRaw);

  const productHit = matchProduct(fields.productText, catalog);

  // KP se pita samo ako prodajna nije eksplicitno u poruci (eksplicitna ionako
  // ima prioritet); link ima prednost nad pretragom prodavnice.
  let kpResult: KpPricingResult | null = null;
  if (fields.prodajnaExplicit === undefined) {
    if (fields.kpLink) {
      const read = await kp.readByLink(fields.kpLink);
      kpResult = { price: read.price, source: "kp-link", warning: read.warning };
    } else if (fields.productText) {
      const read = await kp.searchStoreAndRead(fields.productText);
      kpResult = { price: read.price, source: "kp-pretraga", warning: read.warning };
    }
  }

  const prices = pricing({
    nabavnaExplicit: fields.nabavnaExplicit,
    prodajnaExplicit: fields.prodajnaExplicit,
    product: productHit?.product ?? null,
    kp: kpResult,
  });

  const pickup = group.tip === "licno";
  const warnings = [...prices.warnings];
  if (!fields.phone) warnings.push("Telefon kupca nije procitan — proveri.");
  if (!pickup && !fields.address) warnings.push("Adresa za slanje nije procitana — proveri.");
  if (fields.productText && !productHit) warnings.push("Proizvod nije prepoznat u katalogu (ostaje slobodan tekst).");

  // Dedup kljuc = PRVA poruka grupe: i posle preseka prozora (overlap) ista
  // grupa dobija isti waMessageId. waTimestamp = najnovija poruka grupe, da
  // lastImportedWa pomeri prozor iza cele grupe.
  const waMessageId = groupMessages[0]?.id ?? "";
  const waTimestamp = groupMessages.reduce((max, message) => Math.max(max, message.ts), 0);

  const draftBase = {
    customerName: fields.customerName ?? "",
    phone: fields.phone ?? "",
    address: fields.address ?? "",
    pickup,
    productId: productHit?.product.id,
    nabavnaCena: prices.nabavnaCena,
    prodajnaCena: prices.prodajnaCena,
  };

  return {
    waMessageId,
    waTimestamp,
    tip: group.tip,
    ...draftBase,
    productText: fields.productText ?? "",
    title: productHit?.product.kpName ?? productHit?.product.name ?? fields.productText ?? "",
    kpLink: fields.kpLink,
    nabavnaSource: prices.nabavnaSource,
    prodajnaSource: prices.prodajnaSource,
    confidence: computeConfidence(draftBase),
    warnings,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { token?: string; scope?: string } | null;
    const token = body?.token?.trim();
    if (!token) {
      return jsonResponse({ error: "Nedostaje token (prijavi se ponovo)." }, 400);
    }
    const scope = body?.scope === "kalaba" ? ("kalaba" as const) : ("default" as const);
    if (!CONVEX_URL) {
      return jsonResponse({ error: "NEXT_PUBLIC_CONVEX_URL nije podesen." }, 500);
    }
    const convex = new ConvexHttpClient(CONVEX_URL);

    // 1) dokle smo stali
    const sinceTs = (await convex.query(api.orders.lastImportedWa, { token, scope })) as number | null;

    // 2) poruke iz chata (sa malim overlapom u provideru)
    const whatsapp = getWhatsAppSource("porudzbine");
    const messages = await whatsapp.fetchMessagesSince(sinceTs);
    if (messages.length === 0) {
      return jsonResponse({ drafts: [], scannedMessages: 0, sinceTs });
    }

    // 3) katalog za productMatch (lean pogled na products.list)
    const products = (await convex.query(api.products.list, { token })) as {
      _id: string;
      name: string;
      kpName?: string;
      nabavnaCena: number;
      prodajnaCena: number;
      supplierOffers?: { price: number; variantId?: string }[];
    }[];
    const catalog: CatalogProduct[] = products.map((product) => ({
      id: product._id,
      name: product.name,
      kpName: product.kpName,
      nabavnaCena: product.nabavnaCena,
      prodajnaCena: product.prodajnaCena,
      supplierOffers: product.supplierOffers?.map((offer) => ({ price: offer.price, variantId: offer.variantId })),
    }));

    // 4) Stage A: Qwen segmentacija celog prozora
    const vision = getVision();
    const segmentation = buildSegmentationPrompt(messages);
    const segmentationRaw = await vision.chatJson(segmentation.prompt, segmentation.images);
    const groups = parseSegmentation(segmentationRaw, messages.length);

    // 5) Stage B + productMatch + KP + pricing po grupi; jedan fejl ne rusi ostale
    const kp = getKpReader();
    const drafts: DraftOrder[] = [];
    const groupErrors: string[] = [];
    for (const group of groups) {
      try {
        const draft = await buildDraft(group, messages, catalog, vision, kp);
        // Grupa cija je i najnovija poruka pre lastImportedWa je vec bila u
        // proslom prozoru (overlap sum) — ne nudi je ponovo.
        if (sinceTs !== null && draft.waTimestamp <= sinceTs) continue;
        drafts.push(draft);
      } catch (error) {
        if (error instanceof VisionUnavailableError) throw error;
        console.error("[wa-intake] obrada grupe nije uspela", group, error);
        groupErrors.push(error instanceof Error ? error.message : "Obrada grupe nije uspela.");
      }
    }

    return jsonResponse({
      drafts,
      scannedMessages: messages.length,
      groupCount: groups.length,
      sinceTs,
      errors: groupErrors,
    });
  } catch (error) {
    if (error instanceof VisionUnavailableError) {
      console.error("[wa-intake] Gemini nedostupan:", error.message);
      return jsonResponse({ error: error.message }, 503);
    }
    console.error("[wa-intake] uvoz nije uspeo", error);
    const message = error instanceof Error ? error.message : "Uvoz iz WhatsApp-a nije uspeo.";
    return jsonResponse({ error: message }, 500);
  }
}
