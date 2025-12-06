import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const resolveStatus = (item: { status?: string; hasPurchasePrice?: boolean }) => {
      if (item.status === "skip" || item.status === "withPurchasePrice" || item.status === "withoutPurchasePrice") {
        return item.status;
      }
      return item.hasPurchasePrice === true ? "withoutPurchasePrice" : "withPurchasePrice";
    };
    const items = await ctx.db
      .query("inboxImages")
      .withIndex("by_user_uploadedAt", (q) => q.eq("userId", user._id))
      .collect();
    const sorted = items.sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0));
    return await Promise.all(
      sorted.map(async (item) => ({
        ...item,
        status: resolveStatus(item),
        url: await ctx.storage.getUrl(item.storageId),
      })),
    );
  },
});

export const add = mutation({
  args: {
    token: v.string(),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    uploadedAt: v.optional(v.number()),
    hasPurchasePrice: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("withPurchasePrice"), v.literal("withoutPurchasePrice"), v.literal("skip"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const now = args.uploadedAt ?? Date.now();
    const status =
      args.status ??
      (args.hasPurchasePrice === true ? "withoutPurchasePrice" : ("withPurchasePrice" as const));
    await ctx.db.insert("inboxImages", {
      userId: user._id,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      hasPurchasePrice: status === "withoutPurchasePrice",
      status,
      uploadedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("inboxImages"),
    status: v.union(v.literal("withPurchasePrice"), v.literal("withoutPurchasePrice"), v.literal("skip")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== user._id) {
      return;
    }
    const hasPurchasePrice = args.status === "withoutPurchasePrice";
    await ctx.db.patch(args.id, {
      status: args.status,
      hasPurchasePrice,
    });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("inboxImages") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== user._id) {
      return;
    }
    await ctx.db.delete(args.id);
    try {
      await ctx.storage.delete(existing.storageId);
    } catch (error) {
      console.error("Failed to delete inbox image", existing.storageId, error);
    }
  },
});
