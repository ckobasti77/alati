import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

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
    const search = args.search?.trim().toLowerCase();
    const narrowed = search
      ? items.filter((item) => {
          const name = (item.kpName ?? item.name).toLowerCase();
          const fbName = item.name.toLowerCase();
          return name.includes(search) || fbName.includes(search);
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
    categoryIds: v.optional(v.array(v.id("categories"))),
    opis: v.optional(v.string()),
    opisKp: v.optional(v.string()),
    opisFbInsta: v.optional(v.string()),
    publishKp: v.optional(v.boolean()),
    publishFb: v.optional(v.boolean()),
    publishIg: v.optional(v.boolean()),
    pickupAvailable: v.optional(v.boolean()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
    adImage: v.optional(productAdImageArg),
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
    const pickupAvailable = Boolean(args.pickupAvailable);
    const images = normalizeImages(undefined, args.images);
    const variants = normalizeVariants(args.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const nabavnaCenaIsReal = args.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? true;
    const adImage = normalizeAdImage(undefined, args.adImage);
    const categoryIds = normalizeCategoryIds(args.categoryIds);
    const productId = await ctx.db.insert("products", {
      userId: user._id,
      name: fbName,
      kpName,
      nabavnaCena: defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      nabavnaCenaIsReal,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      variants,
      images,
      adImage,
      opis: opisFbInsta ? opisFbInsta : undefined,
      opisFbInsta: opisFbInsta || undefined,
      opisKp: opisKp || undefined,
      categoryIds,
      publishKp,
      publishFb,
      publishIg,
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
    categoryIds: v.optional(v.array(v.id("categories"))),
    opis: v.optional(v.string()),
    opisKp: v.optional(v.string()),
    opisFbInsta: v.optional(v.string()),
    publishKp: v.optional(v.boolean()),
    publishFb: v.optional(v.boolean()),
    publishIg: v.optional(v.boolean()),
    pickupAvailable: v.optional(v.boolean()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
    adImage: v.optional(v.union(v.null(), productAdImageArg)),
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
    const resolvedKpName = kpName === undefined ? product.kpName ?? product.name : kpName || fbName;
    const resolvedOpisFb = opisFbInsta === undefined ? product.opisFbInsta ?? product.opis : opisFbInsta || undefined;
    const resolvedOpisKp = opisKp === undefined ? product.opisKp : opisKp || undefined;
    const resolvedOpisLegacy = opis === undefined ? resolvedOpisFb ?? product.opis : opis || undefined;
    const publishKp = args.publishKp ?? product.publishKp ?? false;
    const publishFb = args.publishFb ?? product.publishFb ?? false;
    const publishIg = args.publishIg ?? product.publishIg ?? false;
    const pickupAvailable = args.pickupAvailable ?? product.pickupAvailable ?? false;
    const images = normalizeImages(product.images, args.images);
    const variants = normalizeVariants(args.variants, product.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const nabavnaCenaIsReal =
      args.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? product.nabavnaCenaIsReal ?? true;
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
      (variants ?? []).flatMap((variant) => (variant.images ?? []).map((image) => image.storageId)),
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
      nabavnaCena: defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      nabavnaCenaIsReal,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      variants,
      images,
      adImage,
      opis: resolvedOpisLegacy,
      opisFbInsta: resolvedOpisFb,
      opisKp: resolvedOpisKp,
      categoryIds,
      publishKp,
      publishFb,
      publishIg,
      pickupAvailable,
      updatedAt: Date.now(),
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
