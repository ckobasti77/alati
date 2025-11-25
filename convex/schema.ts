import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
    createdBy: v.optional(v.id("users")),
  }).index("by_username", ["username"]),
  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  }).index("by_token", ["token"]),
  products: defineTable({
    userId: v.optional(v.id("users")),
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
          opis: v.optional(v.string()),
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
    opisKp: v.optional(v.string()),
    opisFbInsta: v.optional(v.string()),
    publishKp: v.optional(v.boolean()),
    publishFb: v.optional(v.boolean()),
    publishIg: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
  orders: defineTable({
    userId: v.optional(v.id("users")),
    stage: v.union(v.literal("poruceno"), v.literal("poslato"), v.literal("stiglo"), v.literal("legle_pare")),
    productId: v.optional(v.id("products")),
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.number(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(
      v.union(v.literal("Kol"), v.literal("Joe"), v.literal("Posta"), v.literal("Bex"), v.literal("Aks")),
    ),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    myProfitPercent: v.optional(v.number()),
    kreiranoAt: v.number(),
  })
    .index("by_kreiranoAt", ["kreiranoAt"])
    .index("by_user_kreiranoAt", ["userId", "kreiranoAt"]),
});
