import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { normalizeSearchText } from "./search";

const orderStages = ["poruceno", "na_stanju", "poslato", "stiglo", "legle_pare"] as const;
const transportModes = ["Kol", "Joe", "Smg"] as const;
const pickupTransportModes = ["Kol", "Joe"] as const;
const legacyTransportModes = ["Posta", "Bex", "Aks"] as const;
const slanjeModes = ["Posta", "Aks", "Bex"] as const;
const orderScopes = ["default", "kalaba"] as const;

const stageSchema = v.union(
  v.literal(orderStages[0]),
  v.literal(orderStages[1]),
  v.literal(orderStages[2]),
  v.literal(orderStages[3]),
  v.literal(orderStages[4]),
);
const transportModeSchema = v.union(
  v.literal(transportModes[0]),
  v.literal(transportModes[1]),
  v.literal(transportModes[2]),
  v.literal(legacyTransportModes[0]),
  v.literal(legacyTransportModes[1]),
  v.literal(legacyTransportModes[2]),
);
const slanjeModeSchema = v.union(
  v.literal(slanjeModes[0]),
  v.literal(slanjeModes[1]),
  v.literal(slanjeModes[2]),
);
const slanjeOwnerSchema = v.string();
const orderScopeSchema = v.union(v.literal(orderScopes[0]), v.literal(orderScopes[1]));

const normalizeStage = (stage?: (typeof orderStages)[number]) => {
  if (!stage) return orderStages[0];
  return orderStages.includes(stage) ? stage : orderStages[0];
};

const normalizeScope = (scope?: (typeof orderScopes)[number]) => {
  if (!scope) return orderScopes[0];
  return scope === orderScopes[1] ? orderScopes[1] : orderScopes[0];
};

const normalizeTransportCost = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return undefined;
  return Math.max(value, 0);
};

const normalizeTransportMode = (mode?: string) => {
  if (!mode) return undefined;
  return (transportModes as readonly string[]).includes(mode) ? (mode as (typeof transportModes)[number]) : undefined;
};

const isPickupTransportMode = (mode?: string) =>
  (pickupTransportModes as readonly string[]).includes(mode ?? "");

const normalizeSlanjeMode = (mode?: string) => {
  if (!mode) return undefined;
  return (slanjeModes as readonly string[]).includes(mode) ? (mode as (typeof slanjeModes)[number]) : undefined;
};

const normalizeSlanjeOwner = (mode: (typeof slanjeModes)[number] | undefined, owner?: string) => {
  const trimmed = owner?.trim();
  if (!mode || !trimmed) return undefined;
  return trimmed;
};

const normalizeOwnerKey = (value?: string) => normalizeSearchText(value?.trim() ?? "");

const normalizeStartingAmount = (value?: number) => {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value < 0) return undefined;
  return value;
};

const normalizeProfitPercent = (value?: number) => {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value)) return undefined;
  if (value < 0 || value > 100) return undefined;
  return value;
};

const normalizeShipmentNumber = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const resolveProfitPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 100;

const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");

const upsertCustomer = async (
  ctx: any,
  userId: Id<"users">,
  scope: (typeof orderScopes)[number],
  input: { name: string; phone: string; address: string; pickup?: boolean },
  usedAt: number,
) => {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const address = input.address.trim();
  if (!name || !phone || !address) return;
  const phoneNormalized = normalizePhone(phone);
  if (!phoneNormalized) return;

  const existing = await ctx.db
    .query("customers")
    .withIndex("by_user_scope_phone", (q: any) =>
      q.eq("userId", userId).eq("scope", scope).eq("phoneNormalized", phoneNormalized),
    )
    .first();

  const payload = {
    name,
    nameNormalized: normalizeSearchText(name),
    phone,
    phoneNormalized,
    address,
    pickup: input.pickup ?? false,
    updatedAt: usedAt,
    lastUsedAt: usedAt,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return;
  }

  await ctx.db.insert("customers", {
    userId,
    scope,
    createdAt: usedAt,
    ...payload,
  });
};

