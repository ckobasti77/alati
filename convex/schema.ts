import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  products: defineTable({
    name: v.string(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    variants: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          nabavnaCena: v.number(),
          prodajnaCena: v.number(),
          isDefault: v.boolean(),
        }),
      ),
    ),
    images: v.optional(
      v.array(
        v.object({
          storageId: v.id("_storage"),
          isMain: v.boolean(),
          fileName: v.optional(v.string()),
          contentType: v.optional(v.string()),
          uploadedAt: v.number(),
        }),
      ),
    ),
    opis: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  sales: defineTable({
    productId: v.optional(v.id("products")),
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.number(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    kreiranoAt: v.number(),
  }).index("by_kreiranoAt", ["kreiranoAt"]),
});
