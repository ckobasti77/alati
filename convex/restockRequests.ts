import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import { normalizeSearchText } from "./search";

const orderScopes = ["default", "kalaba"] as const;
const orderScopeSchema = v.union(v.literal(orderScopes[0]), v.literal(orderScopes[1]));

const normalizeScope = (scope?: (typeof orderScopes)[number]) => {
  if (!scope) return orderScopes[0];
  return scope === orderScopes[1] ? orderScopes[1] : orderScopes[0];
};

const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");

export const list = query({
  args: {
    token: v.string(),
    scope: v.optional(orderScopeSchema),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const requests = await ctx.db
      .query("restockRequests")
      .withIndex("by_user_scope_createdAt", (q) => q.eq("userId", user._id).eq("scope", scope))
      .collect();
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    scope: v.optional(orderScopeSchema),
    name: v.string(),
    phone: v.string(),
    productId: v.optional(v.id("products")),
    productTitle: v.string(),
    variantLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const name = args.name.trim();
    const phone = args.phone.trim();
    const productTitle = args.productTitle.trim();
    if (!name || !phone || !productTitle) {
      throw new Error("Ime, telefon i proizvod su obavezni.");
    }
    const phoneNormalized = normalizePhone(phone);
    if (!phoneNormalized) {
      throw new Error("Telefon nije ispravan.");
    }
    const now = Date.now();

    await ctx.db.insert("restockRequests", {
      userId: user._id,
      scope,
      name,
      nameNormalized: normalizeSearchText(name),
      phone,
      phoneNormalized,
      productId: args.productId,
      productTitle,
      variantLabel: args.variantLabel?.trim() || undefined,
      createdAt: now,
    });
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    id: v.id("restockRequests"),
    scope: v.optional(orderScopeSchema),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const request = await ctx.db.get(args.id);
    if (!request) return;
    if (request.userId !== user._id) {
      throw new Error("Neautorizovan pristup zahtevu.");
    }
    if (normalizeScope(request.scope) !== scope) {
      throw new Error("Neautorizovan pristup zahtevu.");
    }
    await ctx.db.delete(args.id);
  },
});
