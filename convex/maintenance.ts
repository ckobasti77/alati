import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const backfillUserIds = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user: admin } = await requireAdmin(ctx, args.token);
    let productsUpdated = 0;
    let ordersUpdated = 0;

    const products = await ctx.db.query("products").collect();
    await Promise.all(
      products.map(async (product) => {
        if (!product.userId) {
          await ctx.db.patch(product._id, { userId: admin._id });
          productsUpdated += 1;
        }
      }),
    );

    const orders = await ctx.db.query("orders").collect();
    await Promise.all(
      orders.map(async (order) => {
        if (!order.userId) {
          await ctx.db.patch(order._id, { userId: admin._id });
          ordersUpdated += 1;
        }
      }),
    );

    return { productsUpdated, ordersUpdated };
  },
});
