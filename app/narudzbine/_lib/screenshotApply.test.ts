// screenshotApply.test.ts — pravila popunjavanja forme iz ScreenshotDraft-a (pravila 3–6 iz zadatka).
// SAMO izmišljeni podaci — ništa iz tmp/.
import { describe, expect, it } from "vitest";
import type { Product } from "@/types/order";
import type { ScreenshotDraft } from "@/lib/orderScreenshot/types";
import {
  buildApplyPlan,
  buildFieldBadges,
  candidateOptions,
  formHasData,
  LOW_CONFIDENCE,
  toScreenshotDraft,
} from "./screenshotApply";
import { defaultFormValues, type OrderFormValues } from "./orderForm";
import type { OrderItemDraft } from "./types";

const productA: Product = {
  _id: "p-a",
  userId: "u1",
  name: "Kanalizacija za pumpe",
  nabavnaCena: 40,
  prodajnaCena: 90,
  variants: [
    { id: "v-a1", label: "4x2,5", nabavnaCena: 40, prodajnaCena: 90, isDefault: true },
    { id: "v-a2", label: "4x3", nabavnaCena: 50, prodajnaCena: 110, isDefault: false },
  ],
  createdAt: 0,
  updatedAt: 0,
};

const productB: Product = {
  _id: "p-b",
  userId: "u1",
  name: "Testera MS 180",
  nabavnaCena: 80,
  prodajnaCena: 130,
  createdAt: 0,
  updatedAt: 0,
};

const catalog = [productA, productB];

const draftBase: ScreenshotDraft = {
  sourceType: "kp",
  customerName: "Marko Marković",
  customerNameRaw: "Marko Marković",
  phone: "0641112233",
  address: "Bulevar 10, Novi Sad",
  pickup: false,
  product: { productId: "p-a", name: "Kanalizacija za pumpe", variantId: "v-a1", score: 0.9 },
  candidates: [{ productId: "p-a", name: "Kanalizacija za pumpe", variantId: "v-a1", score: 0.9 }],
  prodajnaCena: 90,
  nabavnaCena: 40,
  fieldConfidence: { customerName: 1, phone: 1, address: 1, product: 0.9, price: 1 },
  warnings: [],
};

describe("buildApplyPlan", () => {
  it("popunja sve polja kada je draft kompletan i siguran", () => {
    const plan = buildApplyPlan(draftBase, catalog);
    expect(plan.customerName).toBe("Marko Marković");
    expect(plan.phone).toBe("0641112233");
    expect(plan.address).toBe("Bulevar 10, Novi Sad");
    expect(plan.pickup).toBe(false);
    expect(plan.product).toEqual({ productId: "p-a", variantId: "v-a1" });
    expect(plan.prodajna).toBe(90);
    expect(plan.nabavna).toBe(40);
    expect(plan.showCandidates).toBe(false);
  });

  it("prazna polja u draftu ne prepisuju unete vrednosti (null = ostavi)", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      customerName: "",
      phone: "   ",
      address: "",
      product: undefined,
      candidates: [],
      prodajnaCena: undefined,
      nabavnaCena: undefined,
      fieldConfidence: { customerName: 0, phone: 0, address: 0, product: 0, price: 0 },
    };
    const plan = buildApplyPlan(draft, catalog);
    expect(plan.customerName).toBeNull();
    expect(plan.phone).toBeNull();
    expect(plan.address).toBeNull();
    expect(plan.product).toBeNull();
    expect(plan.prodajna).toBeNull();
    expect(plan.nabavna).toBeNull();
  });

  it("kod ličnog preuzimanja adresa ostaje prazna", () => {
    const plan = buildApplyPlan({ ...draftBase, pickup: true, address: "" }, catalog);
    expect(plan.pickup).toBe(true);
    expect(plan.address).toBeNull();
  });

  it("više kandidata → lista za izbor, proizvod se ne popunjava automatski", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      product: { productId: "p-a", name: "Kanalizacija za pumpe", score: 0.7 },
      candidates: [
        { productId: "p-a", name: "Kanalizacija za pumpe", score: 0.7 },
        { productId: "p-b", name: "Testera MS 180", score: 0.65 },
      ],
    };
    const plan = buildApplyPlan(draft, catalog);
    expect(plan.product).toBeNull();
    expect(plan.showCandidates).toBe(true);
  });

  it("nesiguran proizvod (confidence ≤ 0.5) → lista za izbor iako je samo jedan kandidat", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      fieldConfidence: { customerName: 1, phone: 1, address: 1, product: LOW_CONFIDENCE, price: 1 },
    };
    const plan = buildApplyPlan(draft, catalog);
    expect(plan.product).toBeNull();
    expect(plan.showCandidates).toBe(true);
  });

  it("jedan siguran kandidat → automatska popuna (bez liste)", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      fieldConfidence: { customerName: 1, phone: 1, address: 1, product: 0.6, price: 1 },
    };
    const plan = buildApplyPlan(draft, catalog);
    expect(plan.product).toEqual({ productId: "p-a", variantId: "v-a1" });
    expect(plan.showCandidates).toBe(false);
  });

  it("proizvod iz draft-a koji nije u katalogu → ne popunjava se (ostaje ručni)", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      product: { productId: "p-ne-postoji", name: "Nepoznat", score: 0.9 },
      candidates: [{ productId: "p-ne-postoji", name: "Nepoznat", score: 0.9 }],
    };
    const plan = buildApplyPlan(draft, catalog);
    expect(plan.product).toBeNull();
  });
});

