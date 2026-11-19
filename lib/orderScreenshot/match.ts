// orderScreenshot/match.ts
// Povezivanje ekstrakta sa katalogom (pravila 6 i 7):
// 1) fuzzy po name/kpName (postojeće lib/textMatch — tokenSetSimilarity),
// 2) izbor tipa (varijante) po variantText ("4 x 2.5" === "4x2,5"),
// 3) prodajna cena sa slike kao presuda između sličnih kandidata.
// Bez side efekata — testiran vitest-om sa izmišljenim katalogom.

import { foldName, tokenSetSimilarity } from "../textMatch";
import type { CatalogProduct, CatalogVariant, DraftProductHit } from "./types";

export const TEXT_THRESHOLD = 0.6; // ispod ovoga: proizvod ostaje slobodan tekst
const PRICE_WINDOW = 0.08; // prozor "sličnih" kandidata koje cena razdvaja
const VARIANT_MATCH = 0.75; // prag "tip odgovara"
const VARIANT_BONUS = 0.1; // bonus na score za pogodak tipa
const PRICE_BONUS = 0.05; // bonus kad prodajna cena tačno potvrđuje kandidata

// "4 x 2.5" → "4x25" (foldName već skida razmake/dijakritike; zarez i tačka nestaju).
// "4x2,5" i "4x2.5" daju ISTU vrednost — to je suština poredjenja.
export function normalizeVariantText(value?: string): string {
  if (!value) return "";
  return foldName(value).replace(/\s+/g, "").replace(/\./g, ",");
}

export function scoreVariant(variantText: string, variant: CatalogVariant): number {
  const target = normalizeVariantText(variantText);
  if (!target) return 0;
  const label = normalizeVariantText(variant.label);
  if (!label) return 0;
  if (label === target) return 1;
  if (label.includes(target) || target.includes(label)) return 0.9;
  return tokenSetSimilarity(variantText, variant.label);
}

export function scoreProductText(productText: string, adTitle: string, product: CatalogProduct): number {
  const text = [productText, adTitle].filter(Boolean).join(" ").trim();
  if (!text) return 0;
  const byName = tokenSetSimilarity(text, product.name);
  const byKpName = product.kpName ? tokenSetSimilarity(text, product.kpName) : 0;
  return Math.max(byName, byKpName);
}

type Scored = { product: CatalogProduct; variant?: CatalogVariant; score: number; priceOk: boolean };

const toHit = (entry: Scored): DraftProductHit => ({
  productId: entry.product.id,
  name: entry.product.name,
  kpName: entry.product.kpName,
  variantId: entry.variant?.id,
  variantLabel: entry.variant?.label,
  score: Math.round(Math.min(1, entry.score) * 1000) / 1000,
});

export function matchOrder(input: {
  productText?: string;
  adTitle?: string;
  variantText?: string;
  prodajnaCena?: number;
  catalog: CatalogProduct[];
}): { best?: DraftProductHit; candidates: DraftProductHit[]; warning?: string } {
  const text = [input.productText, input.adTitle].filter(Boolean).join(" ").trim();
  if (!text || input.catalog.length === 0) return { candidates: [] };

  const scored: Scored[] = [];
  for (const product of input.catalog) {
    const textScore = scoreProductText(input.productText ?? "", input.adTitle ?? "", product);
    if (textScore < TEXT_THRESHOLD) continue;

    // Izbor tipa po variantText: najbolja varijanta proizvoda.
    let variant: CatalogVariant | undefined;
    let bestVariantScore = 0;
    for (const candidate of product.variants ?? []) {
      const score = scoreVariant(input.variantText ?? "", candidate);
      if (score > bestVariantScore) {
        bestVariantScore = score;
        variant = candidate;
      }
    }

    let score = textScore;
    if (input.variantText && bestVariantScore >= VARIANT_MATCH) {
      score = Math.min(1, score + VARIANT_BONUS);
    }
    scored.push({ product, variant, score, priceOk: false });
  }

  if (scored.length === 0) {
    return { candidates: [], warning: "Proizvod nije prepoznat u katalogu (ostaje slobodan tekst)." };
  }

  // Pravilo 7: prodajna cena sa slike bira pravi proizvod između Sličnih —
  // samo u uskom prozoru od najboljeg score-a, da cena ne prevlada loš tekst.
  if (input.prodajnaCena !== undefined) {
    const top = Math.max(...scored.map((entry) => entry.score));
    for (const entry of scored) {
      if (top - entry.score > PRICE_WINDOW) continue;
      const candidatePrice = entry.variant?.prodajnaCena ?? entry.product.prodajnaCena;
      if (candidatePrice === input.prodajnaCena) {
        entry.priceOk = true;
        entry.score = Math.min(1, entry.score + PRICE_BONUS);
      }
    }
  }

  // priceOk u sortu: bonus od 0.05 na score 1.0 udara u plafon i ostaje
  // nevidljiv, pa flag (ne broj) odlučuje pri izjednačenom score-u.
  scored.sort((a, b) => (Number(b.priceOk) - Number(a.priceOk)) || (b.score - a.score));
  const best = scored[0];
  return { best: toHit(best), candidates: scored.slice(0, 5).map(toHit) };
}
