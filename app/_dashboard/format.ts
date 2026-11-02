import type { DashboardPeriod } from "@/lib/dashboard";

// Kljucevi su vec dani/meseci u Beogradu, pa se formatiraju kao UTC (bez ponovnog pomeranja zone).
const keyToDate = (key: string) => {
  const [year, month, day = 1] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatter = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "UTC", ...options });

const dayShort = formatter({ day: "numeric", month: "numeric" });
const weekdayShort = formatter({ weekday: "short" });
const dayLong = formatter({ weekday: "short", day: "numeric", month: "numeric" });
const monthShort = formatter({ month: "short", year: "2-digit" });
const monthLong = formatter({ month: "long", year: "numeric" });

/** "2. 11." */
export const formatDayKey = (key: string) => dayShort.format(keyToDate(key));
/** "pon" */
export const formatWeekday = (key: string) => weekdayShort.format(keyToDate(key));
/** "pon, 2. 11." */
export const formatDayLong = (key: string) => dayLong.format(keyToDate(key));
/** "nov 26" */
export const formatMonthShort = (key: string) => monthShort.format(keyToDate(key)).replace(/\.$/, "");
/** "novembar 2026." */
export const formatMonthLong = (key: string) => monthLong.format(keyToDate(key));

/** "19. 7.–22. 8." */
export const formatKeyRange = (startKey: string, endKey: string) =>
  startKey === endKey ? formatDayKey(startKey) : `${formatDayKey(startKey)}–${formatDayKey(endKey)}`;

const percent = new Intl.NumberFormat("sr-RS", { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 0 });
export const formatPercent = (value: number) => (Math.abs(value) >= 10 ? (value > 0 ? "> +999%" : "< −999%") : percent.format(value));

/** Kratko za osu grafikona: "1,2k €", "850 €". */
export const formatAxisMoney = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1000) return `${sign}${(abs / 1000).toLocaleString("sr-RS", { maximumFractionDigits: 1 })}k €`;
  return `${sign}${abs.toLocaleString("sr-RS", { maximumFractionDigits: 0 })} €`;
};

export const PERIOD_LABELS: Record<DashboardPeriod, { short: string; long: string; title: string; previous: string | null }> = {
  danas: { short: "Danas", long: "Danas", title: "danas", previous: "juče" },
  "7d": { short: "7 dana", long: "7 dana", title: "poslednjih 7 dana", previous: "prethodnih 7 dana" },
  mesec: { short: "Mesec", long: "Ovaj mesec", title: "ovaj mesec", previous: "isti deo prošlog meseca" },
  prosli: { short: "Prošli", long: "Prošli mesec", title: "prošli mesec", previous: "pretprošli mesec" },
  sve: { short: "Sve", long: "Sve", title: "od početka", previous: null },
};

/** "1 narudžbina", "3 narudžbine", "5 narudžbina" */
export const pluralNarudzbina = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} narudžbina`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} narudžbine`;
  return `${count} narudžbina`;
};
