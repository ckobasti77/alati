import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { requireUser } from "./auth";
import { normalizeSearchText } from "./search";

const productImageArg = v.object({
  storageId: v.id("_storage"),
  isMain: v.boolean(),
  fileName: v.optional(v.string()),
  contentType: v.optional(v.string()),
  publishFb: v.optional(v.boolean()),
  publishIg: v.optional(v.boolean()),
  uploadedAt: v.optional(v.number()),
});

const productAdImageArg = v.object({
  storageId: v.id("_storage"),
  fileName: v.optional(v.string()),
  contentType: v.optional(v.string()),
  uploadedAt: v.optional(v.number()),
});

const productVariantArg = v.object({
  id: v.string(),
  label: v.string(),
  nabavnaCena: v.number(),
  nabavnaCenaIsReal: v.optional(v.boolean()),
  prodajnaCena: v.number(),
  isDefault: v.boolean(),
  opis: v.optional(v.string()),
  images: v.optional(
    v.array(
      v.object({
        storageId: v.id("_storage"),
        isMain: v.boolean(),
        fileName: v.optional(v.string()),
        contentType: v.optional(v.string()),
        publishFb: v.optional(v.boolean()),
        publishIg: v.optional(v.boolean()),
        uploadedAt: v.optional(v.number()),
      }),
    ),
  ),
});

const supplierOfferArg = v.object({
  supplierId: v.id("suppliers"),
  price: v.number(),
  variantId: v.optional(v.string()),
});

type SupplierOffer = {
  supplierId: Id<"suppliers">;
  price: number;
  variantId?: string;
};

type OrderItemTotals = {
  productId?: Id<"products">;
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
};

type ProductSortOption =
  | "created_desc"
  | "price_desc"
  | "price_asc"
  | "sales_desc"
  | "profit_desc";

