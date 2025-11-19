import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

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
        const prodajno = order.prodajnaCena * order.kolicina;
        const nabavno = order.nabavnaCena * order.kolicina;
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

