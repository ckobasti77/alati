import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const latest = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("sales").collect();
    return items
      .sort((a, b) => b.kreiranoAt - a.kreiranoAt)
      .slice(0, 10);
  },
});

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db.query("sales").collect();
    return sales.reduce(
      (acc, sale) => {
        const prodajno = sale.prodajnaCena * sale.kolicina;
        const nabavno = sale.nabavnaCena * sale.kolicina;
        acc.brojProdaja += 1;
        acc.ukupnoProdajno += prodajno;
        acc.ukupnoNabavno += nabavno;
        acc.profit += prodajno - nabavno;
        return acc;
      },
      {
        brojProdaja: 0,
        ukupnoProdajno: 0,
        ukupnoNabavno: 0,
        profit: 0,
      },
    );
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = Math.max(args.page ?? 1, 1);
    const pageSize = Math.max(Math.min(args.pageSize ?? 20, 100), 1);

    let items = await ctx.db.query("sales").collect();
    items = items.sort((a, b) => b.kreiranoAt - a.kreiranoAt);

    if (args.search) {
      const needle = args.search.toLowerCase();
      items = items.filter((sale) => sale.title.toLowerCase().includes(needle));
    }

    const total = items.length;
    const offset = (page - 1) * pageSize;
    const pageItems = items.slice(offset, offset + pageSize);

    return {
      items: pageItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    };
  },
});

export const create = mutation({
  args: {
    productId: v.optional(v.id("products")),
    title: v.string(),
    kolicina: v.optional(v.number()),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    buyerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    let title = args.title.trim();
    const kolicina = Math.max(args.kolicina ?? 1, 1);
    let productId = args.productId;
    const buyerName = args.buyerName?.trim();

    if (productId) {
      const product = await ctx.db.get(productId);
      if (product) {
        if (!title) title = product.name;
      } else {
        productId = undefined;
      }
    }

    if (!title) {
      throw new Error("Naziv prodaje je obavezan.");
    }

    await ctx.db.insert("sales", {
      productId,
      title,
      kolicina,
      nabavnaCena: args.nabavnaCena,
      prodajnaCena: args.prodajnaCena,
      napomena: args.napomena?.trim() || undefined,
      buyerName: buyerName || undefined,
      kreiranoAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
