// Pomoćne funkcije detalja narudžbine.
import { orderTotals } from "@/lib/calc";
import type { OrderDetailPdfItem } from "@/lib/pdfExport";
import { STAGE_FLOW, STAGES } from "@/lib/stages";
import type { OrderEvent, OrderStage, OrderWithProduct, Product } from "@/types/order";
import { getProductDisplayName } from "../../_lib/helpers";
import { shippingModes, type ShippingMode } from "../../_lib/types";

export const resolveOrderShippingMode = (
  order?: Pick<OrderWithProduct, "slanjeMode" | "transportMode"> | null,
): ShippingMode | undefined => {
  if (!order) return undefined;
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

export const resolveShipmentNumber = (order?: Pick<OrderWithProduct, "brojPosiljke"> | null) => order?.brojPosiljke?.trim() ?? "";
export const getOrderEventTitle = (event: OrderEvent) => {
  if (event.type === "povrat") {
    return event.povratVracen ? "Povrat je označen kao vraćen" : "Oznaka povrata je uklonjena";
  }

  const stageLabel = event.stage ? (STAGES[event.stage]?.label ?? event.stage) : "Nepoznato stanje";
  if (!event.previousStage) return `Narudžbina je kreirana kao: ${stageLabel}`;
  const previousLabel = STAGES[event.previousStage]?.label ?? event.previousStage;
  return `Status: ${previousLabel} → ${stageLabel}`;
};

export const getOrderEventDetail = (event: OrderEvent) =>
  event.type === "stage" && event.stage === "poslato" && event.brojPosiljke
    ? `Broj pošiljke: ${event.brojPosiljke}`
    : null;

export const splitComposedVariantLabel = (value?: string) => {
  const text = value?.trim() ?? "";
  const separator = " - ";
  const index = text.lastIndexOf(separator);
  if (index <= 0) return null;
  return {
    productName: text.slice(0, index).trim(),
    variantName: text.slice(index + separator.length).trim(),
  };
};

export const resolveOrderDetailPdfItems = (order: OrderWithProduct): OrderDetailPdfItem[] => {
  const items = orderTotals(order).items;
  if (items.length === 0) {
    const split = splitComposedVariantLabel(order.variantLabel || order.title);
    return [
      {
        productName: split?.productName || order.title,
        variantName: split?.variantName,
        quantity: order.kolicina,
      },
    ];
  }

  return items.map((item) => {
    const itemProduct = (item as any).product as Product | undefined;
    const product =
      itemProduct ??
      (item.productId && order.product && String(order.product._id) === String(item.productId) ? order.product : undefined) ??
      (items.length === 1 ? order.product : undefined);
    const productNameFromProduct = product ? getProductDisplayName(product) : "";
    const variantFromProduct = product?.variants?.find((variant) => variant.id === item.variantId)?.label;
    const splitTitle = splitComposedVariantLabel(item.title);
    const splitVariant = splitComposedVariantLabel(item.variantLabel);

    let productName = productNameFromProduct || splitTitle?.productName || item.title;
    let variantName = variantFromProduct || splitVariant?.variantName || "";

    if (!variantName && item.variantLabel) {
      const variantLabel = item.variantLabel.trim();
      if (productNameFromProduct && variantLabel.startsWith(`${productNameFromProduct} - `)) {
        variantName = variantLabel.slice(productNameFromProduct.length + 3).trim();
      } else if (variantLabel !== item.title) {
        variantName = variantLabel;
      }
    }

    if (!productNameFromProduct && variantName && item.title.endsWith(` - ${variantName}`)) {
      productName = item.title.slice(0, -variantName.length - 3).trim();
    }

    return {
      productName,
      variantName: variantName || undefined,
      quantity: item.kolicina,
    };
  });
};

/** Položaj u glavnom toku (Poručeno → Leglo). Vraćeno je van toka. */
export const stageProgress = (stage: OrderStage) => {
  const index = STAGE_FLOW.findIndex((item) => item.value === stage);
  return { index, total: STAGE_FLOW.length, returned: stage === "vraceno" };
};
