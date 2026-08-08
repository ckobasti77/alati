import { describe, it, expect } from "vitest";
import { matchProduct, PRODUCT_MATCH_THRESHOLD } from "./productMatch";
import type { CatalogProduct } from "./types";

const catalog: CatalogProduct[] = [
  { id: "p1", name: "Akumulatorska bušilica 21V", kpName: "Aku bušilica 21V dve baterije", nabavnaCena: 40, prodajnaCena: 5990 },
  { id: "p2", name: "Ugaona brusilica 125mm", nabavnaCena: 30, prodajnaCena: 4590 },
  { id: "p3", name: "Set gedora 108 delova", kpName: "Gedore set 108kom", nabavnaCena: 25, prodajnaCena: 5490 },
];

describe("matchProduct", () => {
  it("fuzzy pogodak po naslovu (tipfeler + drugi red reci)", () => {
    const hit = matchProduct("busilica akumulatorska 21v", catalog);
    expect(hit).not.toBeNull();
    expect(hit?.product.id).toBe("p1");
    expect(hit?.score).toBeGreaterThanOrEqual(PRODUCT_MATCH_THRESHOLD);
  });

  it("pogodak preko kpName", () => {
    const hit = matchProduct("gedore set 108kom", catalog);
    expect(hit?.product.id).toBe("p3");
  });

  it("slobodan tekst bez pogotka -> null", () => {
    expect(matchProduct("poklon za kuma, nesto plavo", catalog)).toBeNull();
  });

  it("prazan tekst ili prazan katalog -> null", () => {
    expect(matchProduct("", catalog)).toBeNull();
    expect(matchProduct(undefined, catalog)).toBeNull();
    expect(matchProduct("aku busilica", [])).toBeNull();
  });

  it("bira najblizi proizvod kada je vise kandidata", () => {
    const hit = matchProduct("ugaona brusilica 125", catalog);
    expect(hit?.product.id).toBe("p2");
  });
});
