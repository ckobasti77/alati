import { describe, it, expect } from "vitest";
import { catalogNabavna, parsePriceText, pricing } from "./pricing";
import type { CatalogProduct } from "./types";

const product: CatalogProduct = {
  id: "p1",
  name: "Akumulatorska busilica 21V",
  kpName: "Aku busilica 21V dve baterije",
  nabavnaCena: 40,
  prodajnaCena: 5990,
};

describe("parsePriceText", () => {
  it("broj, string i format sa tackom hiljada", () => {
    expect(parsePriceText(55)).toBe(55);
    expect(parsePriceText("55")).toBe(55);
    expect(parsePriceText("5.990 din")).toBe(5990);
    expect(parsePriceText("")).toBeUndefined();
    expect(parsePriceText(null)).toBeUndefined();
    expect(parsePriceText(0)).toBeUndefined();
    expect(parsePriceText(-5)).toBeUndefined();
  });
});

describe("catalogNabavna", () => {
  it("bez ponuda -> nabavnaCena proizvoda", () => {
    expect(catalogNabavna(product)).toBe(40);
  });
  it("najjeftinija bazna supplier ponuda gazi nabavnaCena", () => {
    expect(
      catalogNabavna({
        ...product,
        supplierOffers: [{ price: 38 }, { price: 35 }, { price: 30, variantId: "v2" }],
      }),
    ).toBe(35);
  });
  it("ako su sve ponude za varijante, uzima najjeftiniju od njih", () => {
    expect(
      catalogNabavna({
        ...product,
        supplierOffers: [{ price: 44, variantId: "v1" }, { price: 42, variantId: "v2" }],
      }),
    ).toBe(42);
  });
});

describe("pricing - nabavna", () => {
  it("eksplicitna nabavna iz poruke gazi katalog i oznacava manual", () => {
    const result = pricing({ nabavnaExplicit: 55, product });
    expect(result.nabavnaCena).toBe(55);
    expect(result.nabavnaSource).toBe("poruka");
    expect(result.nabavnaManual).toBe(true);
  });

  it("bez eksplicitne -> katalog", () => {
    const result = pricing({ product });
    expect(result.nabavnaCena).toBe(40);
    expect(result.nabavnaSource).toBe("katalog");
    expect(result.nabavnaManual).toBe(false);
  });

  it("bez eksplicitne i bez pogotka u katalogu -> undefined + warning", () => {
    const result = pricing({});
    expect(result.nabavnaCena).toBeUndefined();
    expect(result.nabavnaSource).toBeUndefined();
    expect(result.warnings.some((w) => w.toLowerCase().includes("nabavna"))).toBe(true);
  });
});

describe("pricing - prodajna", () => {
  it("iz KP linka", () => {
    const result = pricing({ product, kp: { price: 6490, source: "kp-link" } });
    expect(result.prodajnaCena).toBe(6490);
    expect(result.prodajnaSource).toBe("kp-link");
  });

  it("iz KP pretrage prodavnice", () => {
    const result = pricing({ product, kp: { price: 5990, source: "kp-pretraga" } });
    expect(result.prodajnaCena).toBe(5990);
    expect(result.prodajnaSource).toBe("kp-pretraga");
  });

  it("eksplicitna prodajna iz poruke ima prioritet nad KP", () => {
    const result = pricing({ prodajnaExplicit: 7000, kp: { price: 6490, source: "kp-link" }, product });
    expect(result.prodajnaCena).toBe(7000);
    expect(result.prodajnaSource).toBe("poruka");
  });

  it("nista -> undefined + warning; KP warning se prosledjuje", () => {
    const result = pricing({ product, kp: { price: undefined, source: "kp-pretraga", warning: "KP selektor pukao" } });
    expect(result.prodajnaCena).toBeUndefined();
    expect(result.warnings).toContain("KP selektor pukao");
    expect(result.warnings.some((w) => w.toLowerCase().includes("prodajna"))).toBe(true);
  });
});
