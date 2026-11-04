import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDER_COLUMNS,
  formatRelativeDay,
  formatShortDate,
  getAddressPlace,
  getOrderTitle,
  normalizeDensity,
  normalizeOrderColumns,
  otherView,
  phoneHref,
  resolveOrdersView,
} from "./orderView";
import type { Order, Product } from "@/types/order";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe("getAddressPlace", () => {
  it("vraća poslednji deo bez poštanskog broja", () => {
    expect(getAddressPlace("Kneza Miloša 12, 34000 Kragujevac")).toBe("Kragujevac");
    expect(getAddressPlace("Bulevar 5, Novi Sad 21000")).toBe("Novi Sad");
    expect(getAddressPlace("Ulica 1, Beograd")).toBe("Beograd");
  });
  it("bez zareza vraća celu adresu, prazno za prazno", () => {
    expect(getAddressPlace("Čačak")).toBe("Čačak");
    expect(getAddressPlace("  ")).toBe("");
    expect(getAddressPlace(undefined)).toBe("");
  });
});

describe("formatRelativeDay", () => {
  const now = at(2026, 3, 10, 9);
  it("danas, juče, pre N dana", () => {
    expect(formatRelativeDay(at(2026, 3, 10, 1), now)).toBe("danas");
    expect(formatRelativeDay(at(2026, 3, 9, 23), now)).toBe("juče");
    expect(formatRelativeDay(at(2026, 3, 7), now)).toBe("pre 3 dana");
    expect(formatRelativeDay(at(2026, 3, 4), now)).toBe("pre 6 dana");
  });
  it("posle nedelju dana kratak datum, prošle godine sa godinom", () => {
    expect(formatRelativeDay(at(2026, 3, 3), now)).toBe("3. 3.");
    expect(formatRelativeDay(at(2025, 12, 31), now)).toBe("31. 12. 2025.");
  });
  it("budućnost (pomeren sat) je danas", () => {
    expect(formatRelativeDay(at(2026, 3, 11), now)).toBe("danas");
  });
  it("formatShortDate", () => {
    expect(formatShortDate(at(2025, 1, 5), now)).toBe("5. 1. 2025.");
  });
});

describe("getOrderTitle", () => {
  const product = { _id: "p1", name: "Bušilica", kpName: "Bosch bušilica" } as unknown as Product;
  const map = new Map([["p1", product]]);
  it("koristi trenutni naziv proizvoda i broji stavke", () => {
    const order = {
      title: "Stari naslov",
      items: [
        { id: "a", productId: "p1", title: "x" },
        { id: "b", title: "Baterija" },
        { id: "c", title: "Punjač" },
        { id: "d", title: "Kofer" },
        { id: "e", title: "Bitovi" },
      ],
    } as unknown as Order;
    expect(getOrderTitle(order, map)).toEqual({ primary: "Bosch bušilica", secondary: "Baterija / Punjač +2", itemCount: 5 });
  });
  it("bez stavki pada na naslov narudžbine", () => {
    expect(getOrderTitle({ title: "Naslov" } as Order, map).primary).toBe("Naslov");
  });
});

describe("resolveOrdersView", () => {
  it("URL ima prednost samo kad važi za uređaj", () => {
    expect(resolveOrdersView({ isDesktop: true, url: "kartice", stored: "tabela" })).toBe("kartice");
    expect(resolveOrdersView({ isDesktop: true, url: "detaljno", stored: "kartice" })).toBe("kartice");
    expect(resolveOrdersView({ isDesktop: false, url: "kartice", stored: "detaljno" })).toBe("detaljno");
    expect(resolveOrdersView({ isDesktop: false, url: "detaljno" })).toBe("detaljno");
  });
  it("podrazumevano tabela / kompaktno", () => {
    expect(resolveOrdersView({ isDesktop: true })).toBe("tabela");
    expect(resolveOrdersView({ isDesktop: false, stored: "nesto" })).toBe("kompaktno");
  });
  it("otherView menja unutar istog uređaja", () => {
    expect(otherView("tabela")).toBe("kartice");
    expect(otherView("kartice")).toBe("tabela");
    expect(otherView("kompaktno")).toBe("detaljno");
    expect(otherView("detaljno")).toBe("kompaktno");
  });
});

describe("kolone i gustina", () => {
  it("normalizuje listu kolona po redosledu i odbacuje nepoznate", () => {
    expect(normalizeOrderColumns(["profit", "kupac", "x", "profit"])).toEqual(["kupac", "profit"]);
    expect(normalizeOrderColumns(null)).toEqual(DEFAULT_ORDER_COLUMNS);
    expect(DEFAULT_ORDER_COLUMNS).not.toContain("transport");
  });
  it("gustina", () => {
    expect(normalizeDensity("udobno")).toBe("udobno");
    expect(normalizeDensity("x")).toBe("kompaktno");
  });
  it("phoneHref", () => {
    expect(phoneHref("+381 64/123-45")).toBe("tel:+3816412345");
  });
});

describe("period", () => {
  it("brzi izbori po lokalnom datumu", async () => {
    const { getPeriodPresets } = await import("./orderView");
    const presets = getPeriodPresets(new Date(2026, 2, 10, 9).getTime());
    expect(presets.map((preset) => [preset.key, preset.from, preset.to])).toEqual([
      ["danas", "2026-03-10", "2026-03-10"],
      ["7d", "2026-03-04", "2026-03-10"],
      ["mesec", "2026-03-01", "2026-03-10"],
      ["prosli", "2026-02-01", "2026-02-28"],
    ]);
  });
  it("labela perioda", async () => {
    const { formatPeriodLabel } = await import("./orderView");
    const now = new Date(2026, 2, 10, 9).getTime();
    expect(formatPeriodLabel("2026-03-04", "2026-03-10", now)).toBe("7 dana");
    expect(formatPeriodLabel("2026-01-05", "2026-01-20", now)).toBe("5. 1. – 20. 1.");
    expect(formatPeriodLabel("2026-01-05", "", now)).toBe("od 5. 1.");
    expect(formatPeriodLabel("", "", now)).toBe("Period");
  });
});

describe("pluralOrders", () => {
  it("srpski padeži", async () => {
    const { pluralOrders } = await import("./orderView");
    expect([1, 2, 5, 11, 12, 21, 22, 25, 101, 1000].map((n) => `${n} ${pluralOrders(n)}`)).toEqual([
      "1 narudžbina", "2 narudžbine", "5 narudžbina", "11 narudžbina", "12 narudžbina",
      "21 narudžbina", "22 narudžbine", "25 narudžbina", "101 narudžbina", "1000 narudžbina",
    ]);
    expect(pluralOrders(1, "akuzativ")).toBe("narudžbinu");
    expect(pluralOrders(21, "akuzativ")).toBe("narudžbinu");
  });
});
