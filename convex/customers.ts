import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "./search";

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
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    const searchTokens = toSearchTokens(args.search?.trim() ?? "");
    const phoneNeedle = normalizePhone(args.search ?? "");

    let customers = await ctx.db
      .query("customers")
      .withIndex("by_user_scope_lastUsedAt", (q) => q.eq("userId", user._id).eq("scope", scope))
      .collect();

    if (searchTokens.length > 0 || phoneNeedle) {
      customers = customers.filter((customer) => {
        const nameValue = customer.nameNormalized || normalizeSearchText(customer.name ?? "");
        const addressValue = normalizeSearchText(customer.address ?? "");
        const textValue = `${nameValue} ${addressValue}`;
        const phoneValue = customer.phoneNormalized || normalizePhone(customer.phone ?? "");
        const nameMatch = searchTokens.length > 0 ? matchesAllTokensInNormalizedText(textValue, searchTokens) : false;
        const phoneMatch = phoneNeedle ? phoneValue.includes(phoneNeedle) : false;
        return nameMatch || phoneMatch;
      });
    }

    return customers
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt || b.updatedAt - a.updatedAt)
      .slice(0, limit);
  },
});

export const syncFromOrders = mutation({
  args: {
    token: v.string(),
    scope: v.optional(orderScopeSchema),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const scope = normalizeScope(args.scope);

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_user_scope_phone", (q) => q.eq("userId", user._id).eq("scope", scope))
      .collect();
    const existingPhones = new Set(existing.map((customer) => customer.phoneNormalized));

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    const scopedOrders = orders.filter((order) => normalizeScope(order.scope) === scope);

    const candidates = new Map<string, typeof scopedOrders[number]>();
    scopedOrders.forEach((order) => {
      const phoneNormalized = normalizePhone(order.phone ?? "");
      if (!phoneNormalized || existingPhones.has(phoneNormalized)) return;
      const current = candidates.get(phoneNormalized);
      if (!current || order.kreiranoAt > current.kreiranoAt) {
        candidates.set(phoneNormalized, order);
      }
    });

    const now = Date.now();
    for (const [phoneNormalized, order] of candidates) {
      const name = order.customerName?.trim() ?? "";
      const phone = order.phone?.trim() ?? "";
      const address = order.address?.trim() ?? "";
      if (!name || !phone || !address) continue;
      await ctx.db.insert("customers", {
        userId: user._id,
        scope,
        name,
        nameNormalized: normalizeSearchText(name),
        phone,
        phoneNormalized,
        address,
        pickup: order.pickup ?? false,
        createdAt: now,
        updatedAt: now,
        lastUsedAt: order.kreiranoAt ?? now,
      });
    }
  },
});
