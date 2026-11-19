// orderScreenshot/extract.ts
// Orkestracija: prompt → vision (Gemini) → normalize → match → ScreenshotDraft.
// Čista logika — testovi daju fake vision (bez pravog poziva Gemini-ju),
// isti obrazac kao waIntake FakeVision. VisionUnavailableError i
// GeminiRateLimitError prolaze ka ruti (ruta ih mapira u 503/429).

import { geminiVision } from "../gemini";
import type { GeminiUsage } from "../gemini";
import { matchOrder } from "./match";
import { decidePickup, normalizeAddress, normalizeName, normalizePhone, normalizePrices } from "./normalize";
import { ORDER_SCREENSHOT_PROMPT } from "./prompt";
import type { CatalogProduct, ScreenshotDraft, ScreenshotRaw, ScreenshotSourceType } from "./types";

export type VisionFn = (prompt: string, images: string[]) => Promise<unknown>;

const SOURCE_TYPES = new Set<string>(["kp", "whatsapp", "viber", "call_log", "other"]);

// Polja koja model može navesti u "uncertain" → draft polje koje to dira.
const UNCERTAIN_MAP: Record<string, string[]> = {
  customerName: ["customerFirstName", "customerLastName", "customerNameRaw"],
  phone: ["phones"],
  address: ["street", "postalCode", "city", "addressRaw"],
  product: ["productText", "variantText", "adTitle"],
  price: ["prices"],
};

const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

// Tolerantno oblikovanje model-JSON-a: nedostajući ključevi → defaulti,
// pogrešni tipovi → prazno (nisu svi modeli jednako poslušni).
function asRaw(value: unknown): ScreenshotRaw {
  const raw = (value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const role = (v: unknown) => (v === "prodajna" || v === "nabavna" ? v : "unknown");

  return {
    sourceType: SOURCE_TYPES.has(String(raw.sourceType)) ? (raw.sourceType as ScreenshotSourceType) : "other",
    customerFirstName: asString(raw.customerFirstName),
    customerLastName: asString(raw.customerLastName),
    customerNameRaw: asString(raw.customerNameRaw),
    phones: Array.isArray(raw.phones) ? raw.phones.filter((p): p is string => typeof p === "string") : [],
    street: asString(raw.street),
    postalCode: asString(raw.postalCode),
    city: asString(raw.city),
    addressRaw: asString(raw.addressRaw),
    pickupExplicit: raw.pickupExplicit === true,
    productText: asString(raw.productText),
    variantText: asString(raw.variantText),
    adTitle: asString(raw.adTitle),
    prices: Array.isArray(raw.prices)
      ? raw.prices
          .filter((p): p is Record<string, unknown> => p !== null && typeof p === "object" && !Array.isArray(p))
          .map((p) => ({ value: asString(p.value), role: role(p.role), raw: asString(p.raw) || asString(p.value) }))
      : [],
    uncertain: Array.isArray(raw.uncertain) ? raw.uncertain.filter((u): u is string => typeof u === "string") : [],
  };
}

function emptyDraft(warning: string): ScreenshotDraft {
  return {
    sourceType: "other",
    customerName: "",
    customerNameRaw: "",
    phone: "",
    address: "",
    pickup: false,
    candidates: [],
    fieldConfidence: { customerName: 0, phone: 0, address: 0, product: 0, price: 0 },
    warnings: [warning],
  };
}

export async function extractOrderFromScreenshot(
  imageBase64: string,
  catalog: CatalogProduct[],
  opts?: { model?: string; vision?: VisionFn; onUsage?: (usage: GeminiUsage) => void },
): Promise<ScreenshotDraft> {
  const vision: VisionFn =
    opts?.vision ?? ((prompt, images) => geminiVision(prompt, images, opts?.model, opts?.onUsage));

  let parsed: unknown;
  try {
    parsed = await vision(ORDER_SCREENSHOT_PROMPT, [imageBase64]);
  } catch (error) {
    // Isti obrazac kao receiptExtract: ne-JSON → prazni draft + warning.
    if (error instanceof SyntaxError) {
      return emptyDraft("Model nije vratio validan JSON.");
    }
    throw error; // VisionUnavailableError / GeminiRateLimitError → ruta
  }

  const raw = asRaw(parsed);
  const warnings: string[] = [];
  for (const field of raw.uncertain) {
    warnings.push(`Model nije siguran u polje: ${field}.`);
  }

  const nameResult = normalizeName(raw);
  const phone = raw.phones.map(normalizePhone).find(Boolean) ?? "";
  if (raw.phones.length > 0 && !phone) {
    warnings.push("Telefon nije prepoznat u standardnom formatu — proveri.");
  }

  const addressResult = normalizeAddress(raw);
  const pricesResult = normalizePrices(raw.prices);
  warnings.push(...pricesResult.warnings);

  const pickup = decidePickup(raw, addressResult.address !== "", phone !== "");
  if (!pickup) {
    warnings.push(...addressResult.warnings);
    if (!addressResult.address) {
      warnings.push("Adresa nije pročitana — proveri ili označi lično preuzimanje.");
    }
  }
  // Kod pickup-a warningi za adresu su besmisleni (pravilo 1).

  const match = matchOrder({
    productText: raw.productText,
    adTitle: raw.adTitle,
    variantText: raw.variantText,
    prodajnaCena: pricesResult.prodajnaCena,
    catalog,
  });
  if (match.warning) warnings.push(match.warning);

  // Confidence: puno → 1, prazno → 0; adresa sa warningom (npr. bez PTT-a) → 0.8;
  // polje iz "uncertain" → × 0.5.
  const damp = (base: number, field: keyof typeof UNCERTAIN_MAP): number =>
    base * (UNCERTAIN_MAP[field].some((key) => raw.uncertain.includes(key)) ? 0.5 : 1);
  const addressBase = addressResult.address ? (addressResult.warnings.length > 0 ? 0.8 : 1) : 0;

  return {
    sourceType: raw.sourceType,
    customerName: nameResult.name,
    customerNameRaw: raw.customerNameRaw,
    phone,
    address: pickup ? "" : addressResult.address,
    pickup,
    product: match.best,
    candidates: match.candidates,
    prodajnaCena: pricesResult.prodajnaCena,
    nabavnaCena: pricesResult.nabavnaCena,
    fieldConfidence: {
      customerName: damp(nameResult.name ? 1 : 0, "customerName"),
      phone: damp(phone ? 1 : 0, "phone"),
      address: pickup ? 1 : damp(addressBase, "address"),
      product: match.best ? damp(match.best.score, "product") : 0,
      price: damp(pricesResult.prodajnaCena !== undefined ? 1 : 0, "price"),
    },
    warnings,
  };
}
