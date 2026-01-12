import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./auth";

type OrderItemRecord = {
  id: string;
  productId?: Id<"products">;
  supplierId?: Id<"suppliers">;
  variantId?: string;
  variantLabel?: string;
  title: string;
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
  manualProdajna?: boolean;
};

const normalizeQuantity = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(Math.round(parsed), 1);
};

const sanitizePrice = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const normalizeLabel = (value?: string) => value?.trim().toLowerCase() || "";

const resolveVariantFromLabel = (product: Doc<"products">, variantLabel?: string) => {
  const normalizedLabel = normalizeLabel(variantLabel);
  if (!normalizedLabel) return undefined;
  const displayName = normalizeLabel(product.kpName ?? product.name);
  return (product.variants ?? []).find((variant) => {
    const variantName = normalizeLabel(variant.label);
    if (!variantName) return false;
    if (normalizedLabel === variantName) return true;
    if (displayName && normalizedLabel === `${displayName} - ${variantName}`) return true;
    return false;
  });
};

const resolveSupplierPrice = (
  product: Doc<"products">,
  variantId?: string,
  supplierId?: Id<"suppliers">,
) => {
  const offers = product?.supplierOffers ?? [];
  if (!Array.isArray(offers) || offers.length === 0) {
    return { supplierId: undefined, price: undefined as number | undefined };
  }
  const normalizedVariantId = variantId?.trim() || undefined;
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (normalizedVariantId ?? null));
  const fallback = normalizedVariantId ? [] : offers.filter((offer) => !offer.variantId);
  const pool = exact.length > 0 ? exact : fallback;
  if (!pool.length) {
    return { supplierId: undefined, price: undefined as number | undefined };
  }
  const hasIncoming = supplierId ? pool.find((offer) => String(offer.supplierId) === String(supplierId)) : undefined;
  const resolvedSupplierId = hasIncoming
    ? hasIncoming.supplierId
    : pool.length === 1
      ? pool[0].supplierId
      : undefined;
  const price = hasIncoming
    ? hasIncoming.price
    : pool.reduce((min, offer) => Math.min(min, offer.price), Number.POSITIVE_INFINITY);
  return { supplierId: resolvedSupplierId, price: Number.isFinite(price) ? price : undefined };
};

const summarizeItems = (items: OrderItemRecord[]) => {
  return items.reduce(
    (acc, item) => {
      const qty = normalizeQuantity(item.kolicina);
      if (!item.title || qty <= 0) return acc;
      acc.totalQty += qty;
      acc.totalProdajno += sanitizePrice(item.prodajnaCena) * qty;
      acc.totalNabavno += sanitizePrice(item.nabavnaCena) * qty;
      return acc;
    },
    { totalQty: 0, totalProdajno: 0, totalNabavno: 0 },
  );
};

export const backfillUserIds = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user: admin } = await requireAdmin(ctx, args.token);
    let productsUpdated = 0;
    let ordersUpdated = 0;

    const products = await ctx.db.query("products").collect();
    await Promise.all(
      products.map(async (product) => {
        if (!product.userId) {
          await ctx.db.patch(product._id, { userId: admin._id });
          productsUpdated += 1;
        }
      }),
    );

    const orders = await ctx.db.query("orders").collect();
    await Promise.all(
      orders.map(async (order) => {
        if (!order.userId) {
          await ctx.db.patch(order._id, { userId: admin._id });
          ordersUpdated += 1;
        }
      }),
    );

    return { productsUpdated, ordersUpdated };
  },
});

export const backfillOrderVariantPurchasePrices = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const orders = await ctx.db.query("orders").collect();
    const productCache = new Map<string, Doc<"products"> | null>();
    let ordersUpdated = 0;
    let itemsUpdated = 0;

    for (const order of orders) {
      const storedItems = (order.items ?? []) as OrderItemRecord[];
      const hasItems = storedItems.length > 0;
      let updatedItems = storedItems;
      let itemsChanged = false;

      if (hasItems) {
        const itemResults = await Promise.all(
          storedItems.map(async (item) => {
            if (!item.productId) return item;
            const key = String(item.productId);
            let product = productCache.get(key);
            if (product === undefined) {
              product = await ctx.db.get(item.productId);
              productCache.set(key, product ?? null);
            }
            if (!product) return item;
            const canUseProduct =
              !order.userId || !product.userId || String(order.userId) === String(product.userId);
            if (!canUseProduct) return item;

            const normalizedVariantId = item.variantId?.trim() || undefined;
            const variant =
              normalizedVariantId
                ? (product.variants ?? []).find((entry) => entry.id === normalizedVariantId)
                : resolveVariantFromLabel(product, item.variantLabel);
            const effectiveVariantId = normalizedVariantId ?? variant?.id;
            const supplierChoice = resolveSupplierPrice(product, effectiveVariantId, item.supplierId);
            const nextNabavna = sanitizePrice(
              supplierChoice.price ?? variant?.nabavnaCena ?? product.nabavnaCena,
            );
            const nextSupplierId = supplierChoice.supplierId ?? item.supplierId;
            const currentNabavna = sanitizePrice(item.nabavnaCena);

            const priceChanged = nextNabavna !== currentNabavna;
            const supplierChanged =
              nextSupplierId && String(nextSupplierId) !== String(item.supplierId);
            if (!priceChanged && !supplierChanged) return item;

            return { ...item, nabavnaCena: nextNabavna, supplierId: nextSupplierId };
          }),
        );
        let itemChanges = 0;
        updatedItems = itemResults.map((item, index) => {
          const original = storedItems[index];
          const changed = item !== original;
          if (changed) itemChanges += 1;
          return item;
        });
        if (itemChanges > 0) {
          itemsUpdated += itemChanges;
          itemsChanged = true;
        }
      }

      let nextNabavna = sanitizePrice(order.nabavnaCena);
      if (hasItems) {
        const totals = summarizeItems(updatedItems);
        nextNabavna = totals.totalQty > 0 ? totals.totalNabavno / totals.totalQty : 0;
      } else if (order.productId) {
        const key = String(order.productId);
        let product = productCache.get(key);
        if (product === undefined) {
          product = await ctx.db.get(order.productId);
          productCache.set(key, product ?? null);
        }
        if (product) {
          const canUseProduct =
            !order.userId || !product.userId || String(order.userId) === String(product.userId);
          if (canUseProduct) {
            const normalizedVariantId = order.variantId?.trim() || undefined;
            const variant =
              normalizedVariantId
                ? (product.variants ?? []).find((entry) => entry.id === normalizedVariantId)
                : resolveVariantFromLabel(product, order.variantLabel);
            const effectiveVariantId = normalizedVariantId ?? variant?.id;
            const supplierChoice = resolveSupplierPrice(product, effectiveVariantId, order.supplierId);
            nextNabavna = sanitizePrice(
              supplierChoice.price ?? variant?.nabavnaCena ?? product.nabavnaCena,
            );
          }
        }
      }

      const orderNabavna = sanitizePrice(order.nabavnaCena);
      const nabavnaChanged = nextNabavna !== orderNabavna;
      if (!itemsChanged && !nabavnaChanged) continue;

      const patch: Partial<Doc<"orders">> = { nabavnaCena: nextNabavna };
      if (hasItems) {
        patch.items = updatedItems as Doc<"orders">["items"];
      }
      await ctx.db.patch(order._id, patch);
      ordersUpdated += 1;
    }

    return { ordersUpdated, itemsUpdated };
  },
});
