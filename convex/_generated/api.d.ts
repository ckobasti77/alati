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
import type * as images from "../images.js";
import type * as maintenance from "../maintenance.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as sales from "../sales.js";
import type * as social from "../social.js";
import type * as socialTokens from "../socialTokens.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  client: typeof client;
  images: typeof images;
  maintenance: typeof maintenance;
  orders: typeof orders;
  products: typeof products;
  sales: typeof sales;
  social: typeof social;
  socialTokens: typeof socialTokens;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