const resolveSortIndex = (order: Doc<"orders">) => order.sortIndex ?? order.kreiranoAt;

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
  manualProdajna?: boolean;
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
      manualProdajna: Boolean((item as any).manualProdajna),
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
      manualProdajna: false,
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
    const manualProdajna = item.manualProdajna === true;
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
      const displayName = product.kpName ?? product.name;
      let resolvedVariant: (typeof productVariants)[number] | undefined;
      if (productVariants.length > 0) {
        const foundVariant = variantId ? productVariants.find((variant) => variant.id === variantId) : undefined;
        resolvedVariant = foundVariant ?? productVariants.find((variant) => variant.isDefault) ?? productVariants[0];
        variantId = resolvedVariant?.id ?? variantId;
        const formattedLabel = formatVariantLabel(displayName, variantLabel ?? resolvedVariant?.label);
        variantLabel = formattedLabel ?? variantLabel;
      } else {
        variantId = undefined;
        variantLabel = undefined;
      }
      const defaultProdajna = resolvedVariant?.prodajnaCena ?? product.prodajnaCena;
      prodajnaCena =
        manualProdajna && prodajnaCena !== undefined ? sanitizePrice(prodajnaCena) : defaultProdajna;
      const supplierChoice = resolveSupplierPrice(product, variantId, supplierId);
      supplierId = supplierChoice.supplierId ?? supplierId;
      nabavnaCena = supplierChoice.price ?? resolvedVariant?.nabavnaCena ?? product.nabavnaCena;
      if (!title) {
        title = variantLabel ?? displayName;
      }
    }
    if (!product) {
      prodajnaCena = sanitizePrice(prodajnaCena);
    }
    if (manualProdajna && (prodajnaCena === undefined || Number.isNaN(prodajnaCena))) {
      throw new Error("Unesi prodajnu cenu.");
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
      manualProdajna,
    };
    normalized.push(normalizedItem);
  }

  return normalized.filter((item) => item.title && item.kolicina > 0);
};

const orderTotals = (order: Doc<"orders">) => {
  const items = resolveItemsFromOrder(order);
  const totals = summarizeItems(items);
  const transport = order.transportCost ?? 0;
  const profit = totals.totalProdajno - totals.totalNabavno - transport;
  return { items, totals, transport, profit };
};

const resolveSlanjeModeFromOrder = (order: Doc<"orders">) => {
  const direct = normalizeSlanjeMode(order.slanjeMode as any);
  if (direct) return direct;
  const legacy = order.transportMode;
  return (legacyTransportModes as readonly string[]).includes(legacy as string) ? (legacy as typeof slanjeModes[number]) : undefined;
};

const resolveSlanjeOwnerFromOrder = (order: Doc<"orders">, mode?: (typeof slanjeModes)[number]) => {
  const rawOwner = typeof order.slanjeOwner === "string" ? order.slanjeOwner.trim() : "";
  const normalized = normalizeSlanjeOwner(mode, rawOwner);
  if (normalized) return normalized;
  return rawOwner || undefined;
};

const sortOwnerOptions = <T extends { count: number; lastUsedAt: number; value: string }>(left: T, right: T) => {
  if (right.count !== left.count) return right.count - left.count;
  if (right.lastUsedAt !== left.lastUsedAt) return right.lastUsedAt - left.lastUsedAt;
  return left.value.localeCompare(right.value);
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
  manualProdajna: v.optional(v.boolean()),
});

