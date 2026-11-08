import { describe, expect, it } from "vitest";
import type { Order } from "@/types/order";
import { isOrderEditDirty, toOrderEditValues, validateOrderEdit } from "./orderEdit";
import { stageProgress } from "./detailHelpers";

const order = {
  _id: "o1",
  userId: "u1",
  stage: "poslato",
  title: "Aku bušilica",
  kolicina: 1,
  nabavnaCena: 50,
  prodajnaCena: 80,
  customerName: "Pera Perić",
  address: "Bulevar 1",
  phone: "0641234567",
  slanjeMode: "Aks",
  slanjeOwner: "sparrow",
  transportCost: 4.5,
  myProfitPercent: 50,
  kreiranoAt: 0,
} as Order;

const base = toOrderEditValues(order);

describe("toOrderEditValues", () => {
  it("brojeve prikazuje sa zarezom, prazno kad nema vrednosti", () => {
    expect(base.transportCost).toBe("4,5");
    expect(base.myProfitPercent).toBe("50");
    expect(toOrderEditValues({ ...order, transportCost: undefined }).transportCost).toBe("");
    expect(base.pickup).toBe(false);
  });
});

describe("validateOrderEdit", () => {
  it("bez izmena nema patch-a ni grešaka", () => {
    expect(validateOrderEdit(base, base)).toEqual({ patch: {}, errors: {} });
    expect(isOrderEditDirty(base, { ...base })).toBe(false);
  });

  it("tekst se skraćuje, a kraći od 2 znaka je greška (samo za promenjeno polje)", () => {
    const result = validateOrderEdit(base, { ...base, customerName: "  Mika  ", phone: "1" });
    expect(result.patch).toEqual({ customerName: "Mika" });
    expect(result.errors.phone).toBeDefined();
    // Nepromenjena kratka adresa (npr. lično preuzimanje) se ne proverava.
    const short = toOrderEditValues({ ...order, address: "" });
    expect(validateOrderEdit(short, { ...short, napomena: "x" }).errors).toEqual({});
  });

  it("transport: prazno briše, zarez je decimala, negativno je greška", () => {
    expect(validateOrderEdit(base, { ...base, transportCost: "" }).patch).toEqual({ transportCost: undefined });
    expect(validateOrderEdit(base, { ...base, transportCost: "5,25" }).patch).toEqual({ transportCost: 5.25 });
    expect(validateOrderEdit(base, { ...base, transportCost: "-1" }).errors.transportCost).toBeDefined();
  });

  it("procenat profita je obavezan i između 0 i 100", () => {
    expect(validateOrderEdit(base, { ...base, myProfitPercent: "" }).errors.myProfitPercent).toBeDefined();
    expect(validateOrderEdit(base, { ...base, myProfitPercent: "101" }).errors.myProfitPercent).toBeDefined();
    expect(validateOrderEdit(base, { ...base, myProfitPercent: "33,5" }).patch).toEqual({ myProfitPercent: 33.5 });
  });

  it("bez slanja briše i račun; promena slanja zadržava račun", () => {
    expect(validateOrderEdit(base, { ...base, slanjeMode: "" }).patch).toEqual({ slanjeMode: undefined, slanjeOwner: undefined });
    expect(validateOrderEdit(base, { ...base, slanjeMode: "Bex" }).patch).toEqual({ slanjeMode: "Bex" });
    expect(validateOrderEdit(base, { ...base, slanjeOwner: " novi " }).patch).toEqual({ slanjeOwner: "novi" });
    expect(validateOrderEdit(base, { ...base, slanjeOwner: "" }).patch).toEqual({ slanjeOwner: undefined });
  });

  it("napomena: prazno je undefined; broj pošiljke: prazno je \"\" (briše)", () => {
    expect(validateOrderEdit(base, { ...base, napomena: "  " }).patch).toEqual({ napomena: undefined });
    const withNote = toOrderEditValues({ ...order, napomena: "zvati" });
    expect(validateOrderEdit(withNote, { ...withNote, napomena: " " }).patch).toEqual({ napomena: undefined });
    expect(validateOrderEdit(base, { ...base, brojPosiljke: " AB12 " }).patch).toEqual({ brojPosiljke: "AB12" });
    const sent = toOrderEditValues({ ...order, brojPosiljke: "AB12" });
    expect(validateOrderEdit(sent, { ...sent, brojPosiljke: "" }).patch).toEqual({ brojPosiljke: "" });
  });
});

describe("stageProgress", () => {
  it("broji korake glavnog toka, Vraćeno je van toka", () => {
    expect(stageProgress("poruceno")).toEqual({ index: 0, total: 6, returned: false });
    expect(stageProgress("poslato")).toEqual({ index: 3, total: 6, returned: false });
    expect(stageProgress("legle_pare")).toEqual({ index: 5, total: 6, returned: false });
    expect(stageProgress("vraceno")).toEqual({ index: -1, total: 6, returned: true });
  });
});
