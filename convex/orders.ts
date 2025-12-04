import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

const orderStages = ["poruceno", "poslato", "stiglo", "legle_pare"] as const;
const transportModes = ["Kol", "Joe", "Posta", "Bex", "Aks"] as const;

const stageSchema = v.union(
  v.literal(orderStages[0]),
  v.literal(orderStages[1]),
  v.literal(orderStages[2]),
  v.literal(orderStages[3]),
);
const transportModeSchema = v.union(
  v.literal(transportModes[0]),
  v.literal(transportModes[1]),
  v.literal(transportModes[2]),
  v.literal(transportModes[3]),
  v.literal(transportModes[4]),
);

const normalizeStage = (stage?: (typeof orderStages)[number]) => {
  if (!stage) return orderStages[0];
  return orderStages.includes(stage) ? stage : orderStages[0];
};

const clampPercent = (percent?: number) => {
  if (percent === undefined || Number.isNaN(percent)) return undefined;
  return Math.min(Math.max(percent, 0), 100);
};

const normalizeTransportCost = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return undefined;
  return Math.max(value, 0);
};

const normalizeTransportMode = (mode?: (typeof transportModes)[number]) => {
  if (!mode) return undefined;
  return transportModes.includes(mode) ? mode : undefined;
};

const generateItemId = () => Math.random().toString(36).slice(2);

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

const resolveSupplierPrice = (
  product: any,
  variantId?: string,
  supplierId?: string,
) => {
  const offers = product?.supplierOffers ?? [];
  if (!Array.isArray(offers) || offers.length === 0) {
    return { supplierId: undefined, price: undefined as number | undefined };
  }
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
  const fallback = offers.filter((offer) => !offer.variantId);
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

const formatVariantLabel = (productName: string, variantLabel?: string) => {
  if (!variantLabel) return undefined;
  const trimmed = variantLabel.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase().startsWith(productName.toLowerCase())) return trimmed;
  return `${productName} - ${trimmed}`;
};

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
};

type OrderItemWithProduct = OrderItemRecord & { product?: any };

type IncomingItem = Partial<OrderItemRecord>;

const resolveItemsFromOrder = (order: Doc<"orders">): OrderItemRecord[] => {
  const stored = order.items ?? [];
  const normalized = stored
    .map((item) => ({
      id: item.id,
      productId: item.productId,
      supplierId: item.supplierId,
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      title: item.title || order.title,
      kolicina: normalizeQuantity(item.kolicina),
      nabavnaCena: sanitizePrice(item.nabavnaCena),
      prodajnaCena: sanitizePrice(item.prodajnaCena),
    }))
    .filter((item) => item.title && item.kolicina > 0);
  if (normalized.length > 0) return normalized;
  return [
    {
      id: generateItemId(),
      productId: order.productId,
      supplierId: order.supplierId,
      variantId: order.variantId,
      variantLabel: order.variantLabel,
      title: order.title,
      kolicina: normalizeQuantity(order.kolicina),
      nabavnaCena: sanitizePrice(order.nabavnaCena),
      prodajnaCena: sanitizePrice(order.prodajnaCena),
    },
  ];
};

const summarizeItems = (items: OrderItemRecord[]) => {
  const totals = items.reduce(
    (acc, item) => {
      acc.totalQty += item.kolicina;
      acc.totalProdajno += item.prodajnaCena * item.kolicina;
      acc.totalNabavno += item.nabavnaCena * item.kolicina;
      return acc;
    },
    { totalQty: 0, totalProdajno: 0, totalNabavno: 0 },
  );
  const avgProdajna = totals.totalQty > 0 ? totals.totalProdajno / totals.totalQty : 0;
  const avgNabavna = totals.totalQty > 0 ? totals.totalNabavno / totals.totalQty : 0;
  return { ...totals, avgProdajna, avgNabavna };
};

