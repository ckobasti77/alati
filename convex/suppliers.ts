import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./auth";

const defaultSuppliers = ["Petrit", "Menad"];

const normalizeName = (value: string) => value.trim();

const collectSupplierIdsFromOrder = (order: any): Id<"suppliers">[] => {
  const fromItems = (order.items ?? [])
    .map((item: any) => item.supplierId as Id<"suppliers"> | undefined)
    .filter((id: Id<"suppliers"> | undefined): id is Id<"suppliers"> => Boolean(id));
  if (fromItems.length > 0) return fromItems;
  return order.supplierId ? [order.supplierId as Id<"suppliers">] : [];
};

export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();
    const products = await ctx.db
      .query("products")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();

    const productUsageMap = new Map<string, Set<string>>();
    products.forEach((product) => {
      (product.supplierOffers ?? []).forEach((offer) => {
        const key = String(offer.supplierId);
        const current = productUsageMap.get(key) ?? new Set<string>();
        current.add(String(product._id));
        productUsageMap.set(key, current);
      });
    });

    const orderUsageMap = new Map<string, number>();
    orders.forEach((order) => {
      const supplierIds = collectSupplierIdsFromOrder(order);
      supplierIds.forEach((id: string) => {
        const key = String(id);
        orderUsageMap.set(key, (orderUsageMap.get(key) ?? 0) + 1);
      });
    });

    return suppliers
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((supplier) => {
        const key = String(supplier._id);
        const productUsage = productUsageMap.get(key)?.size ?? 0;
        const orderUsage = orderUsageMap.get(key) ?? 0;
        return {
          ...supplier,
          usage: {
            products: productUsage,
            orders: orderUsage,
          },
        };
      });
  },
});

export const create = mutation({
  args: { token: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const name = normalizeName(args.name);
    if (!name) {
      throw new Error("Naziv dobavljaca je obavezan.");
    }

    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_user_name", (q) => q.eq("userId", user._id).eq("name", name))
      .unique();
    if (existing) {
      throw new Error("Dobavljac sa ovim nazivom vec postoji.");
    }

    const now = Date.now();
    const id = await ctx.db.insert("suppliers", {
      userId: user._id,
      name,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("suppliers") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const supplier = await ctx.db.get(args.id);
    if (!supplier || supplier.userId !== user._id) {
      return;
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();

    const productsUsing = products.filter((product) =>
      (product.supplierOffers ?? []).some((offer) => String(offer.supplierId) === String(args.id)),
    );
    const ordersUsing = orders.filter((order) =>
      collectSupplierIdsFromOrder(order).some((id) => String(id) === String(args.id)),
    );

    if (productsUsing.length > 0 || ordersUsing.length > 0) {
      throw new Error(
        "Ovaj dobavljac je vezan za proizvode ili narudzbine. Ukloni veze pre brisanja.",
      );
    }

    await ctx.db.delete(args.id);
  },
});

export const ensureDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", user._id))
      .collect();
    const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));
    const now = Date.now();
    let created = 0;

    await Promise.all(
      defaultSuppliers.map(async (name, index) => {
        if (existingNames.has(name.toLowerCase())) return;
        await ctx.db.insert("suppliers", {
          userId: user._id,
          name,
          createdAt: now + index,
          updatedAt: now + index,
        });
        created += 1;
      }),
    );

    return { created };
  },
});
