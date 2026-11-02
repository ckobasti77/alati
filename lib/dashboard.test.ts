import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  aggregatePeriod,
  countActions,
  listChartKeys,
  orderDateKey,
  paidBounds,
  profitDelta,
  resolvePeriodRange,
  sumPaidRows,
  summarizePipeline,
  toDashboardRow,
  type DashboardRow,
} from "./dashboard";

type OrderOverrides = Partial<Parameters<typeof toDashboardRow>[0]>;

const order = (overrides: OrderOverrides = {}) => ({
  title: "Busilica",
  kolicina: 1,
  nabavnaCena: 60,
  prodajnaCena: 100,
  transportCost: 5,
  stage: "legle_pare",
  kreiranoAt: Date.UTC(2026, 10, 2, 12),
  ...overrides,
});

const row = (overrides: Partial<DashboardRow> = {}): DashboardRow => ({
  dateKey: "2026-11-02",
  stage: "legle_pare",
  prodajno: 100,
  nabavno: 60,
  transport: 5,
  profit: 35,
  isAks: false,
  pickup: false,
  kasni: false,
  ...overrides,
});

describe("granice dana (Europe/Belgrade)", () => {
  it("zimi je ponoc u 23:00 UTC", () => {
    expect(orderDateKey(Date.UTC(2026, 10, 2, 22, 59, 59))).toBe("2026-11-02");
    expect(orderDateKey(Date.UTC(2026, 10, 2, 23, 0, 0))).toBe("2026-11-03");
  });

  it("leti je ponoc u 22:00 UTC", () => {
    expect(orderDateKey(Date.UTC(2026, 6, 14, 21, 59, 59))).toBe("2026-07-14");
    expect(orderDateKey(Date.UTC(2026, 6, 14, 22, 0, 0))).toBe("2026-07-15");
  });

  it("noci promene vremena ne pomeraju dan", () => {
    // 29. 3. 2026: 02:00 → 03:00 (dan ima 23 sata); 25. 10. 2026: 03:00 → 02:00 (25 sati).
    expect(orderDateKey(Date.UTC(2026, 2, 28, 22, 59))).toBe("2026-03-28");
    expect(orderDateKey(Date.UTC(2026, 2, 28, 23, 0))).toBe("2026-03-29");
    expect(orderDateKey(Date.UTC(2026, 2, 29, 21, 59))).toBe("2026-03-29");
    expect(orderDateKey(Date.UTC(2026, 2, 29, 22, 0))).toBe("2026-03-30");
    expect(orderDateKey(Date.UTC(2026, 9, 24, 21, 59))).toBe("2026-10-24");
    expect(orderDateKey(Date.UTC(2026, 9, 24, 22, 0))).toBe("2026-10-25");
    expect(orderDateKey(Date.UTC(2026, 9, 25, 22, 59))).toBe("2026-10-25");
    expect(orderDateKey(Date.UTC(2026, 9, 25, 23, 0))).toBe("2026-10-26");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("narudzbina posle ponoci po Beogradu ulazi u sledeci dan perioda", () => {
    const rows = [
      toDashboardRow(order({ kreiranoAt: Date.UTC(2026, 10, 1, 22, 59) })), // 1. 11. 23:59
      toDashboardRow(order({ kreiranoAt: Date.UTC(2026, 10, 1, 23, 0) })), // 2. 11. 00:00
    ];
    const today = aggregatePeriod(rows, resolvePeriodRange("danas", "2026-11-02"));
    expect(today.totals.brojNarudzbina).toBe(1);
    expect(today.previous?.brojNarudzbina).toBe(1);
  });
});

describe("resolvePeriodRange", () => {
  it("7 dana ukljucuje danas, prethodni period je 7 dana pre", () => {
    const range = resolvePeriodRange("7d", "2026-11-02");
    expect(range.range).toEqual({ startKey: "2026-10-27", endKey: "2026-11-02" });
    expect(range.previous).toEqual({ startKey: "2026-10-20", endKey: "2026-10-26" });
    expect(listChartKeys(range)).toHaveLength(7);
  });

  it("danas: grafikon pokazuje 14 dana, prethodni je juce", () => {
    const range = resolvePeriodRange("danas", "2026-03-01");
    expect(range.previous).toEqual({ startKey: "2026-02-28", endKey: "2026-02-28" });
    const keys = listChartKeys(range);
    expect(keys).toHaveLength(14);
    expect(keys.at(-1)).toBe("2026-03-01");
  });

  it("ovaj mesec 31. poredi sa prosli mesec do poslednjeg dana", () => {
    const range = resolvePeriodRange("mesec", "2026-10-31");
    expect(range.range).toEqual({ startKey: "2026-10-01", endKey: "2026-10-31" });
    expect(range.previous).toEqual({ startKey: "2026-09-01", endKey: "2026-09-30" });
    expect(resolvePeriodRange("mesec", "2028-03-31").previous).toEqual({ startKey: "2028-02-01", endKey: "2028-02-29" });
    expect(resolvePeriodRange("mesec", "2026-03-15").previous).toEqual({ startKey: "2026-02-01", endKey: "2026-02-15" });
  });

  it("prosli mesec je ceo mesec, preko granice godine", () => {
    const range = resolvePeriodRange("prosli", "2027-01-05");
    expect(range.range).toEqual({ startKey: "2026-12-01", endKey: "2026-12-31" });
    expect(range.previous).toEqual({ startKey: "2026-11-01", endKey: "2026-11-30" });
    expect(listChartKeys(range)).toHaveLength(31);
    expect(listChartKeys(resolvePeriodRange("prosli", "2028-03-10"))).toHaveLength(29);
  });

  it("sve: bez granica i bez poredjenja, grafikon po mesecima", () => {
    const range = resolvePeriodRange("sve", "2026-11-02", { firstKey: "2025-12-20", lastKey: "2026-10-01" });
    expect(range.range).toEqual({ startKey: null, endKey: null });
    expect(range.previous).toBeNull();
    expect(listChartKeys(range)).toEqual(Array.from({ length: 12 }, (_, i) => addMonths("2025-12", i)));
    expect(listChartKeys(resolvePeriodRange("sve", "2026-11-02", null))).toEqual(["2026-11"]);
  });
});

describe("aggregatePeriod", () => {
  it("prazan period daje nule, seriju popunjenu nulama i bez delte", () => {
    const result = aggregatePeriod([row({ dateKey: "2026-01-10" })], resolvePeriodRange("7d", "2026-11-02"));
    expect(result.totals.brojNarudzbina).toBe(0);
    expect(result.totals.profit).toBe(0);
    expect(result.series).toHaveLength(7);
    expect(result.series.every((point) => point.profit === 0 && point.count === 0)).toBe(true);
    expect(profitDelta(result.totals, result.previous)).toBeNull();
  });

  it("racuna samo Leglo i oduzima Omer po Aks posiljci", () => {
    const rows = [
      row({ isAks: true }),
      row({ stage: "poslato" }),
      row({ pickup: true, profit: 10, prodajno: 40 }),
    ];
    const { totals, series } = aggregatePeriod(rows, resolvePeriodRange("danas", "2026-11-02"));
    expect(totals.brojNarudzbina).toBe(2);
    expect(totals.omerBrojPosiljki).toBe(1);
    expect(totals.omerUkupno).toBe(2.5);
    expect(totals.profit).toBe(35 + 10 - 2.5);
    expect(totals.licnoPreuzimanjeBrojNarudzbina).toBe(1);
    expect(totals.ukupnoLicnoPreuzimanje).toBe(40);
    expect(series.at(-1)).toEqual({ key: "2026-11-02", profit: 42.5, count: 2 });
  });

  it("negativan profit ostaje negativan u zbiru i u grafikonu", () => {
    const rows = [row({ profit: -20, isAks: true })];
    const { totals, series } = aggregatePeriod(rows, resolvePeriodRange("7d", "2026-11-02"));
    expect(totals.profit).toBe(-22.5);
    expect(series.at(-1)?.profit).toBe(-22.5);
  });

  it("sve je isto sto i obican zbir, a serija se sabira u totals", () => {
    const rows = [
      row({ dateKey: "2025-12-31", profit: 12.35, isAks: true }),
      row({ dateKey: "2026-02-28", profit: 0.1 }),
      row({ dateKey: "2026-02-28", profit: 0.2, isAks: true }),
      row({ dateKey: "2026-11-02", profit: -3.3 }),
      row({ dateKey: "2026-11-02", stage: "vraceno", profit: 999 }),
    ];
    const range = resolvePeriodRange("sve", "2026-11-02", paidBounds(rows));
    const { totals, series } = aggregatePeriod(rows, range);
    expect(totals).toEqual(sumPaidRows(rows));
    expect(totals.brojNarudzbina).toBe(4);
    const seriesSum = series.reduce((sum, point) => sum + point.profit, 0);
    expect(seriesSum).toBeCloseTo(totals.profit, 9);
    expect(series.reduce((sum, point) => sum + point.count, 0)).toBe(4);
    expect(series).toHaveLength(12);
  });

  it("delta poredi sa prethodnim periodom", () => {
    const rows = [row({ dateKey: "2026-11-02", profit: 150 }), row({ dateKey: "2026-10-25", profit: 100 })];
    const result = aggregatePeriod(rows, resolvePeriodRange("7d", "2026-11-02"));
    expect(profitDelta(result.totals, result.previous)).toBeCloseTo(0.5, 9);
  });
});

describe("toDashboardRow", () => {
  it("koristi orderTotals iz lib/calc i legacy nacin slanja", () => {
    const result = toDashboardRow(
      order({
        items: [
          { id: "a", title: "A", kolicina: 2, nabavnaCena: 10, prodajnaCena: 25 },
          { id: "b", title: "B", kolicina: 1, nabavnaCena: 5, prodajnaCena: 8 },
        ],
        transportCost: 3,
        transportMode: "Aks",
      }),
    );
    expect(result).toMatchObject({ prodajno: 58, nabavno: 25, transport: 3, profit: 30, isAks: true });
  });

  it("nepoznat stage tretira kao Poruceno (kao orders.ts)", () => {
    expect(toDashboardRow(order({ stage: "nesto" })).stage).toBe("poruceno");
  });
});

describe("trenutno stanje", () => {
  it("pipeline broji samo stage-ove u toku", () => {
    const pipeline = summarizePipeline([
      row({ stage: "poslato", prodajno: 50 }),
      row({ stage: "poslato", prodajno: 70 }),
      row({ stage: "legle_pare" }),
      row({ stage: "vraceno" }),
    ]);
    expect(pipeline.map((entry) => entry.stage)).toEqual(["poruceno", "aks", "na_stanju", "poslato", "stiglo"]);
    expect(pipeline.find((entry) => entry.stage === "poslato")).toEqual({ stage: "poslato", count: 2, prodajno: 120 });
  });

  it("kasni samo u stage-u Poslato; ceka slanje bez licnog preuzimanja", () => {
    const actions = countActions([
      row({ stage: "poslato", kasni: true }),
      row({ stage: "stiglo", kasni: true }),
      row({ stage: "aks" }),
      row({ stage: "na_stanju", pickup: true }),
      row({ stage: "na_stanju" }),
    ]);
    expect(actions).toEqual({ late: 1, awaitingShipment: 2 });
  });
});
