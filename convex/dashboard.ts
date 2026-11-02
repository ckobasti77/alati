import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import { calculateOrderRefund } from "../lib/refund-policy";
import {
  aggregatePeriod,
  belgradeTodayKey,
  countActions,
  isDateKey,
  paidBounds,
  resolvePeriodRange,
  sumPaidRows,
  summarizePipeline,
  toDashboardRow,
} from "../lib/dashboard";

// Kontrolna tabla. Samo cita; formule su iste kao orders:summary (lib/calc.ts preko lib/dashboard.ts).
// Scope je "default", kao summary/latest koje je stara tabla koristila.

const periodSchema = v.union(
  v.literal("danas"),
  v.literal("7d"),
  v.literal("mesec"),
  v.literal("prosli"),
  v.literal("sve"),
);

const LATEST_LIMIT = 10;

export const overview = query({
  args: {
    token: v.string(),
    period: periodSchema,
    /** Danasnji dan u Beogradu ("YYYY-MM-DD") sa klijenta: rezultat je isti tokom dana i kesira se. */
    today: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const todayKey = isDateKey(args.today) ? args.today : belgradeTodayKey();

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();
    const scoped = orders.filter((order) => (order.scope ?? "default") !== "kalaba");
    const rows = scoped.map((order) => toDashboardRow(order));

    const range = resolvePeriodRange(args.period, todayKey, paidBounds(rows));
    const { totals, previous, series } = aggregatePeriod(rows, range);

    // 100% povrat: ista racunica kao orders:refundPeriod.
    const storedPeriod = await ctx.db
      .query("orderRefundPeriods")
      .withIndex("by_user_scope", (q) => q.eq("userId", user._id).eq("scope", "default"))
      .first();
    const refundPeriod = storedPeriod
      ? { startDate: storedPeriod.startDate, endDate: storedPeriod.endDate }
      : null;
    let refundPendingCount = 0;
    let refundPendingAmount = 0;
    scoped.forEach((order, index) => {
      const row = rows[index];
      const refund = calculateOrderRefund({
        orderCreatedAt: order.kreiranoAt,
        totalNabavno: row.nabavno,
        profit: row.profit,
        transport: row.transport,
        myProfitPercent: order.myProfitPercent,
        refundPeriod,
        povratVracen: order.povratVracen,
        manualRefund100: order.manualRefund100,
      });
      if (!refund.isFullRefund100 || refund.isExcludedBecauseReturned) return;
      refundPendingCount += 1;
      refundPendingAmount += refund.outstandingRefundAmount;
    });

    const restockRequests = await ctx.db
      .query("restockRequests")
      .withIndex("by_user_scope_createdAt", (q) => q.eq("userId", user._id).eq("scope", "default"))
      .collect();

    const latest = scoped
      .map((order, index) => ({ order, row: rows[index] }))
      .sort((a, b) => b.order.kreiranoAt - a.order.kreiranoAt)
      .slice(0, LATEST_LIMIT)
      .map(({ order, row }) => ({
        _id: order._id,
        title: order.title,
        customerName: order.customerName,
        stage: order.stage,
        kreiranoAt: order.kreiranoAt,
        prodajno: row.prodajno,
        profit: row.profit,
      }));

    return {
      todayKey,
      period: {
        key: range.period,
        startKey: range.range.startKey,
        endKey: range.range.endKey,
        previous: range.previous,
        bucket: range.bucket,
        currentKey: range.currentKey,
      },
      totals,
      previous,
      series,
      allTime: sumPaidRows(rows),
      pipeline: summarizePipeline(rows),
      actions: {
        ...countActions(rows),
        refund: {
          period: refundPeriod,
          pendingCount: refundPendingCount,
          pendingAmount: refundPendingAmount,
        },
        restock: restockRequests.length,
      },
      latest,
    };
  },
});
