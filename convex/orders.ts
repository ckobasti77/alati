import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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

const formatVariantLabel = (productName: string, variantLabel?: string) => {
  if (!variantLabel) return undefined;
  const trimmed = variantLabel.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase().startsWith(productName.toLowerCase())) return trimmed;
  return `${productName} - ${trimmed}`;
};

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
      .slice(0, 10);
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
        const prodajno = order.prodajnaCena * order.kolicina;
        const nabavno = order.nabavnaCena * order.kolicina;
        const transport = order.transportCost ?? 0;
        const profit = prodajno - nabavno - transport;
        const canCountMyShare = order.stage === "legle_pare";
        const myShare = canCountMyShare ? profit * ((order.myProfitPercent ?? 0) / 100) : 0;
        acc.brojNarudzbina += 1;
        acc.ukupnoProdajno += prodajno;
        acc.ukupnoNabavno += nabavno;
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

    let product;
    if (order.productId) {
      const storedProduct = await ctx.db.get(order.productId);
      if (storedProduct && storedProduct.userId === user._id) {
        const images = await Promise.all(
          (storedProduct.images ?? []).map(async (image) => ({
            ...image,
            url: await ctx.storage.getUrl(image.storageId),
          })),
        );
        const variants = await Promise.all(
          (storedProduct.variants ?? []).map(async (variant) => {
            const variantImages = await Promise.all(
              (variant.images ?? []).map(async (image) => ({
                ...image,
                url: await ctx.storage.getUrl(image.storageId),
              })),
            );
            return { ...variant, images: variantImages };
          }),
        );
        product = { ...storedProduct, images, variants };
      }
    }

    return { ...order, product };
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

    let items = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    items = items.sort((a, b) => b.kreiranoAt - a.kreiranoAt);

    if (args.search) {
      const needle = args.search.toLowerCase();
      items = items.filter((order) => {
        if (order.title.toLowerCase().includes(needle)) return true;
        if (order.variantLabel?.toLowerCase().includes(needle)) return true;
        if (order.customerName.toLowerCase().includes(needle)) return true;
        if (order.address.toLowerCase().includes(needle)) return true;
        if (order.phone.toLowerCase().includes(needle)) return true;
        return false;
      });
    }

    const total = items.length;
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

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
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.optional(v.number()),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(transportModeSchema),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    myProfitPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const now = Date.now();

    let title = args.title.trim();
    const kolicina = Math.max(args.kolicina ?? 1, 1);
    let productId = args.productId;
    let variantId = args.variantId;
    let variantLabel = args.variantLabel?.trim();
    const customerName = args.customerName.trim();
    const address = args.address.trim();
    const phone = args.phone.trim();
    const stage = normalizeStage(args.stage);
    const myProfitPercent = clampPercent(args.myProfitPercent);
    const transportCost = normalizeTransportCost(args.transportCost);
    const transportMode = normalizeTransportMode(args.transportMode);

    if (productId) {
      const product = await ctx.db.get(productId);
      if (product && product.userId === user._id) {
        if (!title) title = product.name;
        const productVariants = product.variants ?? [];
        if (productVariants.length > 0) {
          const foundVariant = variantId
            ? productVariants.find((variant) => variant.id === variantId)
            : undefined;
          let normalizedVariant = foundVariant;
          if (!normalizedVariant) {
            normalizedVariant = productVariants.find((variant) => variant.isDefault) ?? productVariants[0];
          }
          variantId = normalizedVariant?.id ?? variantId;
          const formattedIncoming = formatVariantLabel(product.name, variantLabel);
          const fallbackLabel = normalizedVariant ? formatVariantLabel(product.name, normalizedVariant.label) : undefined;
          variantLabel = formattedIncoming ?? fallbackLabel;
        } else {
          variantId = variantLabel = undefined;
        }
      } else {
        productId = undefined;
        variantId = undefined;
        variantLabel = undefined;
      }
    }

    if (!title) {
      throw new Error("Naziv narudzbine je obavezan.");
    }

    await ctx.db.insert("orders", {
      userId: user._id,
      stage,
      productId,
      variantId,
      variantLabel,
      title,
      kolicina,
      nabavnaCena: args.nabavnaCena,
      prodajnaCena: args.prodajnaCena,
      napomena: args.napomena?.trim() || undefined,
      transportCost,
      transportMode,
      customerName,
      address,
      phone,
      myProfitPercent,
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
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.optional(v.number()),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(transportModeSchema),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    myProfitPercent: v.optional(v.number()),
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
    let title = args.title.trim();
    const kolicina = Math.max(args.kolicina ?? 1, 1);
    let productId = args.productId;
    let variantId = args.variantId;
    let variantLabel = args.variantLabel?.trim();
    const customerName = args.customerName.trim();
    const address = args.address.trim();
    const phone = args.phone.trim();
    const stage = normalizeStage(args.stage);
    const myProfitPercent = clampPercent(args.myProfitPercent);
    const transportCost = normalizeTransportCost(args.transportCost);

    if (productId) {
      const product = await ctx.db.get(productId);
      if (product && product.userId === user._id) {
        if (!title) title = product.name;
        const productVariants = product.variants ?? [];
        if (productVariants.length > 0) {
          const foundVariant = variantId ? productVariants.find((variant) => variant.id === variantId) : undefined;
          let normalizedVariant = foundVariant;
          if (!normalizedVariant) {
            normalizedVariant = productVariants.find((variant) => variant.isDefault) ?? productVariants[0];
          }
          variantId = normalizedVariant?.id ?? variantId;
          const formattedIncoming = formatVariantLabel(product.name, variantLabel);
          const fallbackLabel = normalizedVariant ? formatVariantLabel(product.name, normalizedVariant.label) : undefined;
          variantLabel = formattedIncoming ?? fallbackLabel;
        } else {
          variantId = undefined;
          variantLabel = undefined;
        }
      } else {
        productId = undefined;
        variantId = undefined;
        variantLabel = undefined;
      }
    }

    if (!title) {
      throw new Error("Naziv narudzbine je obavezan.");
    }

    const transportMode = normalizeTransportMode(args.transportMode);

    await ctx.db.patch(args.id, {
      stage,
      productId,
      variantId,
      variantLabel,
      title,
      kolicina,
      nabavnaCena: args.nabavnaCena,
      prodajnaCena: args.prodajnaCena,
      napomena: args.napomena?.trim() || undefined,
      transportCost,
      transportMode,
      customerName,
      address,
      phone,
      myProfitPercent,
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