function normalizeSupplierOffers(
  incoming?: SupplierOffer[],
  options?: { variants?: { id: string }[] },
) {
  if (!incoming || incoming.length === 0) return undefined;
  const allowedVariantIds = new Set(options?.variants?.map((variant) => variant.id));
  const seen = new Set<string>();
  const normalized: SupplierOffer[] = [];

  incoming.forEach((offer) => {
    const variantId = offer.variantId?.trim() || undefined;
    if (variantId && allowedVariantIds.size > 0 && !allowedVariantIds.has(variantId)) {
      return;
    }
    const price = Number.isFinite(offer.price) ? Math.max(offer.price, 0) : 0;
    const key = `${offer.supplierId}-${variantId ?? "base"}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({ supplierId: offer.supplierId, price, variantId });
  });

  return normalized.length ? normalized : undefined;
}

function resolveSupplierPrice(
  offers: SupplierOffer[] | undefined,
  variantId?: string,
  options?: { fallbackToBase?: boolean },
) {
  if (!offers || offers.length === 0) return undefined;
  const exactMatches = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
  const fallbackMatches = options?.fallbackToBase === false ? [] : offers.filter((offer) => !offer.variantId);
  const pool = exactMatches.length > 0 ? exactMatches : fallbackMatches;
  if (pool.length === 0) return undefined;
  return pool.reduce((min, offer) => Math.min(min, offer.price), Number.POSITIVE_INFINITY);
}

function normalizeImages(
  images: Doc<"products">["images"],
  incoming: {
    storageId: Id<"_storage">;
    isMain: boolean;
    fileName?: string;
    contentType?: string;
    publishFb?: boolean;
    publishIg?: boolean;
    uploadedAt?: number;
  }[] = [],
) {
  if (!incoming.length) {
    return [];
  }

  const existingMap = new Map(images?.map((image) => [image.storageId, image]));
  let hasMain = incoming.some((image) => image.isMain);
  const now = Date.now();

  return incoming.map((image, index) => {
    const previous = existingMap.get(image.storageId);
    const isMain = hasMain ? image.isMain : index === 0;
    if (!hasMain && index === 0) {
      hasMain = true;
    }
    return {
      storageId: image.storageId,
      isMain,
      fileName: image.fileName ?? previous?.fileName,
      contentType: image.contentType ?? previous?.contentType,
      publishFb: image.publishFb ?? previous?.publishFb ?? true,
      publishIg: image.publishIg ?? previous?.publishIg ?? true,
      uploadedAt: image.uploadedAt ?? previous?.uploadedAt ?? now,
    };
  });
}

function normalizeAdImage(
  previous: Doc<"products">["adImage"],
  incoming?:
    | {
        storageId: Id<"_storage">;
        fileName?: string;
        contentType?: string;
        uploadedAt?: number;
      }
    | null,
) {
  if (incoming === undefined) {
    return previous;
  }
  if (incoming === null) {
    return undefined;
  }
  const now = Date.now();
  return {
    storageId: incoming.storageId,
    fileName: incoming.fileName ?? previous?.fileName,
    contentType: incoming.contentType ?? previous?.contentType,
    uploadedAt: incoming.uploadedAt ?? previous?.uploadedAt ?? now,
  };
}

function normalizeVariants(
  incoming?:
    | {
        id: string;
        label: string;
        nabavnaCena: number;
        nabavnaCenaIsReal?: boolean;
        prodajnaCena: number;
        isDefault: boolean;
        opis?: string;
        images?: {
          storageId: Id<"_storage">;
          isMain: boolean;
          fileName?: string;
          contentType?: string;
          publishFb?: boolean;
          publishIg?: boolean;
          uploadedAt?: number;
        }[];
      }[]
    | undefined,
  previous?:
    | {
        id: string;
        nabavnaCenaIsReal?: boolean;
        images?: {
          storageId: Id<"_storage">;
          isMain: boolean;
          fileName?: string;
          contentType?: string;
          publishFb?: boolean;
          publishIg?: boolean;
          uploadedAt: number;
        }[];
      }[]
    | undefined,
) {
  if (!incoming || incoming.length === 0) {
    return undefined;
  }

  let hasDefault = incoming.some((variant) => variant.isDefault);
  const prevMap = new Map(previous?.map((variant) => [variant.id, variant]));
  return incoming.map((variant, index) => {
    const isDefault = hasDefault ? variant.isDefault : index === 0;
    if (!hasDefault && index === 0) {
      hasDefault = true;
    }
    const opis = variant.opis?.trim();
    const prevImages = prevMap.get(variant.id)?.images;
    const images = normalizeImages(
      prevImages,
      variant.images?.map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
        publishFb: image.publishFb,
        publishIg: image.publishIg,
        uploadedAt: image.uploadedAt,
      })),
    );
    return {
      id: variant.id,
      label: variant.label.trim() || `Tip ${index + 1}`,
      nabavnaCena: Math.max(variant.nabavnaCena, 0),
      nabavnaCenaIsReal: variant.nabavnaCenaIsReal ?? prevMap.get(variant.id)?.nabavnaCenaIsReal ?? true,
      prodajnaCena: Math.max(variant.prodajnaCena, 0),
      isDefault,
      opis: opis && opis.length > 0 ? opis : undefined,
      images,
    };
  });
}

function normalizeCategoryIds(incoming?: Id<"categories">[]) {
  if (incoming === undefined) {
    return undefined;
  }
  const seen = new Set<string>();
  const normalized: Id<"categories">[] = [];
  incoming.forEach((id) => {
    const key = String(id);
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(id);
  });
  return normalized;
}

function resolvePrimaryVariant(product: Doc<"products">) {
  const variants = product.variants ?? [];
  return variants.find((variant) => variant.isDefault) ?? variants[0];
}

function resolveProductSalePrice(product: Doc<"products">) {
  const primary = resolvePrimaryVariant(product);
  return primary?.prodajnaCena ?? product.prodajnaCena ?? 0;
}

export const get = query({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== user._id) {
      return null;
    }

    const images = await Promise.all(
      (product.images ?? []).map(async (image) => ({
        ...image,
        url: await ctx.storage.getUrl(image.storageId),
      })),
    );
    const adImage = product.adImage
      ? {
          ...product.adImage,
          url: await ctx.storage.getUrl(product.adImage.storageId),
        }
      : undefined;

    const variants = await Promise.all(
      (product.variants ?? []).map(async (variant) => {
        const variantImages = await Promise.all(
          (variant.images ?? []).map(async (image) => ({
            ...image,
            url: await ctx.storage.getUrl(image.storageId),
          })),
        );
        return { ...variant, images: variantImages };
      }),
    );

    return { ...product, images, variants, adImage };
  },
});

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const items = await ctx.db
      .query("products")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();
    const withUrls = await Promise.all(
      items.map(async (item) => {
        const images = await Promise.all(
          (item.images ?? []).map(async (image) => ({
            ...image,
            url: await ctx.storage.getUrl(image.storageId),
          })),
        );
        const adImage = item.adImage
          ? { ...item.adImage, url: await ctx.storage.getUrl(item.adImage.storageId) }
          : undefined;
        const variants = await Promise.all(
          (item.variants ?? []).map(async (variant) => {
            const variantImages = await Promise.all(
              (variant.images ?? []).map(async (image) => ({
                ...image,
                url: await ctx.storage.getUrl(image.storageId),
              })),
            );
            return { ...variant, images: variantImages };
          }),
        );
        return { ...item, images, variants, adImage };
      }),
    );
    return withUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listPaginated = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal("created_desc"),
        v.literal("price_desc"),
        v.literal("price_asc"),
        v.literal("sales_desc"),
        v.literal("profit_desc"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const page = Math.max(args.page ?? 1, 1);
    const pageSize = Math.max(Math.min(args.pageSize ?? 20, 100), 1);
    const sortBy: ProductSortOption = args.sortBy ?? "created_desc";
    const needsStats = sortBy === "sales_desc" || sortBy === "profit_desc";
    const statsMap = needsStats ? await buildProductStatsMap(ctx, user._id) : null;

    let items = await ctx.db
      .query("products")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();

    const rawSearch = args.search?.trim();
    const needle = rawSearch ? normalizeSearchText(rawSearch) : "";
    if (needle) {
      const categories = await ctx.db.query("categories").collect();
      const categoryMap = new Map(
        categories.map((category) => [String(category._id), normalizeSearchText(category.name)]),
      );
      items = items.filter((product) => {
        const displayName = product.kpName ?? product.name ?? "";
        const baseText = normalizeSearchText(
          `${displayName} ${product.opisKp ?? ""} ${product.opisFbInsta ?? ""} ${product.opis ?? ""}`,
        );
        if (baseText.includes(needle)) return true;
        if ((product.variants ?? []).some((variant) => normalizeSearchText(variant.label).includes(needle))) {
          return true;
        }
        const hasCategoryHit = (product.categoryIds ?? []).some((id) => {
          const name = categoryMap.get(String(id));
          return name ? name.includes(needle) : false;
        });
        return hasCategoryHit;
      });
    }

    const compareCreatedAt = (a: Doc<"products">, b: Doc<"products">) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
    items = items.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return resolveProductSalePrice(a) - resolveProductSalePrice(b) || compareCreatedAt(a, b);
        case "price_desc":
          return resolveProductSalePrice(b) - resolveProductSalePrice(a) || compareCreatedAt(a, b);
        case "sales_desc": {
          const salesA = statsMap?.get(a._id)?.salesCount ?? 0;
          const salesB = statsMap?.get(b._id)?.salesCount ?? 0;
          return salesB - salesA || compareCreatedAt(a, b);
        }
        case "profit_desc": {
          const profitA = statsMap?.get(a._id)?.profit ?? 0;
          const profitB = statsMap?.get(b._id)?.profit ?? 0;
          return profitB - profitA || compareCreatedAt(a, b);
        }
        case "created_desc":
        default:
          return compareCreatedAt(a, b);
      }
    });
    const total = items.length;
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

    const withUrls = await Promise.all(
      pageItems.map(async (item) => {
        const images = await Promise.all(
          (item.images ?? []).map(async (image) => ({
            ...image,
            url: await ctx.storage.getUrl(image.storageId),
          })),
        );
        const adImage = item.adImage
          ? { ...item.adImage, url: await ctx.storage.getUrl(item.adImage.storageId) }
          : undefined;
        const variants = await Promise.all(
          (item.variants ?? []).map(async (variant) => {
            const variantImages = await Promise.all(
              (variant.images ?? []).map(async (image) => ({
                ...image,
                url: await ctx.storage.getUrl(image.storageId),
              })),
            );
            return { ...variant, images: variantImages };
          }),
        );
        return { ...item, images, variants, adImage };
      }),
    );

    return {
      items: withUrls,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    };
  },
});

function normalizeOrderQuantity(value?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(Math.round(parsed), 1);
}

function sanitizeOrderPrice(value?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function resolveOrderItems(order: any): OrderItemTotals[] {
  const stored = order.items ?? [];
  const normalized = stored
    .map((item: any) => ({
      productId: item.productId,
      kolicina: normalizeOrderQuantity(item.kolicina),
      nabavnaCena: sanitizeOrderPrice(item.nabavnaCena),
      prodajnaCena: sanitizeOrderPrice(item.prodajnaCena),
    }))
    .filter((item: OrderItemTotals) => item.kolicina > 0);
  if (normalized.length > 0) return normalized;
  return [
    {
      productId: order.productId,
      kolicina: normalizeOrderQuantity(order.kolicina),
      nabavnaCena: sanitizeOrderPrice(order.nabavnaCena),
      prodajnaCena: sanitizeOrderPrice(order.prodajnaCena),
    },
  ];
}

type ProductStatsMap = Map<
  Id<"products">,
  { salesCount: number; revenue: number; profit: number }
>;

async function buildProductStatsMap(ctx: Pick<QueryCtx, "db">, userId: Id<"users">): Promise<ProductStatsMap> {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", userId))
    .collect();

  const statsMap: ProductStatsMap = new Map();

  orders.forEach((order) => {
    if (order.stage !== "legle_pare" && order.stage !== "na_stanju") return;
    const items = resolveOrderItems(order);
    const transport = order.transportCost ?? 0;
    const totalProdajno = items.reduce((sum, item) => sum + item.prodajnaCena * item.kolicina, 0);
    items.forEach((item) => {
      if (!item.productId) return;
      const itemProdajno = item.prodajnaCena * item.kolicina;
      const transportShare =
        totalProdajno > 0 ? (transport * itemProdajno) / totalProdajno : transport / items.length;
      const itemNabavno = item.nabavnaCena * item.kolicina;
      const key = item.productId as Id<"products">;
      const current = statsMap.get(key) ?? {
        salesCount: 0,
        revenue: 0,
        profit: 0,
      };
      current.salesCount += item.kolicina;
      current.revenue += itemProdajno;
      current.profit += itemProdajno - itemNabavno - (Number.isFinite(transportShare) ? transportShare : 0);
      statsMap.set(key, current);
    });
  });

  return statsMap;
}

export const stats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const statsMap = await buildProductStatsMap(ctx, user._id);

    return Array.from(statsMap.entries()).map(([productId, data]) => ({
      productId,
      salesCount: data.salesCount,
      revenue: data.revenue,
      profit: data.profit,
    }));
  },
});

async function toPublicProduct(ctx: { storage: any }, product: Doc<"products">) {
  const images = await Promise.all(
    (product.images ?? []).map(async (image) => ({
      ...image,
      url: await ctx.storage.getUrl(image.storageId),
    })),
  );
  const adImage = product.adImage
    ? { ...product.adImage, url: await ctx.storage.getUrl(product.adImage.storageId) }
    : undefined;
  const variants = await Promise.all(
    (product.variants ?? []).map(async (variant) => {
      const variantImages = await Promise.all(
        (variant.images ?? []).map(async (image) => ({
          ...image,
          url: await ctx.storage.getUrl(image.storageId),
        })),
      );
      return {
        id: variant.id,
        label: variant.label,
        prodajnaCena: variant.prodajnaCena,
        isDefault: variant.isDefault,
        opis: variant.opis,
        images: variantImages,
      };
    }),
  );
  const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
  return {
    id: product._id,
    name: product.kpName ?? product.name,
    kpName: product.kpName ?? product.name,
    fbName: product.name,
    prodajnaCena: defaultVariant?.prodajnaCena ?? product.prodajnaCena,
    opis: product.opisFbInsta ?? product.opisKp ?? product.opis,
    opisKp: product.opisKp,
    opisFbInsta: product.opisFbInsta,
    images,
    adImage,
    variants: variants.length ? variants : undefined,
    publishKp: product.publishKp,
    publishFb: product.publishFb,
    publishIg: product.publishIg,
    publishFbProfile: product.publishFbProfile,
    publishMarketplace: product.publishMarketplace,
    pickupAvailable: Boolean(product.pickupAvailable),
    categoryIds: product.categoryIds,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export const listPublic = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const items = await ctx.db.query("products").withIndex("by_createdAt").collect();
    const rawSearch = args.search?.trim();
    const needle = rawSearch ? normalizeSearchText(rawSearch) : "";
    const narrowed = needle
      ? items.filter((item) => {
          const name = normalizeSearchText(item.kpName ?? item.name);
          return name.includes(needle);
        })
      : items;
    const withUrls = await Promise.all(narrowed.map((item) => toPublicProduct(ctx, item)));
    return withUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getPublic = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      return null;
    }
    return await toPublicProduct(ctx, product);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    kpName: v.optional(v.string()),
    nabavnaCena: v.number(),
    nabavnaCenaIsReal: v.optional(v.boolean()),
    prodajnaCena: v.number(),
    supplierOffers: v.optional(v.array(supplierOfferArg)),
    categoryIds: v.optional(v.array(v.id("categories"))),
    opis: v.optional(v.string()),
    opisKp: v.optional(v.string()),
    opisFbInsta: v.optional(v.string()),
    publishKp: v.optional(v.boolean()),
    publishFb: v.optional(v.boolean()),
    publishIg: v.optional(v.boolean()),
    publishFbProfile: v.optional(v.boolean()),
    publishMarketplace: v.optional(v.boolean()),
    pickupAvailable: v.optional(v.boolean()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
    adImage: v.optional(v.union(v.null(), productAdImageArg)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const now = Date.now();
    const fbName = args.name.trim();
    const kpName = args.kpName?.trim() || fbName;
    const opisKp = args.opisKp?.trim();
    const opisFbInsta = args.opisFbInsta?.trim() ?? args.opis?.trim();
    const publishKp = Boolean(args.publishKp);
    const publishFb = Boolean(args.publishFb);
    const publishIg = Boolean(args.publishIg);
    const publishFbProfile = Boolean(args.publishFbProfile);
    const publishMarketplace = Boolean(args.publishMarketplace);
    const pickupAvailable = Boolean(args.pickupAvailable);
    const images = normalizeImages(undefined, args.images);
    const variants = normalizeVariants(args.variants);
    const supplierOffers = normalizeSupplierOffers(args.supplierOffers, { variants });
    const variantsWithSupplierPrices = variants?.map((variant) => {
      const supplierPrice = resolveSupplierPrice(supplierOffers, variant.id, { fallbackToBase: false });
      if (supplierPrice === undefined) return variant;
      return { ...variant, nabavnaCena: supplierPrice, nabavnaCenaIsReal: true };
    });
    const defaultVariant = variantsWithSupplierPrices?.find((variant) => variant.isDefault) ?? variantsWithSupplierPrices?.[0];
    const supplierPrice = resolveSupplierPrice(supplierOffers, defaultVariant?.id);
    const nabavnaCenaIsReal =
      supplierPrice !== undefined ? true : args.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? true;
    const adImage = normalizeAdImage(undefined, args.adImage);
    const categoryIds = normalizeCategoryIds(args.categoryIds);
    const productId = await ctx.db.insert("products", {
      userId: user._id,
      name: fbName,
      kpName,
      nabavnaCena: supplierPrice ?? defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      nabavnaCenaIsReal,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      supplierOffers,
      variants: variantsWithSupplierPrices,
      images,
      adImage,
      opis: opisFbInsta ? opisFbInsta : undefined,
      opisFbInsta: opisFbInsta || undefined,
      opisKp: opisKp || undefined,
      categoryIds,
      publishKp,
      publishFb,
      publishIg,
      publishFbProfile,
      publishMarketplace,
      pickupAvailable,
      createdAt: now,
      updatedAt: now,
    });
    return productId;
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("products"),
    name: v.string(),
    kpName: v.optional(v.string()),
    nabavnaCena: v.number(),
    nabavnaCenaIsReal: v.optional(v.boolean()),
    prodajnaCena: v.number(),
    supplierOffers: v.optional(v.array(supplierOfferArg)),
    categoryIds: v.optional(v.array(v.id("categories"))),
    opis: v.optional(v.string()),
    opisKp: v.optional(v.string()),
    opisFbInsta: v.optional(v.string()),
    publishKp: v.optional(v.boolean()),
    publishFb: v.optional(v.boolean()),
    publishIg: v.optional(v.boolean()),
    publishFbProfile: v.optional(v.boolean()),
    publishMarketplace: v.optional(v.boolean()),
    pickupAvailable: v.optional(v.boolean()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
    adImage: v.optional(v.union(v.null(), productAdImageArg)),
    expectedUpdatedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Proizvod nije pronadjen.");
    }
    if (product.userId !== user._id) {
      throw new Error("Neautorizovan pristup proizvodu.");
    }
    const fbName = args.name.trim();
    const kpName = args.kpName?.trim();
    const opis = args.opis?.trim();
    const opisKp = args.opisKp?.trim();
    const opisFbInsta = args.opisFbInsta?.trim();
    const expectedUpdatedAt = args.expectedUpdatedAt ?? product.updatedAt;
    if (expectedUpdatedAt < product.updatedAt) {
      throw new Error("Proizvod je u medjuvremenu promenjen. Osvezi stranicu i pokusaj ponovo.");
    }
    const nextUpdatedAt = args.updatedAt ?? Date.now();
    const resolvedKpName = kpName === undefined ? product.kpName ?? product.name : kpName || fbName;
    const resolvedOpisFb = opisFbInsta === undefined ? product.opisFbInsta ?? product.opis : opisFbInsta || undefined;
    const resolvedOpisKp = opisKp === undefined ? product.opisKp : opisKp || undefined;
    const resolvedOpisLegacy = opis === undefined ? resolvedOpisFb ?? product.opis : opis || undefined;
    const publishKp = args.publishKp ?? product.publishKp ?? false;
    const publishFb = args.publishFb ?? product.publishFb ?? false;
    const publishIg = args.publishIg ?? product.publishIg ?? false;
    const publishFbProfile = args.publishFbProfile ?? product.publishFbProfile ?? false;
    const publishMarketplace = args.publishMarketplace ?? product.publishMarketplace ?? false;
    const pickupAvailable = args.pickupAvailable ?? product.pickupAvailable ?? false;
    const images = normalizeImages(product.images, args.images);
    const variants = normalizeVariants(args.variants, product.variants);
    const supplierOffers =
      args.supplierOffers === undefined
        ? normalizeSupplierOffers(product.supplierOffers as SupplierOffer[] | undefined, { variants })
        : normalizeSupplierOffers(args.supplierOffers, { variants });
    const variantsWithSupplierPrices = variants?.map((variant) => {
      const supplierPrice = resolveSupplierPrice(supplierOffers, variant.id, { fallbackToBase: false });
      if (supplierPrice === undefined) return variant;
      return { ...variant, nabavnaCena: supplierPrice, nabavnaCenaIsReal: true };
    });
    const defaultVariant = variantsWithSupplierPrices?.find((variant) => variant.isDefault) ?? variantsWithSupplierPrices?.[0];
    const supplierPrice = resolveSupplierPrice(supplierOffers, defaultVariant?.id);
    const nabavnaCenaIsReal =
      supplierPrice !== undefined
        ? true
        : args.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? product.nabavnaCenaIsReal ?? true;
    const adImage = normalizeAdImage(product.adImage, args.adImage);
    const categoryIds =
      args.categoryIds === undefined ? product.categoryIds : normalizeCategoryIds(args.categoryIds) ?? [];
    const removedImages = (product.images ?? []).filter(
      (existing) => !images.find((image) => image.storageId === existing.storageId),
    );
    const removedVariantImages: Id<"_storage">[] = [];
    const prevVariantImageMap = new Map(
      (product.variants ?? []).flatMap((variant) => (variant.images ?? []).map((image) => [image.storageId, variant.id])),
    );
    const nextVariantImageSet = new Set(
      (variantsWithSupplierPrices ?? []).flatMap((variant) => (variant.images ?? []).map((image) => image.storageId)),
    );
    prevVariantImageMap.forEach((_, storageId) => {
      if (!nextVariantImageSet.has(storageId)) {
        removedVariantImages.push(storageId);
      }
    });
    const previousAdImageId = product.adImage?.storageId;
    await ctx.db.patch(args.id, {
      name: fbName,
      kpName: resolvedKpName,
      nabavnaCena: supplierPrice ?? defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      nabavnaCenaIsReal,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      supplierOffers,
      variants: variantsWithSupplierPrices,
      images,
      adImage,
      opis: resolvedOpisLegacy,
      opisFbInsta: resolvedOpisFb,
      opisKp: resolvedOpisKp,
      categoryIds,
      publishKp,
      publishFb,
      publishIg,
      publishFbProfile,
      publishMarketplace,
      pickupAvailable,
      updatedAt: nextUpdatedAt,
    });
    await Promise.all(
      removedImages.map(async (image) => {
        try {
          await ctx.storage.delete(image.storageId);
        } catch (error) {
          console.error("Failed to delete removed image", image.storageId, error);
        }
      }),
    );
    await Promise.all(
      removedVariantImages.map(async (storageId) => {
        try {
          await ctx.storage.delete(storageId);
        } catch (error) {
          console.error("Failed to delete removed variant image", storageId, error);
        }
      }),
    );
    if (previousAdImageId && previousAdImageId !== adImage?.storageId) {
      try {
        await ctx.storage.delete(previousAdImageId);
      } catch (error) {
        console.error("Failed to delete removed ad image", previousAdImageId, error);
      }
    }
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const product = await ctx.db.get(args.id);
    if (!product) return;
    if (product.userId !== user._id) {
      throw new Error("Neautorizovan pristup proizvodu.");
    }
    await ctx.db.delete(args.id);
    await Promise.all(
      (product.images ?? []).map(async (image) => {
        try {
          await ctx.storage.delete(image.storageId);
        } catch (error) {
          console.error("Failed to delete image", image.storageId, error);
        }
      }),
    );
    if (product.adImage) {
      try {
        await ctx.storage.delete(product.adImage.storageId);
      } catch (error) {
        console.error("Failed to delete ad image", product.adImage.storageId, error);
      }
    }
    await Promise.all(
      (product.variants ?? [])
        .flatMap((variant) => variant.images ?? [])
        .map(async (image) => {
          try {
            await ctx.storage.delete(image.storageId);
          } catch (error) {
            console.error("Failed to delete variant image", image.storageId, error);
          }
        }),
    );
  },
});

export const markSocialPublished = mutation({
  args: {
    token: v.string(),
    id: v.id("products"),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== user._id) {
      throw new Error("Proizvod nije pronadjen.");
    }
    const patch =
      args.platform === "facebook"
        ? { publishFb: true }
        : { publishIg: true };
    await ctx.db.patch(args.id, {
      ...patch,
      updatedAt: Date.now(),
    });
  },
});

export const markSocialPublishedInternal = internalMutation({
  args: {
    id: v.id("products"),
    userId: v.id("users"),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Proizvod nije pronadjen.");
    }
    if (product.userId && product.userId !== args.userId) {
      throw new Error("Neautorizovan pristup proizvodu.");
    }
    const patch =
      args.platform === "facebook"
        ? { publishFb: true }
        : { publishIg: true };
    await ctx.db.patch(args.id, {
      ...patch,
      updatedAt: Date.now(),
    });
  },
});

