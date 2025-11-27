import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./auth";

const FACEBOOK_USER_KEY = "facebook:user_access_token";
const FACEBOOK_PAGE_KEY = "facebook:page_access_token";

type SecretDoc = Doc<"secrets">;

async function findSecret(ctx: QueryCtx | MutationCtx, key: string): Promise<SecretDoc | null> {
  return await ctx.db
    .query("secrets")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
}

async function upsertSecret(
  ctx: MutationCtx,
  key: string,
  value: string,
  expiresAt?: number,
  meta?: SecretDoc["meta"],
) {
  const now = Date.now();
  const existing = await findSecret(ctx, key);
  if (existing) {
    await ctx.db.patch(existing._id, {
      value,
      expiresAt,
      updatedAt: now,
      meta: meta ?? existing.meta,
    });
  } else {
    await ctx.db.insert("secrets", {
      key,
      value,
      expiresAt,
      meta,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export const getFacebookTokens = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const [userSecret, pageSecret] = await Promise.all([
      findSecret(ctx, FACEBOOK_USER_KEY),
      findSecret(ctx, FACEBOOK_PAGE_KEY),
    ]);

    return {
      userAccessToken: userSecret?.value ?? null,
      userTokenExpiresAt: userSecret?.expiresAt ?? null,
      pageAccessToken: pageSecret?.value ?? null,
      pageTokenExpiresAt: pageSecret?.expiresAt ?? null,
      instagramBusinessId:
        pageSecret?.meta?.instagramBusinessId ?? userSecret?.meta?.instagramBusinessId ?? null,
      pageId: pageSecret?.meta?.pageId ?? userSecret?.meta?.pageId ?? null,
      updatedAt: Math.max(userSecret?.updatedAt ?? 0, pageSecret?.updatedAt ?? 0) || null,
    };
  },
});

export const saveFacebookTokens = mutation({
  args: {
    token: v.string(),
    userAccessToken: v.string(),
    userTokenExpiresAt: v.optional(v.number()),
    pageAccessToken: v.optional(v.string()),
    pageTokenExpiresAt: v.optional(v.number()),
    pageId: v.optional(v.string()),
    instagramBusinessId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    await upsertSecret(
      ctx,
      FACEBOOK_USER_KEY,
      args.userAccessToken,
      args.userTokenExpiresAt ?? undefined,
      {
        provider: "facebook",
        type: "user",
        pageId: args.pageId,
        instagramBusinessId: args.instagramBusinessId,
      },
    );

    if (args.pageAccessToken) {
      await upsertSecret(
        ctx,
        FACEBOOK_PAGE_KEY,
        args.pageAccessToken,
        args.pageTokenExpiresAt ?? undefined,
        {
          provider: "facebook",
          type: "page",
          pageId: args.pageId,
          instagramBusinessId: args.instagramBusinessId,
        },
      );
    }

    return { ok: true };
  },
});
