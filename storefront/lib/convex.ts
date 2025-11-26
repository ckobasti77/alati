import { ConvexReactClient } from "convex/react";

const fallbackUrl = "https://watchful-bear-609.convex.cloud";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? fallbackUrl;

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.info(`NEXT_PUBLIC_CONVEX_URL nije zadat za storefront, koristi se podrazumevani ${fallbackUrl}.`);
}

export const convex = new ConvexReactClient(convexUrl);
