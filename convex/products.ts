import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

const productImageArg = v.object({
  storageId: v.id("_storage"),
  isMain: v.boolean(),
  fileName: v.optional(v.string()),
  contentType: v.optional(v.string()),
  uploadedAt: v.optional(v.number()),
});

const productVariantArg = v.object({
  id: v.string(),
  label: v.string(),
  nabavnaCena: v.number(),
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
      uploadedAt: image.uploadedAt ?? previous?.uploadedAt ?? now,
    };
  });
}

function normalizeVariants(
  incoming?:
    | {
        id: string;
        label: string;
        nabavnaCena: number;
        prodajnaCena: number;
        isDefault: boolean;
        opis?: string;
        images?: {
          storageId: Id<"_storage">;
          isMain: boolean;
          fileName?: string;
          contentType?: string;
          uploadedAt?: number;
        }[];
      }[]
    | undefined,
  previous?:
    | {
        id: string;
        images?: {
          storageId: Id<"_storage">;
          isMain: boolean;
          fileName?: string;
          contentType?: string;
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
        uploadedAt: image.uploadedAt,
      })),
    );
    return {
      id: variant.id,
      label: variant.label.trim() || `Tip ${index + 1}`,
      nabavnaCena: Math.max(variant.nabavnaCena, 0),
      prodajnaCena: Math.max(variant.prodajnaCena, 0),
      isDefault,
      opis: opis && opis.length > 0 ? opis : undefined,
      images,
    };
  });
}

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
        return { ...item, images, variants };
      }),
    );
    return withUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    opis: v.optional(v.string()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const now = Date.now();
    const opis = args.opis?.trim();
    const images = normalizeImages(undefined, args.images);
    const variants = normalizeVariants(args.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    await ctx.db.insert("products", {
      userId: user._id,
      name: args.name,
      nabavnaCena: defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      variants,
      images,
      opis: opis ? opis : undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("products"),
    name: v.string(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    opis: v.optional(v.string()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
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
    const opis = args.opis?.trim();
    const images = normalizeImages(product.images, args.images);
    const variants = normalizeVariants(args.variants, product.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
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
    await ctx.db.patch(args.id, {
      name: args.name,
      nabavnaCena: defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      variants,
      images,
      opis: opis ? opis : undefined,
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
