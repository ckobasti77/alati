// normalize.test.ts — svih 7 poslovnih pravila, SAMO izmišljeni podaci.
import { describe, expect, it } from "vitest";
import { decidePickup, normalizeAddress, normalizeName, normalizePhone, normalizePrices } from "./normalize";
import type { ScreenshotRaw } from "./types";

const baseRaw = (overrides: Partial<ScreenshotRaw> = {}): ScreenshotRaw => ({
  sourceType: "other",
  customerFirstName: "",
  customerLastName: "",
  customerNameRaw: "",
  phones: [],
  street: "",
  postalCode: "",
  city: "",
  addressRaw: "",
  pickupExplicit: false,
  productText: "",
  variantText: "",
  adTitle: "",
  prices: [],
  uncertain: [],
  ...overrides,
});

describe("normalizePhone (pravilo 4)", () => {
  it("zadržava 06 broj", () => {
    expect(normalizePhone("0601234567")).toBe("0601234567");
  });
  it("normalizuje +381 6x", () => {
    expect(normalizePhone("+381 60 123 456 7")).toBe("0601234567");
  });
  it("normalizuje 00381", () => {
    expect(normalizePhone("0038160 123 4567")).toBe("0601234567");
  });
  it("podnosi 9-cifreni 06 broj (06 + 7)", () => {
    expect(normalizePhone("065123456")).toBe("065123456");
  });
  it("odbacuje gradski broj", () => {
    expect(normalizePhone("021 123 456")).toBe("");
  });
  it("prazno/undefined → prazno", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(undefined)).toBe("");
  });
});

describe("normalizeName (pravilo 2)", () => {
  it("koristi ime koje je model već razdvojio", () => {
    const raw = baseRaw({ customerFirstName: "Goran", customerLastName: "Petrovic" });
    expect(normalizeName(raw).name).toBe("Goran Petrovic");
  });
  it("okreće 'Prezime Ime'", () => {
    const raw = baseRaw({ customerNameRaw: "Petrović Goran" });
    expect(normalizeName(raw).name).toBe("Goran Petrović");
  });
  it("ne okreće 'Ime Prezime'", () => {
    const raw = baseRaw({ customerNameRaw: "Milan Jovičić" });
    expect(normalizeName(raw).name).toBe("Milan Jovičić");
  });
  it("jedno ime ostaje jedno ime", () => {
    const raw = baseRaw({ customerNameRaw: "Dejan" });
    expect(normalizeName(raw).name).toBe("Dejan");
  });
  it("radi i na cirilici", () => {
    const raw = baseRaw({ customerNameRaw: "Ћулибрк Горан" });
    expect(normalizeName(raw).name).toBe("Горан Ћулибрк");
  });
});

describe("normalizeAddress (pravilo 3)", () => {
  it("spaja ulicu, PTT i mesto", () => {
    const raw = baseRaw({ street: "Cara Lazara 12", postalCode: "22323", city: "Novi Slankamen" });
    const result = normalizeAddress(raw);
    expect(result.address).toBe("Cara Lazara 12, 22323 Novi Slankamen");
    expect(result.warnings).toEqual([]);
  });
  it("razdvaja zalepljen poštanski broj i mesto", () => {
    const raw = baseRaw({ addressRaw: "22323Novi slankamen" });
    const result = normalizeAddress(raw);
    expect(result.address).toBe("22323 Novi slankamen");
    expect(result.warnings.join(" ")).toContain("Ulica");
  });
  it("razdvaja ulicu, PTT i mesto iz addressRaw", () => {
    const raw = baseRaw({ addressRaw: "Bulevar oslobođenja 10, 21000 Novi Sad" });
    const result = normalizeAddress(raw);
    expect(result.address).toBe("Bulevar oslobođenja 10, 21000 Novi Sad");
    expect(result.warnings).toEqual([]);
  });
  it("ne izmišlja poštanski broj", () => {
    const raw = baseRaw({ street: "Novosadska 14a", city: "Stara Pazova" });
    const result = normalizeAddress(raw);
    expect(result.address).toBe("Novosadska 14a, Stara Pazova");
    expect(result.warnings.join(" ")).toContain("Poštanski");
  });
  it("ne baca telefon za poštanski broj", () => {
    const raw = baseRaw({ addressRaw: "064 777 000, Cara Lazara 4, Beograd" });
    const result = normalizeAddress(raw);
    expect(result.address).toBe("");
    expect(result.warnings.join(" ")).toContain("Poštanski");
  });
});

describe("decidePickup (pravilo 1)", () => {
  it("eksplicitno 'lično' → pickup", () => {
    const raw = baseRaw({ pickupExplicit: true, phones: ["061111002"] });
    expect(decidePickup(raw, false, true)).toBe(true);
  });
  it("samo telefon bez adrese → pickup", () => {
    const raw = baseRaw({ phones: ["061111002"] });
    expect(decidePickup(raw, false, true)).toBe(true);
  });
  it("adresa bez 'lično' → slanje", () => {
    const raw = baseRaw({ street: "Kralja Petra 8", city: "Beograd" });
    expect(decidePickup(raw, true, false)).toBe(false);
  });
  it("adresa + telefon bez 'lično' → slanje", () => {
    const raw = baseRaw({ phones: ["061111002"], street: "Kralja Petra 8" });
    expect(decidePickup(raw, true, true)).toBe(false);
  });
  it("eksplicitno 'lično' pobeđuje i uz adresu", () => {
    const raw = baseRaw({ pickupExplicit: true, phones: ["061111002"], street: "Kralja Petra 8" });
    expect(decidePickup(raw, true, true)).toBe(true);
  });
});

describe("normalizePrices (pravilo 5)", () => {
  it("jedan broj sa role unknown → prodajna", () => {
    const result = normalizePrices([{ value: "260e", role: "unknown", raw: "260e" }]);
    expect(result.prodajnaCena).toBe(260);
    expect(result.nabavnaCena).toBeUndefined();
  });
  it("role prodajna", () => {
    const result = normalizePrices([{ value: "215", role: "prodajna", raw: "215 €" }]);
    expect(result.prodajnaCena).toBe(215);
  });
  it("'80-130€' → nabavna 80 + prodajna 130", () => {
    const result = normalizePrices([{ value: "80-130", role: "unknown", raw: "80-130€" }]);
    expect(result.nabavnaCena).toBe(80);
    expect(result.prodajnaCena).toBe(130);
  });
  it("prazan spisak → warning o ceni", () => {
    const result = normalizePrices([]);
    expect(result.prodajnaCena).toBeUndefined();
    expect(result.nabavnaCena).toBeUndefined();
    expect(result.warnings.join(" ")).toContain("Cena");
  });
  it("prva prodajna ima prednost", () => {
    const result = normalizePrices([
      { value: "225", role: "prodajna", raw: "225e" },
      { value: "300", role: "prodajna", raw: "300e" },
    ]);
    expect(result.prodajnaCena).toBe(225);
  });
});
