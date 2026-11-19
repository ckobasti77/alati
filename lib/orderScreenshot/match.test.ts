// match.test.ts — katalog: fuzzy tekst, tip po variantText, cena kao presuda.
import { describe, expect, it } from "vitest";
import { matchOrder, normalizeVariantText } from "./match";
import type { CatalogProduct } from "./types";

const product = (overrides: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: "p1",
  name: "Motorna testera Stihl",
  nabavnaCena: 500,
  prodajnaCena: 800,
  ...overrides,
});

describe("normalizeVariantText", () => {
  it("'4 x 2.5' = '4x2,5'", () => {
    expect(normalizeVariantText("4 x 2.5")).toBe(normalizeVariantText("4x2,5"));
    expect(normalizeVariantText("4 x 2.5")).toBe("4x25");
  });
  it("normalizuje model", () => {
    expect(normalizeVariantText("MS 180")).toBe("ms180");
  });
});

describe("matchOrder", () => {
  it("bira proizvod i tip po variantText (pravilo 6)", () => {
    const catalog: CatalogProduct[] = [
      product({
        id: "p1",
        name: "Kabal za potopne pumpe",
        variants: [
          { id: "v1", label: "4x2,5", nabavnaCena: 100, prodajnaCena: 225, isDefault: true },
          { id: "v2", label: "2x1,5", nabavnaCena: 60, prodajnaCena: 150, isDefault: false },
        ],
      }),
      product({
        id: "p2",
        name: "Kabal za pumpice",
        variants: [{ id: "v3", label: "4x2,5", nabavnaCena: 110, prodajnaCena: 260, isDefault: true }],
      }),
    ];
    const result = matchOrder({ productText: "kabal za potopne pumpe", variantText: "4 x 2.5", catalog });
    expect(result.best?.productId).toBe("p1");
    expect(result.best?.variantId).toBe("v1");
    expect(result.candidates.length).toBe(2);
  });

  it("prodajna cena bira između sličnih kandidata (pravilo 7)", () => {
    const catalog: CatalogProduct[] = [
      product({ id: "velika", name: "Brusilica za beton", prodajnaCena: 300 }),
      product({ id: "mala", name: "Brusilica za beton", prodajnaCena: 260 }),
    ];
    const result = matchOrder({ productText: "brusilica za beton", prodajnaCena: 260, catalog });
    expect(result.best?.productId).toBe("mala");
  });

  it("koristi adTitle kad productText fali", () => {
    const catalog: CatalogProduct[] = [product({ name: "Mašina za odgušenje kanalizacije" })];
    const result = matchOrder({ adTitle: "Mašina za odgušenje kanalizacije", catalog });
    expect(result.best?.productId).toBe("p1");
  });

  it("ne bira proizvod ispod praga (ostaje slobodan tekst)", () => {
    const catalog: CatalogProduct[] = [product({ name: "Motorna testera Stihl" })];
    const result = matchOrder({ productText: "led lampica za radionicu", catalog });
    expect(result.best).toBeUndefined();
    expect(result.candidates).toEqual([]);
    expect(result.warning).toContain("katalogu");
  });

  it("vrati do 5 kandidata, najbolji prvi", () => {
    const catalog: CatalogProduct[] = Array.from({ length: 7 }, (_, i) =>
      product({ id: `p${i}`, name: `Brusilica za beton model ${i}`, prodajnaCena: 200 + i }),
    );
    const result = matchOrder({ productText: "brusilica za beton", catalog });
    expect(result.candidates.length).toBe(5);
    expect(result.candidates[0].score).toBeGreaterThanOrEqual(result.candidates[4].score);
  });
});