const normalizeOrderItems = async (
  ctx: any,
  userId: Id<"users">,
  incoming: IncomingItem[],
  fallbackTitle: string,
) => {
  const normalized: OrderItemRecord[] = [];

  for (const item of incoming) {
    const qty = normalizeQuantity(item.kolicina);
    let productId = item.productId;
    let supplierId = item.supplierId;
    let variantId = item.variantId;
    let variantLabel = item.variantLabel?.trim();
    let title = item.title?.trim();
    let nabavnaCena = item.nabavnaCena;
    let prodajnaCena = item.prodajnaCena;
    let product: Doc<"products"> | null = null;

    if (productId) {
      const fetched = await ctx.db.get(productId);
      if (fetched && fetched.userId === userId) {
        product = fetched;
      } else {
        productId = undefined;
        supplierId = undefined;
        variantId = undefined;
      }
    }

    if (product) {
      const productVariants = product.variants ?? [];
      let resolvedVariant: (typeof productVariants)[number] | undefined;
      if (productVariants.length > 0) {
        const foundVariant = variantId ? productVariants.find((variant) => variant.id === variantId) : undefined;
        resolvedVariant = foundVariant ?? productVariants.find((variant) => variant.isDefault) ?? productVariants[0];
        variantId = resolvedVariant?.id ?? variantId;
        const formattedLabel = formatVariantLabel(product.name, variantLabel ?? resolvedVariant?.label);
        variantLabel = formattedLabel ?? variantLabel;
      } else {
        variantId = undefined;
        variantLabel = undefined;
      }
      prodajnaCena = resolvedVariant?.prodajnaCena ?? product.prodajnaCena;
      const supplierChoice = resolveSupplierPrice(product, variantId, supplierId);
      supplierId = supplierChoice.supplierId ?? supplierId;
      nabavnaCena = supplierChoice.price ?? resolvedVariant?.nabavnaCena ?? product.nabavnaCena;
      if (!title) {
        title = variantLabel ?? product.name;
      }
    }

    const normalizedItem: OrderItemRecord = {
      id: item.id?.trim() || generateItemId(),
      productId,
      supplierId,
      variantId,
      variantLabel,
      title: title?.trim() || variantLabel || fallbackTitle || "Stavka",
      kolicina: qty,
      nabavnaCena: sanitizePrice(nabavnaCena),
      prodajnaCena: sanitizePrice(prodajnaCena),
    };
    normalized.push(normalizedItem);
  }

  return normalized.filter((item) => item.title && item.kolicina > 0);
};

const orderTotals = (order: Doc<"orders">) => {
  const items = resolveItemsFromOrder(order);
  const totals = summarizeItems(items);
  const transport = order.pickup ? 0 : order.transportCost ?? 0;
  const profit = totals.totalProdajno - totals.totalNabavno - transport;
  const myShare = order.stage === "legle_pare" ? profit * ((order.myProfitPercent ?? 0) / 100) : 0;
  return { items, totals, transport, profit, myShare };
};

const loadProductWithAssets = async (ctx: any, productId: Id<"products">, userId: Id<"users">) => {
  const storedProduct = await ctx.db.get(productId);
  if (!storedProduct || storedProduct.userId !== userId) return null;

  const images = await Promise.all(
    (storedProduct.images ?? []).map(async (image: any) => ({
      ...image,
      url: await ctx.storage.getUrl(image.storageId),
    })),
  );
  const variants = await Promise.all(
    (storedProduct.variants ?? []).map(async (variant: any) => {
      const variantImages = await Promise.all(
        (variant.images ?? []).map(async (image: any) => ({
          ...image,
          url: await ctx.storage.getUrl(image.storageId),
        })),
      );
      return { ...variant, images: variantImages };
    }),
  );
  const adImage = storedProduct.adImage
    ? { ...storedProduct.adImage, url: await ctx.storage.getUrl(storedProduct.adImage.storageId) }
    : undefined;

  return { ...storedProduct, images, variants, adImage };
};