export const latest = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const items = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    const scoped = items.filter((order) => normalizeScope(order.scope) === "default");
    return scoped
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
    const scoped = orders.filter((order) => normalizeScope(order.scope) === "default");
    const paidOrders = scoped.filter((order) => normalizeStage(order.stage as any) === "legle_pare");
    const omerFeePerAksShipment = 2.5;

    const totals = paidOrders.reduce(
      (acc, order) => {
        const { totals: orderSums, transport, profit } = orderTotals(order);
        const shippingMode = resolveSlanjeModeFromOrder(order);
        acc.brojNarudzbina += 1;
        acc.ukupnoProdajno += orderSums.totalProdajno;
        acc.ukupnoNabavno += orderSums.totalNabavno;
        acc.ukupnoTransport += transport;
        acc.profit += profit;
        if (shippingMode === "Aks") {
          acc.omerBrojPosiljki += 1;
          acc.omerUkupno += omerFeePerAksShipment;
        }
        if (order.pickup) {
          acc.licnoPreuzimanjeBrojNarudzbina += 1;
          acc.ukupnoLicnoPreuzimanje += orderSums.totalProdajno;
        }
        return acc;
      },
      {
        brojNarudzbina: 0,
        ukupnoProdajno: 0,
        ukupnoNabavno: 0,
        ukupnoTransport: 0,
        profit: 0,
        omerUkupno: 0,
        omerBrojPosiljki: 0,
        ukupnoLicnoPreuzimanje: 0,
        licnoPreuzimanjeBrojNarudzbina: 0,
      },
    );

    return {
      ...totals,
      profit: totals.profit - totals.omerUkupno,
    };
  },
});

export const obracun = query({
  args: { token: v.string(), scope: v.optional(orderScopeSchema) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    const scoped = orders.filter((order) => normalizeScope(order.scope) === scope);
    const paidOrders = scoped.filter((order) => normalizeStage(order.stage as any) === "legle_pare");

    const postaMap = new Map<string, { owner: string; total: number; count: number }>();
    const aksBexMap = new Map<
      string,
      {
        owner: string;
        total: number;
        ordersTotal: number;
        startingAmount: number;
        aks: number;
        bex: number;
        count: number;
      }
    >();
    let totalPosta = 0;
    let totalAks = 0;
    let totalBex = 0;

    for (const order of paidOrders) {
      const mode = resolveSlanjeModeFromOrder(order);
      if (!mode) continue;
      const owner = resolveSlanjeOwnerFromOrder(order, mode) ?? "Nepoznato";
      const ownerKey = normalizeOwnerKey(owner);
      if (!ownerKey) continue;
      const { totals } = orderTotals(order);
      const amount = totals.totalProdajno;

      if (mode === "Posta") {
        const existing = postaMap.get(ownerKey) ?? { owner, total: 0, count: 0 };
        existing.total += amount;
        existing.count += 1;
        postaMap.set(ownerKey, existing);
        totalPosta += amount;
        continue;
      }

      const existing = aksBexMap.get(ownerKey) ?? {
        owner,
        total: 0,
        ordersTotal: 0,
        startingAmount: 0,
        aks: 0,
        bex: 0,
        count: 0,
      };
      existing.ordersTotal += amount;
      existing.total = existing.ordersTotal + existing.startingAmount;
      existing.count += 1;
      if (mode === "Aks") {
        existing.aks += amount;
        totalAks += amount;
      } else {
        existing.bex += amount;
        totalBex += amount;
      }
      aksBexMap.set(ownerKey, existing);
    }

    const shippingAccounts = await ctx.db
      .query("shippingAccounts")
      .withIndex("by_user_scope_updatedAt", (q) => q.eq("userId", user._id).eq("scope", scope))
      .collect();

    let totalStarting = 0;
    for (const account of shippingAccounts) {
      const owner = account.value.trim();
      const ownerKey = account.valueNormalized || normalizeOwnerKey(owner);
      if (!ownerKey) continue;
      const startingAmount = normalizeStartingAmount(account.startingAmount) ?? 0;
      const existing = aksBexMap.get(ownerKey) ?? {
        owner: owner || "Nepoznato",
        total: 0,
        ordersTotal: 0,
        startingAmount: 0,
        aks: 0,
        bex: 0,
        count: 0,
      };
      existing.owner = existing.owner || owner || "Nepoznato";
      existing.startingAmount = startingAmount;
      existing.total = existing.ordersTotal + startingAmount;
      aksBexMap.set(ownerKey, existing);
      totalStarting += startingAmount;
    }

    const totalFromOrders = totalAks + totalBex;
    const totalWithStarting = totalFromOrders + totalStarting;

    return {
      aksBex: {
        total: totalWithStarting,
        totalAks,
        totalBex,
        totalFromOrders,
        totalStarting,
        totalWithStarting,
        byOwner: Array.from(aksBexMap.values()).sort(
          (a, b) => b.total - a.total || b.ordersTotal - a.ordersTotal || a.owner.localeCompare(b.owner),
        ),
      },
      posta: {
        total: totalPosta,
        byOwner: Array.from(postaMap.values()).sort((a, b) => b.total - a.total || a.owner.localeCompare(b.owner)),
      },
      meta: {
        ordersCount: paidOrders.length,
      },
    };
  },
});