describe("candidateOptions", () => {
  it("mapira naziv, tip (varijanta) i prodajnu cenu iz kataloga", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      candidates: [
        { productId: "p-a", name: "Kanalizacija za pumpe", variantId: "v-a2", score: 0.8 },
        { productId: "p-b", name: "Testera MS 180", score: 0.7 },
      ],
    };
    const options = candidateOptions(draft, catalog);
    expect(options).toHaveLength(2);
    expect(options[0].name).toBe("Kanalizacija za pumpe");
    expect(options[0].tip).toBe("4x3");
    expect(options[0].prodajna).toBe(110);
    expect(options[1].name).toBe("Testera MS 180");
    expect(options[1].tip).toBe("");
    expect(options[1].prodajna).toBe(130);
  });

  it("maksimum 5 kandidata", () => {
    const hits = Array.from({ length: 8 }, (_, index) => ({
      productId: `p-x${index}`,
      name: `Proizvod ${index}`,
      score: 1 - index * 0.05,
    }));
    const draft: ScreenshotDraft = { ...draftBase, candidates: hits };
    expect(candidateOptions(draft, catalog)).toHaveLength(5);
  });
});

describe("buildFieldBadges", () => {
  it("svako popunjeno polje dobija 'iz slike', nesigurno dobija i 'proveri'", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      fieldConfidence: { customerName: LOW_CONFIDENCE, phone: 1, address: 0.4, product: 0.9, price: 1 },
    };
    const badges = buildFieldBadges(draft, { product: true });
    expect(badges.customerName).toEqual({ review: true });
    expect(badges.phone).toEqual({ review: false });
    expect(badges.address).toEqual({ review: true });
    expect(badges.product).toEqual({ review: false });
    expect(badges.prodajna).toEqual({ review: false });
    expect(badges.nabavna).toEqual({ review: false });
  });

  it("prazna polja nemaju bedž, pickup ima bedž bez 'proveri'", () => {
    const draft: ScreenshotDraft = {
      ...draftBase,
      customerName: "",
      address: "",
      pickup: true,
      product: undefined,
      candidates: [],
      prodajnaCena: undefined,
      nabavnaCena: undefined,
      fieldConfidence: { customerName: 0, phone: 1, address: 0, product: 0, price: 0 },
    };
    const badges = buildFieldBadges(draft, { product: false });
    expect(badges.customerName).toBeUndefined();
    expect(badges.address).toBeUndefined();
    expect(badges.phone).toEqual({ review: false });
    expect(badges.pickup).toEqual({ review: false });
    expect(badges.product).toBeUndefined();
    expect(badges.prodajna).toBeUndefined();
  });
});

describe("formHasData", () => {
  const values = defaultFormValues as OrderFormValues;
  it("prazna forma (default vrednosti) → nema unetih podataka", () => {
    expect(formHasData(values, [], "")).toBe(false);
  });
  it("uneto ime/telefon/adresa → ima podatke", () => {
    expect(formHasData({ ...values, customerName: "Iva" }, [], "")).toBe(true);
    expect(formHasData({ ...values, phone: "060" }, [], "")).toBe(true);
    expect(formHasData({ ...values, address: "Ulica 1" }, [], "")).toBe(true);
  });
  it("dodata stavka ili izabrani proizvod → ima podatke", () => {
    const item: OrderItemDraft = {
      id: "i1",
      product: productA,
      kolicina: 1,
      nabavnaCena: 40,
      prodajnaCena: 90,
      title: "Kanalizacija za pumpe",
    };
    expect(formHasData(values, [item], "")).toBe(true);
    expect(formHasData(values, [], "p-a")).toBe(true);
  });
});

describe("toScreenshotDraft", () => {
  it("prima validan odgovor i normalizuje ga", () => {
    const draft = toScreenshotDraft({ ...draftBase, nabavnaCena: undefined });
    expect(draft).not.toBeNull();
    expect(draft?.customerName).toBe("Marko Marković");
    expect(draft?.nabavnaCena).toBeUndefined();
    expect(draft?.fieldConfidence.product).toBe(0.9);
  });

  it("odbacuje neobjekat", () => {
    expect(toScreenshotDraft(null)).toBeNull();
    expect(toScreenshotDraft("ok")).toBeNull();
    expect(toScreenshotDraft([1, 2])).toBeNull();
  });

  it("podnosi pogrešne tipove (prazno umesto kršenja)", () => {
    const draft = toScreenshotDraft({
      sourceType: "xyz",
      customerName: 123,
      pickup: "yes",
      candidates: "nema",
      fieldConfidence: { product: "visoko" },
    });
    expect(draft).not.toBeNull();
    expect(draft?.sourceType).toBe("other");
    expect(draft?.customerName).toBe("");
    expect(draft?.pickup).toBe(false);
    expect(draft?.candidates).toEqual([]);
    expect(draft?.fieldConfidence.product).toBe(0);
  });
});
