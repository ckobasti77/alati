// screenshotApply.ts — ČISTA pravila za popunjavanje forme narudžbine iz ScreenshotDraft-a.
// Bez side efekata — testirano vitest-om (izmišljeni podaci, pravila iz zadatka):
//  - prazna polja u draftu NE prepisuju ono što korisnik već unese,
//  - "proveri" oznaka kada je polje nesigurno (uncertain) ili sa niskim confidence,
//  - izbor između kandidata kada proizvod nije siguran ili ih ima više,
//  - cena sa slike ide u manualnu prodajnu/nabavnu.

import type { DraftProductHit, ScreenshotDraft, ScreenshotSourceType } from "@/lib/orderScreenshot/types";
import type { Product } from "@/types/order";
import { getProductDisplayName } from "./helpers";
import type { OrderFormValues } from "./orderForm";
import type { OrderItemDraft } from "./types";

/** Confidence ispod kojeg polje dobija "proveri" (uncertain se u draftu dampa na 0.5). */
export const LOW_CONFIDENCE = 0.5;
export const MAX_CANDIDATES = 5;
export const STRONG_MODEL = "gemini-3.5-flash";

export type FieldBadge = { review: boolean };

export type ScreenshotBadges = Partial<
  Record<"customerName" | "phone" | "address" | "pickup" | "product" | "prodajna" | "nabavna", FieldBadge>
>;

export type ProductPick = { productId: string; variantId: string };

export type ApplyPlan = {
  customerName: string | null;
  phone: string | null;
  address: string | null;
  pickup: boolean;
  product: ProductPick | null;
  prodajna: number | null;
  nabavna: number | null;
  /** Proizvod nije siguran (ili ih ima više) → korisnik bira iz lista. */
  showCandidates: boolean;
};

export type CandidateOption = {
  hit: DraftProductHit;
  name: string;
  tip: string;
  prodajna: number | null;
};

const nonEmpty = (value?: string | null): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
};

const finiteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Plan popunjavanja iz draft-a; null = polje ostaje kako jeste. */
export function buildApplyPlan(draft: ScreenshotDraft, products: Product[]): ApplyPlan {
  const confidence = draft.fieldConfidence;
  const hits = (draft.candidates ?? []).slice(0, MAX_CANDIDATES);
  const productUncertain = confidence.product <= LOW_CONFIDENCE;
  const showCandidates = hits.length > 0 && (hits.length > 1 || productUncertain);

  let product: ProductPick | null = null;
  if (draft.product && !showCandidates) {
    const catalogProduct = products.find((item) => item._id === draft.product?.productId);
    if (catalogProduct) {
      product = { productId: catalogProduct._id, variantId: draft.product.variantId ?? "" };
    }
  }

  return {
    customerName: nonEmpty(draft.customerName),
    phone: nonEmpty(draft.phone),
    address: nonEmpty(draft.address),
    pickup: draft.pickup === true,
    product,
    prodajna: finiteNumber(draft.prodajnaCena),
    nabavna: finiteNumber(draft.nabavnaCena),
    showCandidates,
  };
}

/** Lista kandidata (do 5) sa nazivom, tipom i prodajnom cenom iz kataloga. */
export function candidateOptions(draft: ScreenshotDraft, products: Product[]): CandidateOption[] {
  return (draft.candidates ?? []).slice(0, MAX_CANDIDATES).map((hit) => {
    const catalogProduct = products.find((item) => item._id === hit.productId);
    const variant = catalogProduct?.variants?.find((item) => item.id === hit.variantId);
    return {
      hit,
      name: catalogProduct ? getProductDisplayName(catalogProduct) : (hit.kpName ?? hit.name),
      tip: variant?.label ?? hit.variantLabel ?? "",
      prodajna: variant?.prodajnaCena ?? catalogProduct?.prodajnaCena ?? null,
    };
  });
}