export const shippingOwners = query({
  args: { token: v.string(), scope: v.optional(orderScopeSchema) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    const scoped = orders.filter((order) => normalizeScope(order.scope) === scope);

    const postaMap = new Map<string, { value: string; count: number; lastUsedAt: number }>();
    const accountMap = new Map<
      string,
      {
        value: string;
        count: number;
        lastUsedAt: number;
        aksCount: number;
        bexCount: number;
        startingAmount: number;
      }
    >();

    for (const order of scoped) {
      const mode = resolveSlanjeModeFromOrder(order);
      const owner = resolveSlanjeOwnerFromOrder(order, mode);
      if (!mode || !owner) continue;
      const ownerKey = normalizeOwnerKey(owner);
      if (!ownerKey) continue;

      if (mode === "Posta") {
        const existing = postaMap.get(ownerKey) ?? { value: owner, count: 0, lastUsedAt: 0 };
        existing.count += 1;
        existing.lastUsedAt = Math.max(existing.lastUsedAt, order.kreiranoAt);
        postaMap.set(ownerKey, existing);
        continue;
      }

      const existing = accountMap.get(ownerKey) ?? {
        value: owner,
        count: 0,
        lastUsedAt: 0,
        aksCount: 0,
        bexCount: 0,
        startingAmount: 0,
      };
      existing.count += 1;
      existing.lastUsedAt = Math.max(existing.lastUsedAt, order.kreiranoAt);
      if (mode === "Aks") {
        existing.aksCount += 1;
      } else {
        existing.bexCount += 1;
      }
      accountMap.set(ownerKey, existing);
    }

    const shippingAccounts = await ctx.db
      .query("shippingAccounts")
      .withIndex("by_user_scope_updatedAt", (q) => q.eq("userId", user._id).eq("scope", scope))
      .collect();

    for (const account of shippingAccounts) {
      const value = account.value.trim();
      const key = account.valueNormalized || normalizeOwnerKey(value);
      if (!key) continue;
      const startingAmount = normalizeStartingAmount(account.startingAmount) ?? 0;
      const existing = accountMap.get(key) ?? {
        value,
        count: 0,
        lastUsedAt: 0,
        aksCount: 0,
        bexCount: 0,
        startingAmount: 0,
      };
      existing.value = existing.value || value;
      existing.lastUsedAt = Math.max(existing.lastUsedAt, account.updatedAt);
      existing.startingAmount = startingAmount;
      accountMap.set(key, existing);
    }

    return {
      aksBexAccounts: Array.from(accountMap.values()).sort(sortOwnerOptions),
      postaNames: Array.from(postaMap.values()).sort(sortOwnerOptions),
    };
  },
});

