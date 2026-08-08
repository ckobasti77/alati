// waIntake/pricing.ts
// Cista pravila cena za WhatsApp uvoz (bez poziva ka KP/Ollami - rezultate
// tih poziva orkestracija prosledjuje ovde). Testirano vitest-om.
//
// Nabavna: eksplicitno iz poruke > katalog (supplierOffers pa nabavnaCena) > nepoznato.
// Prodajna: eksplicitno iz poruke > KP (link ili pretraga) > nepoznato.
// Nepoznato ne rusi uvoz - vraca se warning i covek resava u tabeli.

import type { CatalogProduct, NabavnaSource, ProdajnaSource } from "./types";

export type KpPricingResult = {
  price?: number;
  source: "kp-link" | "kp-pretraga";
  warning?: string;
};

export type PricingInput = {
  nabavnaExplicit?: number;
  prodajnaExplicit?: number;
  product?: CatalogProduct | null;
  kp?: KpPricingResult | null;
};

export type PricingResult = {
  nabavnaCena?: number;
  nabavnaSource?: NabavnaSource;
  nabavnaManual: boolean;
  prodajnaCena?: number;
  prodajnaSource?: ProdajnaSource;
  warnings: string[];
};

// "5.990 din" -> 5990, "55" -> 55, 55 -> 55. Cene u ovom domenu su celi brojevi,
// pa je skidanje svega sto nije cifra dovoljno robusno (tacka je hiljada, ne decimala).
export function parsePriceText(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const validPrice = (value?: number) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;

// Nabavna iz kataloga: najjeftinija bazna supplier ponuda (bez variantId),
// pa najjeftinija bilo koja, pa product.nabavnaCena.
export function catalogNabavna(product: CatalogProduct): number | undefined {
  const offers = product.supplierOffers ?? [];
  if (offers.length > 0) {
    const base = offers.filter((offer) => !offer.variantId);
    const pool = base.length > 0 ? base : offers;
    const min = pool.reduce((acc, offer) => Math.min(acc, offer.price), Number.POSITIVE_INFINITY);
    if (Number.isFinite(min)) return min;
  }
  return validPrice(product.nabavnaCena);
}

export function pricing(input: PricingInput): PricingResult {
  const warnings: string[] = [];

  const nabavnaExplicit = validPrice(input.nabavnaExplicit);
  let nabavnaCena: number | undefined;
  let nabavnaSource: NabavnaSource | undefined;
  let nabavnaManual = false;
  if (nabavnaExplicit !== undefined) {
    nabavnaCena = nabavnaExplicit;
    nabavnaSource = "poruka";
    nabavnaManual = true;
  } else if (input.product) {
    const fromCatalog = catalogNabavna(input.product);
    if (fromCatalog !== undefined) {
      nabavnaCena = fromCatalog;
      nabavnaSource = "katalog";
    }
  }
  if (nabavnaCena === undefined) {
    warnings.push("Nabavna cena nepoznata — proveri/unesi rucno.");
  }

  const prodajnaExplicit = validPrice(input.prodajnaExplicit);
  const kpPrice = validPrice(input.kp?.price);
  let prodajnaCena: number | undefined;
  let prodajnaSource: ProdajnaSource | undefined;
  if (prodajnaExplicit !== undefined) {
    // Eksplicitna prodajna iz poruke ima prioritet nad KP cenom.
    prodajnaCena = prodajnaExplicit;
    prodajnaSource = "poruka";
  } else if (kpPrice !== undefined && input.kp) {
    prodajnaCena = kpPrice;
    prodajnaSource = input.kp.source;
  }
  if (input.kp?.warning) warnings.push(input.kp.warning);
  if (prodajnaCena === undefined) {
    warnings.push("Prodajna cena nepoznata — proveri/unesi rucno.");
  }

  return { nabavnaCena, nabavnaSource, nabavnaManual, prodajnaCena, prodajnaSource, warnings };
}
