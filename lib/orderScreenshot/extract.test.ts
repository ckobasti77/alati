// extract.test.ts — extractOrderFromScreenshot sa lažnim vision odgovorom
// (bez pravog poziva Gemini-ju). SAMO izmišljeni podaci.
import { describe, expect, it } from "vitest";
import { extractOrderFromScreenshot, type VisionFn } from "./extract";
import { GeminiRateLimitError } from "../gemini";
import type { CatalogProduct } from "./types";

const catalog: CatalogProduct[] = [
  {
    id: "p1",
    name: "Motorna testera Stihl",
    nabavnaCena: 100,
    prodajnaCena: 999,
    variants: [
      { id: "v180", label: "MS 180", nabavnaCena: 80, prodajnaCena: 130, isDefault: true },
      { id: "v200", label: "MS 200", nabavnaCena: 120, prodajnaCena: 150, isDefault: false },
    ],
  },
];

const fakeVision = (response: unknown): VisionFn => async () => response;

describe("extractOrderFromScreenshot", () => {
  it("gradi draft iz kompletnog model odgovora", async () => {
    const raw = {
      sourceType: "kp",
      customerFirstName: "",
      customerLastName: "",
      customerNameRaw: "Petrović Marko",
      phones: ["+381 65 111 2234"],
      street: "Kralja Petra 8",
      postalCode: "11000",
      city: "Beograd",
      addressRaw: "Kralja Petra 8, 11000 Beograd",
      pickupExplicit: false,
      productText: "motorna testera stihl",
      variantText: "MS 200",
      adTitle: "Motorna testera Stihl MS 200",
      prices: [{ value: "150", role: "prodajna", raw: "150 €" }],
      uncertain: [],
    };
    const draft = await extractOrderFromScreenshot("AAAA", catalog, { vision: fakeVision(raw) });
    expect(draft.customerName).toBe("Marko Petrović");
    expect(draft.phone).toBe("0651112234");
    expect(draft.address).toBe("Kralja Petra 8, 11000 Beograd");
    expect(draft.pickup).toBe(false);
    expect(draft.product?.productId).toBe("p1");
    expect(draft.product?.variantId).toBe("v200");
    expect(draft.prodajnaCena).toBe(150);
    expect(draft.fieldConfidence.product).toBeGreaterThan(0);
    expect(draft.fieldConfidence.address).toBe(1);
  });

  it("samo telefon bez adrese → pickup (pravilo 1)", async () => {
    const raw = {
      sourceType: "call_log",
      customerFirstName: "",
      customerLastName: "",
      customerNameRaw: "",
      phones: ["0611110023"],
      street: "",
      postalCode: "",
      city: "",
      addressRaw: "",
      pickupExplicit: false,
      productText: "presa za citrus",
      variantText: "",
      adTitle: "",
      prices: [],
      uncertain: [],
    };
    const draft = await extractOrderFromScreenshot("AAAA", catalog, { vision: fakeVision(raw) });
    expect(draft.pickup).toBe(true);
    expect(draft.address).toBe("");
    expect(draft.fieldConfidence.address).toBe(1);
    // warning "adresa nije procitana" NE sme da bude (pickup)
    expect(draft.warnings.join(" ")).not.toContain("Adresa nije pročitana");
  });

  it("SyntaxError iz modela → prazni draft sa warningom (ne crash)", async () => {
    const broken: VisionFn = async () => {
      throw new SyntaxError("Unexpected token");
    };
    const draft = await extractOrderFromScreenshot("AAAA", catalog, { vision: broken });
    expect(draft.warnings.join(" ")).toContain("validan JSON");
    expect(draft.customerName).toBe("");
    expect(draft.product).toBeUndefined();
  });

  it("GeminiRateLimitError prolazi kroz (ruta ga mapira u 429)", async () => {
    const limited: VisionFn = async () => {
      throw new GeminiRateLimitError("429");
    };
    await expect(extractOrderFromScreenshot("AAAA", catalog, { vision: limited })).rejects.toBeInstanceOf(
      GeminiRateLimitError,
    );
  });

  it("niz iz modela (umesto objekta) → prazni draft, ne crash", async () => {
    const draft = await extractOrderFromScreenshot("AAAA", catalog, { vision: fakeVision([]) });
    expect(draft.customerName).toBe("");
    expect(draft.warnings.length).toBeGreaterThan(0);
  });

  it("uncertain polje slabi confidence", async () => {
    const raw = {
      sourceType: "whatsapp",
      customerFirstName: "",
      customerLastName: "",
      customerNameRaw: "",
      phones: ["0611110023"],
      street: "",
      postalCode: "",
      city: "",
      addressRaw: "",
      pickupExplicit: false,
      productText: "brusilica za beton",
      variantText: "",
      adTitle: "",
      prices: [{ value: "260", role: "prodajna", raw: "260e" }],
      uncertain: ["phones"],
    };
    const draft = await extractOrderFromScreenshot("AAAA", catalog, { vision: fakeVision(raw) });
    expect(draft.fieldConfidence.phone).toBe(0.5);
    expect(draft.warnings.join(" ")).toContain("phones");
  });
});
