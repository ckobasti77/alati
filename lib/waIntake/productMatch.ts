// waIntake/productMatch.ts
// Fuzzy povezivanje slobodnog teksta proizvoda iz poruke sa katalogom
// (products.name / products.kpName), preko zajednickog lib/textMatch.
// Ispod praga -> null (tekst ostaje slobodan naziv narudzbine).

import { tokenSetSimilarity } from "../textMatch";
import type { CatalogProduct } from "./types";

export const PRODUCT_MATCH_THRESHOLD = 0.8;

export type ProductMatch = { product: CatalogProduct; score: number };

const round = (value: number) => Math.round(value * 1000) / 1000;

export function scoreProduct(productText: string, product: CatalogProduct): number {
  const byName = tokenSetSimilarity(productText, product.name);
  const byKpName = product.kpName ? tokenSetSimilarity(productText, product.kpName) : 0;
  return Math.max(byName, byKpName);
}

export function matchProduct(
  productText: string | undefined,
  catalog: CatalogProduct[],
): ProductMatch | null {
  const text = productText?.trim();
  if (!text) return null;

  let best: ProductMatch | null = null;
  for (const product of catalog) {
    const score = scoreProduct(text, product);
    if (!best || score > best.score) {
      best = { product, score };
    }
  }
  if (!best || best.score < PRODUCT_MATCH_THRESHOLD) return null;
  return { product: best.product, score: round(best.score) };
}
