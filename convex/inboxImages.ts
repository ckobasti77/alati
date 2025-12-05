import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const items = await ctx.db
      .query("inboxImages")
      .withIndex("by_user_uploadedAt", (q) => q.eq("userId", user._id))
      .collect();
    const sorted = items.sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0));
    return await Promise.all(
      sorted.map(async (item) => ({
        ...item,
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
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const now = args.uploadedAt ?? Date.now();
    await ctx.db.insert("inboxImages", {
      userId: user._id,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      hasPurchasePrice: args.hasPurchasePrice ?? false,
      uploadedAt: now,
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