/** Bedžovi "iz slike" (+ "proveri" za nesigurna polja) — po polju koje je ZISTO popunjeno. */
export function buildFieldBadges(draft: ScreenshotDraft, applied: { product: boolean }): ScreenshotBadges {
  const confidence = draft.fieldConfidence;
  const badge = (value: string, field: "customerName" | "phone" | "address"): FieldBadge =>
    nonEmpty(value) ? { review: confidence[field] <= LOW_CONFIDENCE } : ({ review: false } as FieldBadge);

  const badges: ScreenshotBadges = {};
  if (nonEmpty(draft.customerName)) badges.customerName = badge(draft.customerName, "customerName");
  if (nonEmpty(draft.phone)) badges.phone = badge(draft.phone, "phone");
  if (draft.pickup) badges.pickup = { review: false };
  if (!draft.pickup && nonEmpty(draft.address)) badges.address = badge(draft.address, "address");
  if (applied.product) badges.product = { review: confidence.product <= LOW_CONFIDENCE };
  if (finiteNumber(draft.prodajnaCena) !== null) badges.prodajna = { review: confidence.price <= LOW_CONFIDENCE };
  if (finiteNumber(draft.nabavnaCena) !== null) badges.nabavna = { review: false };
  return badges;
}

/** Da li forma već ima unete podatke (ima smisla pitati pre prepisivanja)? */
export function formHasData(values: OrderFormValues, draftItems: OrderItemDraft[], itemProductId: string): boolean {
  if (nonEmpty(values.customerName)) return true;
  if (nonEmpty(values.phone)) return true;
  if (nonEmpty(values.address)) return true;
  if (draftItems.length > 0) return true;
  if (itemProductId) return true;
  return false;
}

const SOURCE_TYPES: ScreenshotSourceType[] = ["kp", "whatsapp", "viber", "call_log", "other"];

/** Tolerantno čitanje odgovora /api/order-screenshot → ScreenshotDraft (ili null ako nije). */
export function toScreenshotDraft(data: unknown): ScreenshotDraft | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const confidence = (typeof record.fieldConfidence === "object" && record.fieldConfidence !== null
    ? record.fieldConfidence
    : {}) as Record<string, unknown>;
  const toHit = (value: unknown): DraftProductHit | null => {
    if (typeof value !== "object" || value === null) return null;
    const hit = value as Record<string, unknown>;
    if (typeof hit.productId !== "string" || typeof hit.name !== "string") return null;
    return {
      productId: hit.productId,
      name: hit.name,
      kpName: typeof hit.kpName === "string" ? hit.kpName : undefined,
      variantId: typeof hit.variantId === "string" ? hit.variantId : undefined,
      variantLabel: typeof hit.variantLabel === "string" ? hit.variantLabel : undefined,
      score: finiteNumber(hit.score) ?? 0,
    };
  };
  const candidates = Array.isArray(record.candidates)
    ? record.candidates.map(toHit).filter((hit): hit is DraftProductHit => hit !== null)
    : [];
  const sourceType = typeof record.sourceType === "string" && SOURCE_TYPES.includes(record.sourceType as ScreenshotSourceType)
    ? (record.sourceType as ScreenshotSourceType)
    : "other";

  return {
    sourceType,
    customerName: typeof record.customerName === "string" ? record.customerName : "",
    customerNameRaw: typeof record.customerNameRaw === "string" ? record.customerNameRaw : "",
    phone: typeof record.phone === "string" ? record.phone : "",
    address: typeof record.address === "string" ? record.address : "",
    pickup: record.pickup === true,
    product: toHit(record.product) ?? undefined,
    candidates,
    prodajnaCena: finiteNumber(record.prodajnaCena) ?? undefined,
    nabavnaCena: finiteNumber(record.nabavnaCena) ?? undefined,
    fieldConfidence: {
      customerName: finiteNumber(confidence.customerName) ?? 0,
      phone: finiteNumber(confidence.phone) ?? 0,
      address: finiteNumber(confidence.address) ?? 0,
      product: finiteNumber(confidence.product) ?? 0,
      price: finiteNumber(confidence.price) ?? 0,
    },
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((warning): warning is string => typeof warning === "string")
      : [],
  };
}
