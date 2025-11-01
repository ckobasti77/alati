import { ConvexReactClient } from "convex/react";

const defaultConvexUrl = "https://watchful-bear-609.convex.cloud";
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? defaultConvexUrl;

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.info(
    `NEXT_PUBLIC_CONVEX_URL nije pronađen; koristi se podrazumevani deployment ${defaultConvexUrl}.`,
  );
}

export const convex = new ConvexReactClient(convexUrl);
