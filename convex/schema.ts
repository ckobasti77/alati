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
  secrets: defineTable({
    key: v.string(),
    value: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    meta: v.optional(
      v.object({
        provider: v.optional(v.string()),
        type: v.optional(v.string()),
        pageId: v.optional(v.string()),
        instagramBusinessId: v.optional(v.string()),
      }),
    ),
  }).index("by_key", ["key"]),
  categories: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    slug: v.string(),
    iconStorageId: v.optional(v.id("_storage")),
    iconFileName: v.optional(v.string()),
    iconContentType: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_slug", ["slug"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
  products: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    kpName: v.optional(v.string()),
    nabavnaCena: v.number(),
    nabavnaCenaIsReal: v.optional(v.boolean()),
    prodajnaCena: v.number(),
    supplierOffers: v.optional(
      v.array(
        v.object({
          supplierId: v.id("suppliers"),
          price: v.number(),
          variantId: v.optional(v.string()),
        }),
      ),
    ),
    categoryIds: v.optional(v.array(v.id("categories"))),
    variants: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          nabavnaCena: v.number(),
          nabavnaCenaIsReal: v.optional(v.boolean()),
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
                publishFb: v.optional(v.boolean()),
                publishIg: v.optional(v.boolean()),
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
          publishFb: v.optional(v.boolean()),
          publishIg: v.optional(v.boolean()),
          uploadedAt: v.number(),
        }),
      ),
    ),
    adImage: v.optional(
      v.object({
        storageId: v.id("_storage"),
        fileName: v.optional(v.string()),
        contentType: v.optional(v.string()),
        uploadedAt: v.optional(v.number()),
      }),
    ),
    opis: v.optional(v.string()),
    opisKp: v.optional(v.string()),
    opisFbInsta: v.optional(v.string()),
    publishKp: v.optional(v.boolean()),
    publishFb: v.optional(v.boolean()),
    publishIg: v.optional(v.boolean()),
    publishFbProfile: v.optional(v.boolean()),
    publishMarketplace: v.optional(v.boolean()),
    pickupAvailable: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
  orders: defineTable({
    userId: v.optional(v.id("users")),
    scope: v.optional(v.union(v.literal("default"), v.literal("kalaba"))),
    stage: v.union(
      v.literal("poruceno"),
      v.literal("na_stanju"),
      v.literal("poslato"),
      v.literal("stiglo"),
      v.literal("legle_pare"),
    ),
    productId: v.optional(v.id("products")),
    supplierId: v.optional(v.id("suppliers")),
    variantId: v.optional(v.string()),
    variantLabel: v.optional(v.string()),
    title: v.string(),
    kolicina: v.number(),
    nabavnaCena: v.number(),
    prodajnaCena: v.number(),
    napomena: v.optional(v.string()),
    brojPosiljke: v.optional(v.string()),
    povratVracen: v.optional(v.boolean()),
    transportCost: v.optional(v.number()),
    transportMode: v.optional(
      v.union(
        v.literal("Kol"),
        v.literal("Joe"),
        v.literal("Smg"),
        v.literal("Posta"),
        v.literal("Bex"),
        v.literal("Aks"),
      ),
    ),
    slanjeMode: v.optional(v.union(v.literal("Posta"), v.literal("Aks"), v.literal("Bex"))),
    slanjeOwner: v.optional(v.string()),
    myProfitPercent: v.optional(v.number()),
    customerName: v.string(),
    address: v.string(),
    phone: v.string(),
    pickup: v.optional(v.boolean()),
    items: v.optional(
      v.array(
        v.object({
          id: v.string(),
          productId: v.optional(v.id("products")),
          supplierId: v.optional(v.id("suppliers")),
          variantId: v.optional(v.string()),
          variantLabel: v.optional(v.string()),
          title: v.string(),
          kolicina: v.number(),
          nabavnaCena: v.number(),
          prodajnaCena: v.number(),
          manualProdajna: v.optional(v.boolean()),
        }),
      ),
    ),
    sortIndex: v.optional(v.number()),
    kreiranoAt: v.number(),
  })
    .index("by_kreiranoAt", ["kreiranoAt"])
    .index("by_user_kreiranoAt", ["userId", "kreiranoAt"]),
  customers: defineTable({
    userId: v.optional(v.id("users")),
    scope: v.union(v.literal("default"), v.literal("kalaba")),
    name: v.string(),
    nameNormalized: v.string(),
    phone: v.string(),
    phoneNormalized: v.string(),
    address: v.string(),
    pickup: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastUsedAt: v.number(),
  })
    .index("by_user_scope_lastUsedAt", ["userId", "scope", "lastUsedAt"])
    .index("by_user_scope_phone", ["userId", "scope", "phoneNormalized"]),
  shippingAccounts: defineTable({
    userId: v.optional(v.id("users")),
    scope: v.union(v.literal("default"), v.literal("kalaba")),
    value: v.string(),
    valueNormalized: v.string(),
    startingAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_scope_updatedAt", ["userId", "scope", "updatedAt"])
    .index("by_user_scope_value", ["userId", "scope", "valueNormalized"]),
  restockRequests: defineTable({
    userId: v.optional(v.id("users")),
    scope: v.union(v.literal("default"), v.literal("kalaba")),
    name: v.string(),
    nameNormalized: v.string(),
    phone: v.string(),
    phoneNormalized: v.string(),
    productId: v.optional(v.id("products")),
    productTitle: v.string(),
    variantLabel: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_scope_createdAt", ["userId", "scope", "createdAt"])
    .index("by_user_scope_phone", ["userId", "scope", "phoneNormalized"]),
  suppliers: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_name", ["userId", "name"])
    .index("by_user_createdAt", ["userId", "createdAt"]),
  inboxImages: defineTable({
    userId: v.optional(v.id("users")),
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    hasPurchasePrice: v.optional(v.boolean()),
    status: v.optional(
      v.union(v.literal("withPurchasePrice"), v.literal("withoutPurchasePrice"), v.literal("skip")),
    ),
    uploadedAt: v.number(),
  }).index("by_user_uploadedAt", ["userId", "uploadedAt"]),
  scheduledPosts: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("processing"),
      v.literal("published"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    scheduledJobId: v.optional(v.id("_scheduled_functions")),
    publishedAt: v.optional(v.number()),
    attempts: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    error: v.optional(v.string()),
    postId: v.optional(v.string()),
  })
    .index("by_user_scheduledAt", ["userId", "scheduledAt"])
    .index("by_status_scheduledAt", ["status", "scheduledAt"]),
});
