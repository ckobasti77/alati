import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

const defaultCategories = [
  { name: "Kuća i radionica", slug: "kuca-i-radionica" },
  { name: "Dvorište i vrt", slug: "dvoriste-i-vrt" },
  { name: "Elektrika / baterija", slug: "elektrika-baterija" },
  { name: "Poljoprivreda", slug: "poljoprivreda" },
];

const slugify = (value: string) => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "kategorija";
};

const decorateWithUrl = async (ctx: any, category: any) => {
  const base = { ...category, id: category._id };
  if (!category.iconStorageId) return { ...base, iconUrl: null };
  return { ...base, iconUrl: await ctx.storage.getUrl(category.iconStorageId) };
};

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const [categories, products] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db
        .query("products")
        .withIndex("by_user_createdAt", (q: any) => q.eq("userId", user._id))
        .collect(),
    ]);
    const productCountByCategory = new Map<string, number>();
    products.forEach((product) => {
      (product.categoryIds ?? []).forEach((categoryId: Id<"categories">) => {
        const key = String(categoryId);
        productCountByCategory.set(key, (productCountByCategory.get(key) ?? 0) + 1);
      });
    });
    const withUrls = await Promise.all(
      categories.map(async (category) => ({
        ...(await decorateWithUrl(ctx, category)),
        productCount: productCountByCategory.get(String(category._id)) ?? 0,
      })),
    );
    return withUrls.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const withUrls = await Promise.all(categories.map((category) => decorateWithUrl(ctx, category)));
    return withUrls.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    icon: v.optional(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.optional(v.string()),
        contentType: v.optional(v.string()),
        uploadedAt: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const name = args.name.trim();
    if (!name) {
      throw new Error("Naziv kategorije je obavezan.");
    }
    const slug = slugify(name);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      throw new Error("Kategorija sa ovim nazivom vec postoji.");
    }
    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
      userId: user._id,
      name,
      slug,
      iconStorageId: args.icon?.storageId,
      iconFileName: args.icon?.fileName,
      iconContentType: args.icon?.contentType,
      createdAt: now,
      updatedAt: now,
    });
    return categoryId;
  },
});

export const ensureDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const existing = await ctx.db.query("categories").collect();
    const existingSlugs = new Set(existing.map((category) => category.slug));
    const now = Date.now();
    let created = 0;

    await Promise.all(
      defaultCategories.map(async (category, index) => {
        if (existingSlugs.has(category.slug)) return;
        await ctx.db.insert("categories", {
          userId: user._id,
          name: category.name,
          slug: category.slug,
          createdAt: now + index,
          updatedAt: now + index,
        });
        created += 1;
      }),
    );

    return { created };
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("categories"),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Kategorija nije pronadjena.");
    }
    if (category.userId && category.userId !== user._id) {
      throw new Error("Nemas dozvolu za ovu kategoriju.");
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_user_createdAt", (q: any) => q.eq("userId", user._id))
      .collect();
    const relatedProducts = products.filter((product) => (product.categoryIds ?? []).some((id) => id === args.id));
    const productCount = relatedProducts.length;

    if (productCount > 0 && !args.force) {
      return { removed: false, productCount };
    }

    await Promise.all(
      relatedProducts.map(async (product) => {
        const nextCategoryIds = (product.categoryIds ?? []).filter((id) => id !== args.id);
        await ctx.db.patch(product._id, { categoryIds: nextCategoryIds.length ? nextCategoryIds : undefined });
      }),
    );

    await ctx.db.delete(args.id);
    if (category.iconStorageId) {
      try {
        await ctx.storage.delete(category.iconStorageId);
      } catch (error) {
        console.error("Failed to delete category icon", category.iconStorageId, error);
      }
    }

    return { removed: true, productCount };
  },
});