export const upsertShippingAccount = mutation({
  args: {
    token: v.string(),
    scope: v.optional(orderScopeSchema),
    value: v.string(),
    startingAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const value = args.value.trim();
    if (value.length < 2) {
      throw new Error("Unesi naziv racuna.");
    }

    const valueNormalized = normalizeOwnerKey(value);
    if (!valueNormalized) {
      throw new Error("Unesi naziv racuna.");
    }

    const startingAmount = normalizeStartingAmount(args.startingAmount);
    if (startingAmount === undefined) {
      throw new Error("Pocetni iznos mora biti 0 ili vise.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("shippingAccounts")
      .withIndex("by_user_scope_value", (q) =>
        q.eq("userId", user._id).eq("scope", scope).eq("valueNormalized", valueNormalized),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        startingAmount,
        updatedAt: now,
      });
      return { id: existing._id, value, startingAmount };
    }

    const id = await ctx.db.insert("shippingAccounts", {
      userId: user._id,
      scope,
      value,
      valueNormalized,
      startingAmount,
      createdAt: now,
      updatedAt: now,
    });
    return { id, value, startingAmount };
  },
});

export const get = query({
  args: { token: v.string(), id: v.id("orders"), scope: v.optional(orderScopeSchema) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const order = await ctx.db.get(args.id);
    if (!order || order.userId !== user._id) {
      return null;
    }
    if (normalizeScope(order.scope) !== scope) {
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
    stages: v.optional(v.array(stageSchema)),
    unreturnedOnly: v.optional(v.boolean()),
    returnedOnly: v.optional(v.boolean()),
    pickupOnly: v.optional(v.boolean()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    scope: v.optional(orderScopeSchema),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const page = Math.max(args.page ?? 1, 1);
    const pageSize = Math.max(Math.min(args.pageSize ?? 20, 100), 1);
    const rawFrom = typeof args.dateFrom === "number" && Number.isFinite(args.dateFrom) ? args.dateFrom : undefined;
    const rawTo = typeof args.dateTo === "number" && Number.isFinite(args.dateTo) ? args.dateTo : undefined;
    const dateFrom = rawFrom !== undefined && rawTo !== undefined && rawFrom > rawTo ? rawTo : rawFrom;
    const dateTo = rawFrom !== undefined && rawTo !== undefined && rawFrom > rawTo ? rawFrom : rawTo;

    let orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    orders = orders
      .filter((order) => normalizeScope(order.scope) === scope)
      .map((order) => ({ ...order, items: resolveItemsFromOrder(order) }))
      .sort((a, b) => resolveSortIndex(b) - resolveSortIndex(a) || b.kreiranoAt - a.kreiranoAt);

    if (args.search) {
      const needle = normalizeSearchText(args.search.trim());
      if (needle) {
        const matchesNeedle = (value?: string) => normalizeSearchText(value ?? "").includes(needle);
        orders = orders.filter((order) => {
          const hasBaseMatch =
            matchesNeedle(order.title) ||
            matchesNeedle(order.variantLabel) ||
            matchesNeedle(order.customerName) ||
            matchesNeedle(order.address) ||
            matchesNeedle(order.phone);
          if (hasBaseMatch) return true;
          return (order.items ?? []).some(
            (item) =>
              matchesNeedle(item.title) ||
              matchesNeedle(item.variantLabel),
          );
        });
      }
    }

    if (dateFrom !== undefined) {
      orders = orders.filter((order) => order.kreiranoAt >= dateFrom);
    }
    if (dateTo !== undefined) {
      orders = orders.filter((order) => order.kreiranoAt <= dateTo);
    }

    if (args.stages && args.stages.length > 0) {
      const allowedStages = new Set(args.stages.map((stage) => normalizeStage(stage)));
      orders = orders.filter((order) => allowedStages.has(normalizeStage(order.stage as any)));
    }

    if (args.returnedOnly) {
      orders = orders.filter((order) => order.povratVracen);
    } else if (args.unreturnedOnly) {
      orders = orders.filter((order) => !order.povratVracen);
    }

    if (args.pickupOnly) {
      orders = orders.filter((order) => Boolean(order.pickup));
    }

    const totals = orders.reduce(
      (acc, order) => {
        const summary = orderTotals(order);
        const myProfitPercent = resolveProfitPercent(order.myProfitPercent);
        const myProfit = summary.profit * (myProfitPercent / 100);
        const profitShare = myProfit * 0.5;
        const povrat = summary.totals.totalNabavno + summary.transport + profitShare;
        acc.nabavno += summary.totals.totalNabavno;
        acc.transport += summary.transport;
        acc.prodajno += summary.totals.totalProdajno;
        acc.profit += profitShare;
        acc.povrat += povrat;
        return acc;
      },
      { nabavno: 0, transport: 0, prodajno: 0, profit: 0, povrat: 0 },
    );

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
      totals,
    };
  },
});

export const byProduct = query({
  args: {
    token: v.string(),
    productId: v.id("products"),
    scope: v.optional(orderScopeSchema),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = args.scope ? normalizeScope(args.scope) : null;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();

    const matched: Array<Doc<"orders"> & { items: OrderItemRecord[] }> = [];
    for (const order of orders) {
      if (scope && normalizeScope(order.scope) !== scope) continue;
      const items = resolveItemsFromOrder(order);
      const hasProduct = items.some((item) => String(item.productId) === String(args.productId));
      if (!hasProduct) continue;
      matched.push({ ...order, items });
    }

    return matched.sort(
      (a, b) => resolveSortIndex(b) - resolveSortIndex(a) || b.kreiranoAt - a.kreiranoAt,
    );
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    scope: v.optional(orderScopeSchema),
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
    brojPosiljke: v.optional(v.string()),
    povratVracen: v.optional(v.boolean()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(transportModeSchema),
    slanjeMode: v.optional(slanjeModeSchema),
    slanjeOwner: v.optional(slanjeOwnerSchema),
    myProfitPercent: v.optional(v.number()),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    pickup: v.optional(v.boolean()),
    items: v.optional(v.array(itemArgSchema)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const now = Date.now();
    const pickup = Boolean(args.pickup);
    const povratVracen = args.povratVracen ?? false;
    const transportCost = normalizeTransportCost(args.transportCost);
    const normalizedTransportMode = normalizeTransportMode(args.transportMode);
    if (pickup && normalizedTransportMode === "Smg") {
      throw new Error("Za licno preuzimanje izaberi Kol ili Joe.");
    }
    const transportMode =
      pickup && !isPickupTransportMode(normalizedTransportMode) ? undefined : normalizedTransportMode;
    const slanjeMode = pickup ? undefined : normalizeSlanjeMode(args.slanjeMode);
    const slanjeOwner = pickup ? undefined : normalizeSlanjeOwner(slanjeMode, args.slanjeOwner);
    const brojPosiljke = normalizeShipmentNumber(args.brojPosiljke);
    const myProfitPercent = normalizeProfitPercent(args.myProfitPercent);
    if (args.myProfitPercent !== undefined && myProfitPercent === undefined) {
      throw new Error("Procenat profita mora biti izmedju 0 i 100.");
    }
    const resolvedProfitPercent = myProfitPercent ?? 100;

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
              manualProdajna: false,
            },
          ];

    const normalizedItems = await normalizeOrderItems(ctx, user._id, baseItems, args.title);
    if (normalizedItems.length === 0) {
      throw new Error("Dodaj bar jedan proizvod u narudzbinu.");
    }

    const totals = summarizeItems(normalizedItems);
    const title = args.title.trim() || normalizedItems[0].title || "Narudzbina";
    const customerName = args.customerName.trim();
    const address = args.address.trim();
    const phone = args.phone.trim();

    await ctx.db.insert("orders", {
      userId: user._id,
      scope,
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
      brojPosiljke,
      povratVracen,
      transportCost,
      transportMode,
      slanjeMode,
      slanjeOwner,
      myProfitPercent: resolvedProfitPercent,
      customerName,
      address,
      phone,
      pickup,
      items: normalizedItems,
      sortIndex: now,
      kreiranoAt: now,
    });

    await upsertCustomer(
      ctx,
      user._id,
      scope,
      { name: customerName, phone, address, pickup },
      now,
    );
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("orders"),
    scope: v.optional(orderScopeSchema),
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
    brojPosiljke: v.optional(v.string()),
    povratVracen: v.optional(v.boolean()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(transportModeSchema),
    slanjeMode: v.optional(slanjeModeSchema),
    slanjeOwner: v.optional(slanjeOwnerSchema),
    myProfitPercent: v.optional(v.number()),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    pickup: v.optional(v.boolean()),
    items: v.optional(v.array(itemArgSchema)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error("Narudzbina nije pronadjena.");
    }
    if (existing.userId !== user._id) {
      throw new Error("Neautorizovan pristup narudzbini.");
    }
    if (normalizeScope(existing.scope) !== scope) {
      throw new Error("Neautorizovan pristup narudzbini.");
    }

    const pickup = args.pickup ?? existing.pickup ?? false;
    const povratVracen = args.povratVracen ?? existing.povratVracen ?? false;
    const transportCost = normalizeTransportCost(args.transportCost);
    const normalizedTransportMode = normalizeTransportMode(args.transportMode);
    if (pickup && normalizedTransportMode === "Smg") {
      throw new Error("Za licno preuzimanje izaberi Kol ili Joe.");
    }
    const transportMode =
      pickup && !isPickupTransportMode(normalizedTransportMode) ? undefined : normalizedTransportMode;
    const slanjeMode = pickup ? undefined : normalizeSlanjeMode(args.slanjeMode);
    const slanjeOwner = pickup ? undefined : normalizeSlanjeOwner(slanjeMode, args.slanjeOwner);
    const brojPosiljke =
      args.brojPosiljke === undefined
        ? normalizeShipmentNumber(existing.brojPosiljke)
        : normalizeShipmentNumber(args.brojPosiljke);
    const myProfitPercent = normalizeProfitPercent(args.myProfitPercent);
    if (args.myProfitPercent !== undefined && myProfitPercent === undefined) {
      throw new Error("Procenat profita mora biti izmedju 0 i 100.");
    }
    const resolvedProfitPercent =
      args.myProfitPercent === undefined ? existing.myProfitPercent : myProfitPercent ?? 100;

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
    const customerName = args.customerName.trim();
    const address = args.address.trim();
    const phone = args.phone.trim();
    const usedAt = Date.now();

    await ctx.db.patch(args.id, {
      scope,
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
      brojPosiljke,
      povratVracen,
      transportCost,
      transportMode,
      slanjeMode,
      slanjeOwner,
      myProfitPercent: resolvedProfitPercent,
      customerName,
      address,
      phone,
      pickup,
      items: normalizedItems,
    });

    await upsertCustomer(
      ctx,
      user._id,
      scope,
      { name: customerName, phone, address, pickup },
      usedAt,
    );
  },
});

export const reorder = mutation({
  args: {
    token: v.string(),
    scope: v.optional(orderScopeSchema),
    orderIds: v.array(v.id("orders")),
    base: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const seen = new Set<string>();
    const orderedIds = args.orderIds.filter((id) => {
      const key = String(id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (orderedIds.length === 0) return;

    for (const orderId of orderedIds) {
      const order = await ctx.db.get(orderId);
      if (!order || order.userId !== user._id) {
        throw new Error("Neautorizovan pristup narudzbini.");
      }
      if (normalizeScope(order.scope) !== scope) {
        throw new Error("Neautorizovan pristup narudzbini.");
      }
    }

    const base = typeof args.base === "number" && Number.isFinite(args.base) ? args.base : Date.now();
    for (let index = 0; index < orderedIds.length; index += 1) {
      await ctx.db.patch(orderedIds[index], { sortIndex: base - index });
    }
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("orders"), scope: v.optional(orderScopeSchema) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const order = await ctx.db.get(args.id);
    if (!order) return;
    if (order.userId !== user._id) {
      throw new Error("Neautorizovan pristup narudzbini.");
    }
    if (normalizeScope(order.scope) !== scope) {
      throw new Error("Neautorizovan pristup narudzbini.");
    }
    await ctx.db.delete(args.id);
  },
});
