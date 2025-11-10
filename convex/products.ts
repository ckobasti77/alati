import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { shareProductOnMeta } from "./social";

const productImageArg = v.object({
  storageId: v.id("_storage"),
  isMain: v.boolean(),
  fileName: v.optional(v.string()),
  contentType: v.optional(v.string()),
});

const productVariantArg = v.object({
  id: v.string(),
  label: v.string(),
  nabavnaCena: v.number(),
  prodajnaCena: v.number(),
  isDefault: v.boolean(),
});

function normalizeImages(
  images: Doc<"products">["images"],
  incoming: {
    storageId: Id<"_storage">;
    isMain: boolean;
    fileName?: string;
    contentType?: string;
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
      uploadedAt: previous?.uploadedAt ?? now,
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
      }[]
    | undefined,
) {
  if (!incoming || incoming.length === 0) {
    return undefined;
  }

  let hasDefault = incoming.some((variant) => variant.isDefault);
  return incoming.map((variant, index) => {
    const isDefault = hasDefault ? variant.isDefault : index === 0;
    if (!hasDefault && index === 0) {
      hasDefault = true;
    }
    return {
      id: variant.id,
      label: variant.label.trim() || `Tip ${index + 1}`,
      nabavnaCena: Math.max(variant.nabavnaCena, 0),
      prodajnaCena: Math.max(variant.prodajnaCena, 0),
      isDefault,
    };
  });
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("products").collect();
    const withUrls = await Promise.all(
      items.map(async (item) => {
        const images = await Promise.all(
          (item.images ?? []).map(async (image) => ({
            ...image,
            url: await ctx.storage.getUrl(image.storageId),
          })),
        );
        return { ...item, images };
      }),
    );
    return withUrls.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    opis: v.optional(v.string()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const opis = args.opis?.trim();
    const images = normalizeImages(undefined, args.images);
    const variants = normalizeVariants(args.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const productId = await ctx.db.insert("products", {
      name: args.name,
      nabavnaCena: defaultVariant?.nabavnaCena ?? args.nabavnaCena,
      prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
      variants,
      images,
      opis: opis ? opis : undefined,
      createdAt: now,
      updatedAt: now,
    });
    const imagesWithUrls = await Promise.all(
      (images ?? []).map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        if (!url) return null;
        return {
          url,
          isMain: image.isMain,
          uploadedAt: image.uploadedAt ?? 0,
        };
      }),
    );
    const orderedImages = imagesWithUrls
      .filter((image): image is { url: string; isMain: boolean; uploadedAt: number } => image !== null)
      .sort((a, b) => {
        if (a.isMain === b.isMain) {
          return a.uploadedAt - b.uploadedAt;
        }
        return a.isMain ? -1 : 1;
      })
      .map((image) => ({ url: image.url }));
    try {
      await shareProductOnMeta({
        name: args.name,
        opis: opis ? opis : undefined,
        prodajnaCena: defaultVariant?.prodajnaCena ?? args.prodajnaCena,
        images: orderedImages,
      });
    } catch (error) {
      console.error("Failed to share product on Meta surfaces", { productId }, error);
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    opis: v.optional(v.string()),
    variants: v.optional(v.array(productVariantArg)),
    images: v.optional(v.array(productImageArg)),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error("Proizvod nije pronadjen.");
    }
    const opis = args.opis?.trim();
    const images = normalizeImages(product.images, args.images);
    const variants = normalizeVariants(args.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const removedImages = (product.images ?? []).filter(
      (existing) => !images.find((image) => image.storageId === existing.storageId),
    );
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
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return;
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
  },
});
