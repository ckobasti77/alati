// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import type { SupplierOfferFormEntry, VariantFormEntry } from "./productForm";

export const parsePrice = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return NaN;
  return Number(normalized);
};

export const PRODUCTS_PAGE_SIZE = 20;

export type DraftImage = {
  storageId: string;
  url?: string | null;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: number;
  publishFb?: boolean;
  publishIg?: boolean;
  isMain: boolean;
};

export type DraftCategoryIcon = {
  storageId: string;
  previewUrl?: string;
  fileName?: string;
  contentType?: string;
};

export type DraftAdImage = {
  storageId: string;
  url?: string | null;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: number;
};

export type SocialPlatform = "facebook" | "instagram";

export type SortOption = "created_desc" | "price_desc" | "price_asc" | "sales_desc" | "profit_desc";

export type InboxImageStatus = "withPurchasePrice" | "withoutPurchasePrice" | "skip";

export type InboxViewFilter = InboxImageStatus;

export const sortOptions: SortOption[] = ["created_desc", "price_desc", "price_asc", "sales_desc", "profit_desc"];
export const archiveViewOptions = ["active", "archived"] as const;
export const viewModeOptions = ["list", "grid"] as const;

export type LightboxItem = {
  id?: string;
  url: string;
  alt?: string;
  downloadUrl?: string;
  downloadName?: string;
  deleteId?: string;
};

export const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export type NormalizedSupplierOffer = {
  supplierId: string;
  price: number;
  variantId?: string;
};

export const normalizeSupplierOffersInput = (
  offers: SupplierOfferFormEntry[] = [],
  variants: VariantFormEntry[] = [],
  includeVariants = false,
): NormalizedSupplierOffer[] => {
  const allowedVariantIds = new Set(includeVariants ? variants.map((variant) => variant.id) : []);
  const seen = new Set<string>();
  const normalized: NormalizedSupplierOffer[] = [];

  offers.forEach((offer) => {
    const supplierId = offer.supplierId?.trim();
    if (!supplierId) return;
    const price = parsePrice(offer.price);
    if (!Number.isFinite(price) || price < 0) return;
    const variantId = includeVariants && offer.variantId && allowedVariantIds.has(offer.variantId) ? offer.variantId : undefined;
    const key = `${supplierId}-${variantId ?? "base"}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({ supplierId, price, variantId });
  });

  return normalized;
};

export const pickBestSupplierOffer = (
  offers: NormalizedSupplierOffer[],
  variantId?: string,
  options?: { fallbackToBase?: boolean },
) => {
  if (!offers.length) return null;
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
  const fallback = options?.fallbackToBase === false ? [] : offers.filter((offer) => !offer.variantId);
  const pool = exact.length > 0 ? exact : fallback;
  if (!pool.length) return null;
  let best: { supplierId: string; price: number } | null = null;
  pool.forEach((offer) => {
    if (best === null || offer.price < best.price) {
      best = { supplierId: offer.supplierId, price: offer.price };
    }
  });
  return best;
};
