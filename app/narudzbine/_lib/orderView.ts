import type { Order, Product } from "@/types/order";
import { getProductDisplayName } from "./helpers";

/** Imena stavki narudžbine (trenutni naziv proizvoda ako postoji, inače sačuvan naslov stavke). */
export function getOrderItemNames(order: Pick<Order, "items" | "title">, productMap: Map<string, Product>) {
  return (order.items ?? [])
    .map((item) => {
      const product = item.productId ? productMap.get(item.productId) : undefined;
      return product ? getProductDisplayName(product) : item.title;
    })
    .filter((name): name is string => Boolean(name && name.trim().length > 0));
}

export type OrderTitle = {
  /** Glavni naslov (prva stavka ili naslov narudžbine). */
  primary: string;
  /** Ostale stavke (najviše 2), spojene sa " / ". */
  secondary: string;
  /** Koliko stavki ima ukupno (za "+N proizvoda"). */
  itemCount: number;
};

export function getOrderTitle(order: Pick<Order, "items" | "title">, productMap: Map<string, Product>): OrderTitle {
  const names = getOrderItemNames(order, productMap);
  const rest = names.slice(1, 3);
  const remaining = names.length > 3 ? names.length - 3 : 0;
  return {
    primary: names[0] ?? order.title ?? "Narudžbina",
    secondary: rest.length ? `${rest.join(" / ")}${remaining > 0 ? ` +${remaining}` : ""}` : "",
    itemCount: order.items?.length ?? 1,
  };
}

/** Mesto iz adrese: poslednji deo posle zareza, bez poštanskog broja ("Kneza Miloša 12, 34000 Kragujevac" → "Kragujevac"). */
export function getAddressPlace(address?: string | null) {
  const value = (address ?? "").trim();
  if (!value) return "";
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1] : value;
  return last.replace(/^\d{5}\s+/, "").replace(/\s+\d{5}$/, "").trim() || last;
}

const dayKey = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

/** "12. 3. 2025." bez vodećih nula; godina se izostavlja kad je tekuća i `short` je true. */
export function formatShortDate(timestamp: number, now: number = Date.now(), short = false) {
  const date = new Date(timestamp);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  const base = `${date.getDate()}. ${date.getMonth() + 1}.`;
  return short && sameYear ? base : `${base} ${date.getFullYear()}.`;
}

/** Relativni datum za listu: "danas", "juče", "pre 3 dana", posle nedelju dana kratak datum. */
export function formatRelativeDay(timestamp: number, now: number = Date.now()) {
  const diff = Math.round((dayKey(new Date(now)) - dayKey(new Date(timestamp))) / 86_400_000);
  if (diff <= 0) return "danas";
  if (diff === 1) return "juče";
  if (diff < 7) return `pre ${diff} dana`;
  return formatShortDate(timestamp, now, true);
}

/** `tel:` link (samo cifre i +). */
export const phoneHref = (phone?: string | null) => `tel:${(phone ?? "").replace(/[^+\d]/g, "")}`;

// Kolone tabele koje korisnik može da sakrije. Status, naslov, izbor i ⋯ su uvek vidljivi.
export const ORDER_COLUMNS = [
  { key: "kupac", label: "Kupac", defaultVisible: true },
  { key: "prodajno", label: "Prodajno", defaultVisible: true },
  { key: "nabavno", label: "Nabavno", defaultVisible: true },
  { key: "transport", label: "Transport", defaultVisible: false },
  { key: "profit", label: "Profit za povrat", defaultVisible: true },
  { key: "povrat", label: "Povrat", defaultVisible: true },
  { key: "posiljka", label: "Pošiljka", defaultVisible: true },
  { key: "napomena", label: "Napomena", defaultVisible: false },
] as const;

export type OrderColumnKey = (typeof ORDER_COLUMNS)[number]["key"];

export const DEFAULT_ORDER_COLUMNS: OrderColumnKey[] = ORDER_COLUMNS.filter((column) => column.defaultVisible).map(
  (column) => column.key,
);

