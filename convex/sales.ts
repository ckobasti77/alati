import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

type OrderItem = {
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
};

const normalizeQuantity = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(Math.round(parsed), 1);
};

const sanitizePrice = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const resolveItems = (order: any): OrderItem[] => {
  const stored = order.items ?? [];
  const normalized = stored
    .map((item: any) => ({
      kolicina: normalizeQuantity(item.kolicina),
      nabavnaCena: sanitizePrice(item.nabavnaCena),
      prodajnaCena: sanitizePrice(item.prodajnaCena),
    }))
    .filter((item: OrderItem) => item.kolicina > 0);
  if (normalized.length > 0) return normalized;
  return [
    {
      kolicina: normalizeQuantity(order.kolicina),
      nabavnaCena: sanitizePrice(order.nabavnaCena),
      prodajnaCena: sanitizePrice(order.prodajnaCena),
    },
  ];
};

export const summary = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx, args.token);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_kreiranoAt", (q) => q.eq("userId", user._id))
      .collect();

    return orders.reduce(
      (acc, order) => {
        const items = resolveItems(order);
        const prodajno = items.reduce((sum, item) => sum + item.prodajnaCena * item.kolicina, 0);
        const nabavno = items.reduce((sum, item) => sum + item.nabavnaCena * item.kolicina, 0);
        const transport = order.transportCost ?? 0;
        const profit = prodajno - nabavno - transport;
        const canCountMyShare = order.stage === "legle_pare";
        const myShare = canCountMyShare ? profit * ((order.myProfitPercent ?? 0) / 100) : 0;

        acc.brojNarudzbina += 1;
        acc.ukupnoProdajno += prodajno;
        acc.ukupnoNabavno += nabavno;
        acc.profit += profit;
        acc.mojProfit += myShare;
        return acc;
      },
      {
        brojNarudzbina: 0,
        ukupnoProdajno: 0,
        ukupnoNabavno: 0,
        profit: 0,
        mojProfit: 0,
      },
    );
  },
});