const itemArgSchema = v.object({
  id: v.optional(v.string()),
  productId: v.optional(v.id("products")),
  supplierId: v.optional(v.id("suppliers")),
  variantId: v.optional(v.string()),
  variantLabel: v.optional(v.string()),
  title: v.optional(v.string()),
  kolicina: v.optional(v.number()),
  nabavnaCena: v.optional(v.number()),
  prodajnaCena: v.optional(v.number()),
});

export const latest = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const items = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    return items
      .sort((a, b) => b.kreiranoAt - a.kreiranoAt)
      .slice(0, 10)
      .map((order) => ({ ...order, items: resolveItemsFromOrder(order) }));
  },
});

export const summary = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    return orders.reduce(
      (acc, order) => {
        const { totals, transport, profit, myShare } = orderTotals(order);
        acc.brojNarudzbina += 1;
        acc.ukupnoProdajno += totals.totalProdajno;
        acc.ukupnoNabavno += totals.totalNabavno;
        acc.profit += profit;
        acc.mojProfit += myShare;
        return acc;
      },
      {
        brojNarudzbina: 0,
        ukupnoProdajno: 0,
        ukupnoNabavno: 0,
        profit: 0,
        mojProfit: 0,
      },
    );
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("orders") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const order = await ctx.db.get(args.id);
    if (!order || order.userId !== user._id) {
      return null;
    }

    const items = resolveItemsFromOrder(order);
    const productsMap = new Map<string, any>();
    const itemsWithProducts: OrderItemWithProduct[] = await Promise.all(
      items.map(async (item) => {
        if (!item.productId) return { ...item, product: undefined };
        const key = String(item.productId);
        if (!productsMap.has(key)) {
          productsMap.set(key, await loadProductWithAssets(ctx, item.productId, user._id));
        }
        return { ...item, product: productsMap.get(key) ?? undefined };
      }),
    );
    const primaryProduct = itemsWithProducts.find((item) => item.product)?.product;

    return { ...order, items: itemsWithProducts, product: primaryProduct };
  },
});

