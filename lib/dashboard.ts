import { orderTotals } from "./calc";
import { getBusinessDateKey, isValidRefundDateKey } from "./refund-policy";

// Agregacija za kontrolnu tablu. Cist TS: koristi ga convex/dashboard.ts, testira lib/dashboard.test.ts.
// Novac po narudzbini ide kroz orderTotals iz lib/calc.ts, a zbirovi se sabiraju istim redosledom kao
// orders:summary, pa je period "Sve" bit-identican sa starom tablom.
// Dan narudzbine je datum kreiranja u Europe/Belgrade (isto kao filter Od/Do na /narudzbine).
// Granice perioda se racunaju nad kljucevima "YYYY-MM-DD", bez ms aritmetike, pa DST ne pomera dane.

export const DASHBOARD_PERIODS = ["danas", "7d", "mesec", "prosli", "sve"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "7d";

export const isDashboardPeriod = (value: unknown): value is DashboardPeriod =>
  typeof value === "string" && (DASHBOARD_PERIODS as readonly string[]).includes(value);

/** Omer naplacuje 2,5 € po Aks posiljci (isto kao orders:summary). */
export const OMER_FEE_PER_AKS_SHIPMENT = 2.5;

const STAGES = ["poruceno", "aks", "na_stanju", "poslato", "stiglo", "legle_pare", "vraceno"] as const;
type Stage = (typeof STAGES)[number];
/** Stage-ovi koji su "u toku" (pipeline): sve pre Legla, bez Vraceno. */
export const PIPELINE_STAGES = ["poruceno", "aks", "na_stanju", "poslato", "stiglo"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

const SLANJE_MODES = ["Posta", "Aks", "Bex"] as const;
const LEGACY_TRANSPORT_MODES = ["Posta", "Bex", "Aks"] as const;

// ─── Kljucevi datuma ───

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
};

const pad = (value: number) => String(value).padStart(2, "0");

const toDateKey = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

export const isDateKey = (value: unknown): value is string =>
  typeof value === "string" && isValidRefundDateKey(value);

/** Danasnji dan u Beogradu ("YYYY-MM-DD"). */
export const belgradeTodayKey = (now: number = Date.now()) => getBusinessDateKey(now) ?? "1970-01-01";

/** Dan narudzbine u Beogradu. */
export const orderDateKey = (kreiranoAt: number) => getBusinessDateKey(kreiranoAt) ?? "1970-01-01";

export const addDays = (key: string, days: number) => {
  const { year, month, day } = parseDateKey(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return toDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** "YYYY-MM-DD" ili "YYYY-MM" → "YYYY-MM". */
export const toMonthKey = (key: string) => key.slice(0, 7);

export const addMonths = (monthKey: string, months: number) => {
  const [year, month] = monthKey.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
};

const monthFirstDay = (monthKey: string) => `${monthKey}-01`;

const monthLastDay = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return toDateKey(year, month, daysInMonth(year, month));
};

// ─── Period ───

export type DateRange = { startKey: string; endKey: string };

export type PeriodRange = {
  period: DashboardPeriod;
  /** `null` = bez granice (period "Sve" obuhvata sve, kao orders:summary). */
  range: { startKey: string | null; endKey: string | null };
  /** Prethodni period iste duzine; `null` za "Sve". */
  previous: DateRange | null;
  bucket: "day" | "month";
  /** Opseg grafikona: dani "YYYY-MM-DD" ili meseci "YYYY-MM". */
  chart: DateRange;
  /** Kljuc trenutnog dana/meseca u grafikonu (isticanje). */
  currentKey: string;
};

/** Koliko dana unazad pokazuje grafikon za "Danas" (jedan bar nema smisla). */
export const TODAY_CHART_DAYS = 14;

/** `bounds`: prvi i poslednji dan placenih narudzbina (za grafikon perioda "Sve"). */
export function resolvePeriodRange(
  period: DashboardPeriod,
  todayKey: string,
  bounds?: { firstKey: string; lastKey: string } | null,
): PeriodRange {
  const thisMonth = toMonthKey(todayKey);
  switch (period) {
    case "danas": {
      const yesterday = addDays(todayKey, -1);
      return {
        period,
        range: { startKey: todayKey, endKey: todayKey },
        previous: { startKey: yesterday, endKey: yesterday },
        bucket: "day",
        chart: { startKey: addDays(todayKey, -(TODAY_CHART_DAYS - 1)), endKey: todayKey },
        currentKey: todayKey,
      };
    }
    case "7d": {
      const startKey = addDays(todayKey, -6);
      return {
        period,
        range: { startKey, endKey: todayKey },
        previous: { startKey: addDays(todayKey, -13), endKey: addDays(todayKey, -7) },
        bucket: "day",
        chart: { startKey, endKey: todayKey },
        currentKey: todayKey,
      };
    }
    case "mesec": {
      const startKey = monthFirstDay(thisMonth);
      const prevMonth = addMonths(thisMonth, -1);
      const [prevYear, prevMonthNumber] = prevMonth.split("-").map(Number);
      const prevDay = Math.min(parseDateKey(todayKey).day, daysInMonth(prevYear, prevMonthNumber));
      return {
        period,
        range: { startKey, endKey: todayKey },
        previous: { startKey: monthFirstDay(prevMonth), endKey: toDateKey(prevYear, prevMonthNumber, prevDay) },
        bucket: "day",
        chart: { startKey, endKey: todayKey },
        currentKey: todayKey,
      };
    }
    case "prosli": {
      const lastMonth = addMonths(thisMonth, -1);
      const beforeLast = addMonths(thisMonth, -2);
      const range = { startKey: monthFirstDay(lastMonth), endKey: monthLastDay(lastMonth) };
      return {
        period,
        range,
        previous: { startKey: monthFirstDay(beforeLast), endKey: monthLastDay(beforeLast) },
        bucket: "day",
        chart: range,
        currentKey: range.endKey,
      };
    }
    case "sve":
    default: {
      const firstMonth = bounds && toMonthKey(bounds.firstKey) < thisMonth ? toMonthKey(bounds.firstKey) : thisMonth;
      const lastMonth = bounds && toMonthKey(bounds.lastKey) > thisMonth ? toMonthKey(bounds.lastKey) : thisMonth;
      return {
        period: "sve",
        range: { startKey: null, endKey: null },
        previous: null,
        bucket: "month",
        chart: { startKey: firstMonth, endKey: lastMonth },
        currentKey: thisMonth,
      };
    }
  }
}

const inRange = (key: string, range: { startKey: string | null; endKey: string | null }) =>
  (range.startKey === null || key >= range.startKey) && (range.endKey === null || key <= range.endKey);

/** Svi kljucevi grafikona redom (popunjava i prazne dane/mesece). */
export function listChartKeys(range: PeriodRange): string[] {
  const keys: string[] = [];
  const { startKey, endKey } = range.chart;
  const step = range.bucket === "day" ? (key: string) => addDays(key, 1) : (key: string) => addMonths(key, 1);
  // Gornja granica stiti od beskonacne petlje ako je opseg pogresan.
  for (let key = startKey; key <= endKey && keys.length < 1200; key = step(key)) keys.push(key);
  return keys;
}

// ─── Redovi ───

type OrderInput = Parameters<typeof orderTotals>[0] & {
  kreiranoAt: number;
  stage?: string;
  slanjeMode?: string;
  transportMode?: string;
  pickup?: boolean;
  kasni?: boolean;
};

export type DashboardRow = {
  dateKey: string;
  stage: Stage;
  prodajno: number;
  nabavno: number;
  transport: number;
  profit: number;
  isAks: boolean;
  pickup: boolean;
  kasni: boolean;
};

// Isto kao normalizeStage u convex/orders.ts.
export const normalizeStage = (stage?: string): Stage =>
  stage && (STAGES as readonly string[]).includes(stage) ? (stage as Stage) : "poruceno";

// Isto kao resolveSlanjeModeFromOrder u convex/orders.ts.
const resolveSlanjeMode = (order: OrderInput) => {
  if (order.slanjeMode && (SLANJE_MODES as readonly string[]).includes(order.slanjeMode)) return order.slanjeMode;
  if (order.transportMode && (LEGACY_TRANSPORT_MODES as readonly string[]).includes(order.transportMode)) {
    return order.transportMode;
  }
  return undefined;
};

export function toDashboardRow(order: OrderInput): DashboardRow {
  const totals = orderTotals(order);
  return {
    dateKey: orderDateKey(order.kreiranoAt),
    stage: normalizeStage(order.stage),
    prodajno: totals.totalProdajno,
    nabavno: totals.totalNabavno,
    transport: totals.transport,
    profit: totals.profit,
    isAks: resolveSlanjeMode(order) === "Aks",
    pickup: Boolean(order.pickup),
    kasni: Boolean(order.kasni),
  };
}

// ─── Zbirovi (oblik i redosled kao orders:summary) ───

export type DashboardTotals = {
  brojNarudzbina: number;
  ukupnoProdajno: number;
  ukupnoNabavno: number;
  ukupnoTransport: number;
  profit: number;
  omerUkupno: number;
  omerBrojPosiljki: number;
  ukupnoLicnoPreuzimanje: number;
  licnoPreuzimanjeBrojNarudzbina: number;
};

const emptyTotals = (): DashboardTotals => ({
  brojNarudzbina: 0,
  ukupnoProdajno: 0,
  ukupnoNabavno: 0,
  ukupnoTransport: 0,
  profit: 0,
  omerUkupno: 0,
  omerBrojPosiljki: 0,
  ukupnoLicnoPreuzimanje: 0,
  licnoPreuzimanjeBrojNarudzbina: 0,
});

/** Zbir za placene (Leglo) redove. `rows` moraju biti u redosledu indeksa (kao summary). */
export function sumPaidRows(rows: DashboardRow[], filter?: (row: DashboardRow) => boolean): DashboardTotals {
  const totals = rows.reduce((acc, row) => {
    if (row.stage !== "legle_pare") return acc;
    if (filter && !filter(row)) return acc;
    acc.brojNarudzbina += 1;
    acc.ukupnoProdajno += row.prodajno;
    acc.ukupnoNabavno += row.nabavno;
    acc.ukupnoTransport += row.transport;
    acc.profit += row.profit;
    if (row.isAks) {
      acc.omerBrojPosiljki += 1;
      acc.omerUkupno += OMER_FEE_PER_AKS_SHIPMENT;
    }
    if (row.pickup) {
      acc.licnoPreuzimanjeBrojNarudzbina += 1;
      acc.ukupnoLicnoPreuzimanje += row.prodajno;
    }
    return acc;
  }, emptyTotals());
  return { ...totals, profit: totals.profit - totals.omerUkupno };
}

/** Prvi i poslednji dan placenih narudzbina; `null` kad ih nema. */
export function paidBounds(rows: DashboardRow[]) {
  let firstKey: string | null = null;
  let lastKey: string | null = null;
  for (const row of rows) {
    if (row.stage !== "legle_pare") continue;
    if (firstKey === null || row.dateKey < firstKey) firstKey = row.dateKey;
    if (lastKey === null || row.dateKey > lastKey) lastKey = row.dateKey;
  }
  return firstKey && lastKey ? { firstKey, lastKey } : null;
}

export type SeriesPoint = { key: string; profit: number; count: number };

export type PeriodAggregate = {
  totals: DashboardTotals;
  previous: DashboardTotals | null;
  series: SeriesPoint[];
};

export function aggregatePeriod(rows: DashboardRow[], range: PeriodRange): PeriodAggregate {
  const totals = sumPaidRows(rows, (row) => inRange(row.dateKey, range.range));
  const previous = range.previous ? sumPaidRows(rows, (row) => inRange(row.dateKey, range.previous!)) : null;

  const keys = listChartKeys(range);
  const byKey = new Map<string, SeriesPoint>(keys.map((key) => [key, { key, profit: 0, count: 0 }]));
  for (const row of rows) {
    if (row.stage !== "legle_pare") continue;
    const point = byKey.get(range.bucket === "day" ? row.dateKey : toMonthKey(row.dateKey));
    if (!point) continue;
    point.count += 1;
    point.profit += row.profit - (row.isAks ? OMER_FEE_PER_AKS_SHIPMENT : 0);
  }

  return { totals, previous, series: keys.map((key) => byKey.get(key)!) };
}

/** Relativna promena profita prema prethodnom periodu; `null` kad poredjenje nema smisla. */
export function profitDelta(current: DashboardTotals, previous: DashboardTotals | null) {
  if (!previous || previous.brojNarudzbina === 0 || previous.profit === 0) return null;
  return (current.profit - previous.profit) / Math.abs(previous.profit);
}

// ─── Trenutno stanje (ne zavisi od perioda) ───

export type PipelineEntry = { stage: PipelineStage; count: number; prodajno: number };

export function summarizePipeline(rows: DashboardRow[]): PipelineEntry[] {
  const entries = new Map<Stage, PipelineEntry>(
    PIPELINE_STAGES.map((stage) => [stage, { stage, count: 0, prodajno: 0 }]),
  );
  for (const row of rows) {
    const entry = entries.get(row.stage);
    if (!entry) continue;
    entry.count += 1;
    entry.prodajno += row.prodajno;
  }
  return PIPELINE_STAGES.map((stage) => entries.get(stage)!);
}

/** Kasni: isto pravilo kao filter `late=1`. Ceka slanje: Aks/Na stanju bez licnog preuzimanja (`shipping=1`). */
export function countActions(rows: DashboardRow[]) {
  let late = 0;
  let awaitingShipment = 0;
  for (const row of rows) {
    if (row.kasni && row.stage === "poslato") late += 1;
    if ((row.stage === "aks" || row.stage === "na_stanju") && !row.pickup) awaitingShipment += 1;
  }
  return { late, awaitingShipment };
}
