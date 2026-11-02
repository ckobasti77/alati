import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/calc";
import { calculateOrderRefund } from "@/lib/refund-policy";
import { normalizeSearchText } from "@/lib/search";
import { STAGES, STAGE_OPTIONS } from "@/lib/stages";
import type { OrdersTablePdfRow } from "@/lib/pdfExport";
import type { Order, OrderRefundPeriod, OrderStage, Product, ProductVariant } from "@/types/order";
import { shippingModes, type ShippingMode } from "./types";

export const requiresDeleteConfirmation = (stage?: OrderStage) =>
  stage === "stiglo" || stage === "legle_pare" || stage === "vraceno";

export const resolveOrderShippingMode = (order: Pick<Order, "slanjeMode" | "transportMode">): ShippingMode | undefined => {
  const mode = order.slanjeMode;
  if (mode && shippingModes.includes(mode as ShippingMode)) {
    return mode as ShippingMode;
  }
  const legacyMode = order.transportMode;
  if (legacyMode && shippingModes.includes(legacyMode as ShippingMode)) {
    return legacyMode as ShippingMode;
  }
  return undefined;
};

export const resolveShipmentNumber = (order: Pick<Order, "brojPosiljke">) => order.brojPosiljke?.trim() ?? "";

export const normalizeStageFilters = (values: string[]) => {
  if (!values.length) return [] as OrderStage[];
  const allowed = new Set(STAGE_OPTIONS.map((option) => option.value));
  const unique = new Set<string>();
  values.forEach((value) => {
    if (allowed.has(value as OrderStage)) {
      unique.add(value);
    }
  });
  return STAGE_OPTIONS.map((option) => option.value).filter((value) => unique.has(value));
};

export const areArraysEqual = <T,>(left: T[], right: T[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const normalizeDateInput = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "";
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";
  return trimmed;
};

export const resolveDateTimestamp = (value: string, boundary: "start" | "end") => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  if (boundary === "start") {
    return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  }
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
};

export const resolveTodayEndTimestamp = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
};

export const normalizeOwnerLookupKey = (value?: string) => normalizeSearchText(value?.trim() ?? "");

export const generateId = () => Math.random().toString(36).slice(2);

export const getProductVariants = (product?: Product): ProductVariant[] => {
  if (!product) return [];
  return product.variants ?? [];
};

export const getProductDisplayName = (product?: Product | null) => {
  if (!product) return "";
  return product.kpName ?? product.name;
};

export const composeVariantLabel = (product: Product, variant?: ProductVariant) => {
  const displayName = getProductDisplayName(product);
  if (!variant) return displayName;
  return `${displayName} - ${variant.label}`;
};

export const resolveSupplierOptions = (product?: Product, variantId?: string) => {
  if (!product) return [];
  const offers = product.supplierOffers ?? [];
  if (!offers.length) return [];
  const normalizedVariantId = variantId?.trim() || undefined;
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (normalizedVariantId ?? null));
  const fallback = normalizedVariantId ? [] : offers.filter((offer) => !offer.variantId);
  const pool = exact.length ? exact : fallback;
  const seen = new Set<string>();
  return pool
    .filter((offer) => {
      const key = String(offer.supplierId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((offer) => ({ supplierId: String(offer.supplierId), price: offer.price }));
};

export const pickBestSupplier = (options: { supplierId: string; price: number; supplierName?: string }[]) => {
  if (!options.length) return null;
  return options.reduce((best, option) => {
    if (!best || option.price < best.price) return option;
    return best;
  }, null as { supplierId: string; price: number; supplierName?: string } | null);
};

export const resolveVariantPurchasePrice = (product: Product, variant: ProductVariant) => {
  const offers = product.supplierOffers ?? [];
  const bestVariantOffer = offers
    .filter((offer) => (offer.variantId ?? null) === variant.id)
    .reduce((best, offer) => (best === null || offer.price < best ? offer.price : best), null as number | null);
  return bestVariantOffer ?? variant.nabavnaCena;
};

export const resolveProductImageUrl = (product?: Product, variantId?: string) => {
  if (!product) return null;
  const variantImages = variantId
    ? product.variants?.find((variant) => variant.id === variantId)?.images
    : undefined;
  const images = (variantImages && variantImages.length > 0 ? variantImages : product.images) ?? [];
  const mainImage = images.find((image) => image.isMain) ?? images[0];
  return mainImage?.url ?? null;
};

export const resolveProfitPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 100;

export const formatPercent = (value: number) =>
  `${value.toLocaleString("sr-RS", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

export const formatRefundPeriodDate = (value: string) =>
  new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

export const resolveOrderSortValue = (order: Order) => order.sortIndex ?? order.kreiranoAt;

export const buildOrderExportTitle = (order: Order, productMap: Map<string, Product>) => {
  const itemNames = (order.items ?? [])
    .map((item) => {
      const product = item.productId ? productMap.get(item.productId) : undefined;
      return product ? getProductDisplayName(product) : item.title;
    })
    .filter((name) => Boolean(name && name.trim().length > 0));
  const primaryTitle = itemNames[0] ?? order.title;
  const secondaryNames = itemNames.slice(1, 3);
  const remainingCount = itemNames.length > 3 ? itemNames.length - 3 : 0;
  const parts = [primaryTitle];
  if (secondaryNames.length > 0) {
    parts.push(secondaryNames.join(" / "));
  }
  if (remainingCount > 0) {
    parts.push(`+${remainingCount}`);
  }
  if (order.items && order.items.length > 1) {
    parts.push(`${order.items.length} proizvoda`);
  }
  return parts.filter(Boolean).join("\n");
};

export const buildOrdersPdfRows = (
  exportOrders: Order[],
  productMap: Map<string, Product>,
  refundPeriod?: OrderRefundPeriod | null,
): OrdersTablePdfRow[] =>
  exportOrders.map((order) => {
    const totals = orderTotals(order);
    const refund = calculateOrderRefund({
      orderCreatedAt: order.kreiranoAt,
      totalNabavno: totals.totalNabavno,
      profit: totals.profit,
      transport: totals.transport,
      myProfitPercent: order.myProfitPercent,
      refundPeriod,
      povratVracen: order.povratVracen,
      manualRefund100: order.manualRefund100,
    });
    const shipmentNumber = resolveShipmentNumber(order);
    const contactParts = [order.customerName, order.phone];
    if (order.pickup) contactParts.push("Licno");

    return {
      date: formatDate(order.kreiranoAt),
      stage: STAGES[order.stage]?.label ?? order.stage,
      title: buildOrderExportTitle(order, productMap),
      contact: contactParts.filter(Boolean).join("\n"),
      nabavno: formatCurrency(totals.totalNabavno, "EUR"),
      transport: formatCurrency(totals.transport, "EUR"),
      prodajno: formatCurrency(totals.totalProdajno, "EUR"),
      profit: formatCurrency(refund.outstandingProfitForRefund, "EUR"),
      povrat: formatCurrency(refund.outstandingRefundAmount, "EUR"),
      shipmentNumber: shipmentNumber || order.napomena || "-",
    };
  });
