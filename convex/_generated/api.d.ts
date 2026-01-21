/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as client from "../client.js";
import type * as customers from "../customers.js";
import type * as images from "../images.js";
import type * as inboxImages from "../inboxImages.js";
import type * as maintenance from "../maintenance.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as sales from "../sales.js";
import type * as search from "../search.js";
import type * as social from "../social.js";
import type * as socialScheduler from "../socialScheduler.js";
import type * as socialTokens from "../socialTokens.js";
import type * as suppliers from "../suppliers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  client: typeof client;
  customers: typeof customers;
  images: typeof images;
  inboxImages: typeof inboxImages;
  maintenance: typeof maintenance;
  orders: typeof orders;
  products: typeof products;
  sales: typeof sales;
  search: typeof search;
  social: typeof social;
  socialScheduler: typeof socialScheduler;
  socialTokens: typeof socialTokens;
  suppliers: typeof suppliers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
