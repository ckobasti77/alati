import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    name: v.string(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  sales: defineTable({
    productId: v.optional(v.id("products")),
    title: v.string(),
    kolicina: v.number(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    kreiranoAt: v.number(),
  }).index("by_kreiranoAt", ["kreiranoAt"]),
});