export function normalizeOrderColumns(value: unknown): OrderColumnKey[] {
  if (!Array.isArray(value)) return DEFAULT_ORDER_COLUMNS;
  const allowed = new Set<string>(ORDER_COLUMNS.map((column) => column.key));
  const picked = new Set(value.filter((entry): entry is string => typeof entry === "string" && allowed.has(entry)));
  return ORDER_COLUMNS.map((column) => column.key).filter((key) => picked.has(key));
}

// Prikaz liste: desktop Tabela/Kartice, telefon Kompaktno/Detaljno.
export const DESKTOP_VIEWS = ["tabela", "kartice"] as const;
export const PHONE_VIEWS = ["kompaktno", "detaljno"] as const;
export type DesktopView = (typeof DESKTOP_VIEWS)[number];
export type PhoneView = (typeof PHONE_VIEWS)[number];
export type OrdersListView = DesktopView | PhoneView;
export type OrdersDensity = "kompaktno" | "udobno";

const isDesktopView = (value: unknown): value is DesktopView => (DESKTOP_VIEWS as readonly unknown[]).includes(value);
const isPhoneView = (value: unknown): value is PhoneView => (PHONE_VIEWS as readonly unknown[]).includes(value);

/** URL (`?prikaz=`) ima prednost kad važi za trenutni uređaj, pa sačuvan izbor, pa podrazumevano. */
export function resolveOrdersView(input: { isDesktop: boolean; url?: string | null; stored?: string | null }): OrdersListView {
  const { isDesktop, url, stored } = input;
  if (isDesktop) {
    if (isDesktopView(url)) return url;
    if (isDesktopView(stored)) return stored;
    return "tabela";
  }
  if (isPhoneView(url)) return url;
  if (isPhoneView(stored)) return stored;
  return "kompaktno";
}

export const otherView = (view: OrdersListView): OrdersListView =>
  view === "tabela" ? "kartice" : view === "kartice" ? "tabela" : view === "kompaktno" ? "detaljno" : "kompaktno";

export const normalizeDensity = (value: unknown): OrdersDensity => (value === "udobno" ? "udobno" : "kompaktno");

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export type PeriodPreset = { key: string; label: string; from: string; to: string };

/** Brzi izbori perioda (lokalni datumi, kao filter Od/Do). */
export function getPeriodPresets(now: number = Date.now()): PeriodPreset[] {
  const today = new Date(now);
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const todayKey = toDateKey(today);
  return [
    { key: "danas", label: "Danas", from: todayKey, to: todayKey },
    { key: "7d", label: "7 dana", from: toDateKey(new Date(y, m, d - 6)), to: todayKey },
    { key: "mesec", label: "Ovaj mesec", from: toDateKey(new Date(y, m, 1)), to: todayKey },
    { key: "prosli", label: "Prošli mesec", from: toDateKey(new Date(y, m - 1, 1)), to: toDateKey(new Date(y, m, 0)) },
  ];
}

/** Kratak opis perioda za čip ("1. 3. – 31. 3.", "od 1. 3.", "do 5. 3."). */
export function formatPeriodLabel(from: string, to: string, now: number = Date.now()) {
  const parse = (key: string) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  };
  const preset = getPeriodPresets(now).find((entry) => entry.from === from && entry.to === to);
  if (preset) return preset.label;
  if (from && to) return `${formatShortDate(parse(from), now, true)} – ${formatShortDate(parse(to), now, true)}`;
  if (from) return `od ${formatShortDate(parse(from), now, true)}`;
  if (to) return `do ${formatShortDate(parse(to), now, true)}`;
  return "Period";
}

/** "1 narudžbina", "3 narudžbine", "12 narudžbina" (akuzativ: "1 narudžbinu"). */
export function pluralOrders(count: number, padez: "nominativ" | "akuzativ" = "nominativ") {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return padez === "akuzativ" ? "narudžbinu" : "narudžbina";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "narudžbine";
  return "narudžbina";
}
