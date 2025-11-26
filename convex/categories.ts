import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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
    await requireUser(ctx, args.token);
    const categories = await ctx.db.query("categories").collect();
    const withUrls = await Promise.all(categories.map((category) => decorateWithUrl(ctx, category)));
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