export const list = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const page = Math.max(args.page ?? 1, 1);
    const pageSize = Math.max(Math.min(args.pageSize ?? 20, 100), 1);

    let orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    orders = orders
      .map((order) => ({ ...order, items: resolveItemsFromOrder(order) }))
      .sort((a, b) => b.kreiranoAt - a.kreiranoAt);

    if (args.search) {
      const needle = args.search.toLowerCase();
      orders = orders.filter((order) => {
        const hasBaseMatch =
          order.title.toLowerCase().includes(needle) ||
          order.variantLabel?.toLowerCase().includes(needle) ||
          order.customerName.toLowerCase().includes(needle) ||
          order.address.toLowerCase().includes(needle) ||
          order.phone.toLowerCase().includes(needle);
        if (hasBaseMatch) return true;
        return (order.items ?? []).some(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            (item.variantLabel ?? "").toLowerCase().includes(needle),
        );
      });
    }

    const total = orders.length;
    const offset = (page - 1) * pageSize;
    const pageItems = orders.slice(offset, offset + pageSize);

    return {
      items: pageItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    };
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    stage: stageSchema,
    productId: v.optional(v.id("products")),
    supplierId: v.optional(v.id("suppliers")),
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.optional(v.number()),
    nabavnaCena: v.optional(v.number()),
    prodajnaCena: v.optional(v.number()),
    napomena: v.optional(v.string()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(transportModeSchema),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    myProfitPercent: v.optional(v.number()),
    pickup: v.optional(v.boolean()),
    items: v.optional(v.array(itemArgSchema)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const now = Date.now();
    const pickup = Boolean(args.pickup);
    const transportCost = pickup ? 0 : normalizeTransportCost(args.transportCost);
    const transportMode = pickup ? undefined : normalizeTransportMode(args.transportMode);

    const baseItems: IncomingItem[] =
      args.items && args.items.length > 0
        ? args.items
        : [
            {
              id: args.variantId ?? undefined,
              productId: args.productId,
              supplierId: args.supplierId,
              variantId: args.variantId,
              variantLabel: args.variantLabel,
              title: args.title,
              kolicina: args.kolicina,
              nabavnaCena: args.nabavnaCena,
              prodajnaCena: args.prodajnaCena,
            },
          ];

    const normalizedItems = await normalizeOrderItems(ctx, user._id, baseItems, args.title);
    if (normalizedItems.length === 0) {
      throw new Error("Dodaj bar jedan proizvod u narudzbinu.");
    }

    const totals = summarizeItems(normalizedItems);
    const title = args.title.trim() || normalizedItems[0].title || "Narudzbina";

    await ctx.db.insert("orders", {
      userId: user._id,
      stage: normalizeStage(args.stage),
      productId: normalizedItems[0].productId,
      supplierId: normalizedItems[0].supplierId,
      variantId: normalizedItems[0].variantId,
      variantLabel: normalizedItems[0].variantLabel,
      title,
      kolicina: Math.max(totals.totalQty, 1),
      nabavnaCena: totals.avgNabavna,
      prodajnaCena: totals.avgProdajna,
      napomena: args.napomena?.trim() || undefined,
      transportCost,
      transportMode,
      customerName: args.customerName.trim(),
      address: args.address.trim(),
      phone: args.phone.trim(),
      myProfitPercent: clampPercent(args.myProfitPercent),
      pickup,
      items: normalizedItems,
      kreiranoAt: now,
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("orders"),
    stage: stageSchema,
    productId: v.optional(v.id("products")),
    supplierId: v.optional(v.id("suppliers")),
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.optional(v.number()),
    nabavnaCena: v.optional(v.number()),
    prodajnaCena: v.optional(v.number()),
    napomena: v.optional(v.string()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(transportModeSchema),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    myProfitPercent: v.optional(v.number()),
    pickup: v.optional(v.boolean()),
    items: v.optional(v.array(itemArgSchema)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Narudzbina nije pronadjena.");
    }
    if (existing.userId !== user._id) {
      throw new Error("Neautorizovan pristup narudzbini.");
    }

    const pickup = args.pickup ?? existing.pickup ?? false;
    const transportCost = pickup ? 0 : normalizeTransportCost(args.transportCost);
    const transportMode = pickup ? undefined : normalizeTransportMode(args.transportMode);

    const baseItems: IncomingItem[] =
      args.items && args.items.length > 0
        ? args.items
        : resolveItemsFromOrder(existing).map((item) => ({ ...item }));

    const normalizedItems = await normalizeOrderItems(ctx, user._id, baseItems, args.title || existing.title);
    if (normalizedItems.length === 0) {
      throw new Error("Narudzbina mora imati bar jednu stavku.");
    }

    const totals = summarizeItems(normalizedItems);
    const title = args.title.trim() || normalizedItems[0].title || existing.title;

    await ctx.db.patch(args.id, {
      stage: normalizeStage(args.stage),
      productId: normalizedItems[0].productId,
      supplierId: normalizedItems[0].supplierId,
      variantId: normalizedItems[0].variantId,
      variantLabel: normalizedItems[0].variantLabel,
      title,
      kolicina: Math.max(totals.totalQty, 1),
      nabavnaCena: totals.avgNabavna,
      prodajnaCena: totals.avgProdajna,
      napomena: args.napomena?.trim() || undefined,
      transportCost,
      transportMode,
      customerName: args.customerName.trim(),
      address: args.address.trim(),
      phone: args.phone.trim(),
      myProfitPercent: clampPercent(args.myProfitPercent),
      pickup,
      items: normalizedItems,
    });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("orders") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const order = await ctx.db.get(args.id);
    if (!order) return;
    if (order.userId !== user._id) {
      throw new Error("Neautorizovan pristup narudzbini.");
    }
    await ctx.db.delete(args.id);
  },
});
