// orderScreenshot/normalize.ts
// Čista, deterministična normalizacija sirovog model-izlaza (pravila 1-5):
// telefon, ime, adresa, pickup, cene. Bez side efekata — svaki deo testiran
// vitest-om sa izmišljenim podacima (pravi podaci kupaca ne ulaze u testove).

import { canonicalPhone } from "../receiptMatcher";
import { foldName } from "../textMatch";
import { parsePriceText } from "../waIntake/pricing";
import type { RawPrice, ScreenshotRaw } from "./types";

export type NormalizedName = { name: string; warnings: string[] };
export type NormalizedAddress = { address: string; warnings: string[] };
export type NormalizedPrices = { prodajnaCena?: number; nabavnaCena?: number; warnings: string[] };

const clean = (value: string): string => value.trim().replace(/\s+/g, " ");

// --- Pravilo 4: telefon → 06xxxxxxx (+381 6x → 06x, bez razmaka) ---
// Prihvata 9-10 cifara (06 + 7 ili 06 + 8): podnosi 1-cifrenu grešku pri čitanju
// ili unosu (npr. broj zapisan sa 9 cifara), a odbacuje gradske i prekratke.
export function normalizePhone(raw?: string): string {
  const canonical = canonicalPhone(raw); // skida 00, 381, vodeće nule
  if (/^6\d{7,8}$/.test(canonical)) return `0${canonical}`;
  return "";
}

// --- Pravilo 2: ime uvek "Ime Prezime"; "Prezime Ime" se okreće ---
// Mala lista čestih srpskih IMENA (folded, bez dijakritika) — koristi se
// samo kad model nije razdvojio ime. Intencionalno kratka: pogrešno okrenuto
// ime se i dalje vidi u draftu i čovek ga ispravi.
const FIRST_NAMES = new Set([
  "goran", "dejan", "spasoje", "dragoslav", "dragan", "dragoljub", "milan",
  "milos", "milorad", "zoran", "veljko", "srdjan", "nemanja", "nikola", "marko",
  "stefan", "aleksandar", "petar", "vuk", "laza", "ljubomir", "bogdan",
  "borislav", "vojislav", "predrag", "zeljko", "miroslav", "miodrag", "dusan",
  "zdravko", "bora", "bratislav", "slavko", "ivan", "marijan", "drago",
]);

export function normalizeName(raw: ScreenshotRaw): NormalizedName {
  const first = clean(raw.customerFirstName);
  const last = clean(raw.customerLastName);
  if (first || last) {
    return { name: clean(`${first} ${last}`), warnings: [] };
  }

  // Model nije razdvojio — heuristika na celom imenu ("Petrovic Goran" → "Goran Petrovic").
  const words = clean(raw.customerNameRaw).split(" ");
  if (words.length <= 1) return { name: words[0] ?? "", warnings: [] };

  const firstIsName = FIRST_NAMES.has(foldName(words[0]));
  const lastIsName = FIRST_NAMES.has(foldName(words[words.length - 1]));
  if (lastIsName && !firstIsName) {
    return { name: `${words[words.length - 1]} ${words.slice(0, -1).join(" ")}`, warnings: [] };
  }
  return { name: words.join(" "), warnings: [] };
}

// --- Pravilo 3: ulica i broj, PTT, mesto; "22323Novi slankamen" se razdvaja ---
const GLUED_POSTAL = /(\d{5})(?=[A-Za-zČćŠšŽđ])/; // 5 cifara lepljeno za slovo
const STANDALONE_POSTAL = /(^|\s)(\d{5})(?=\s|$)/; // 5 cifara kao zaseban token

export function normalizeAddress(raw: ScreenshotRaw): NormalizedAddress {
  const warnings: string[] = [];
  let street = clean(raw.street);
  let postal = clean(raw.postalCode).replace(/\D/g, "");
  let city = clean(raw.city);

  // Model je polja ostavio prazna i sve napisao u addressRaw
  // ("22323Novi slankamen" ili "Bulevar oslobođenja 10, 21000 Novi Sad").
  if ((!street || !postal || !city) && clean(raw.addressRaw)) {
    const addressRaw = clean(raw.addressRaw);
    const glued = addressRaw.match(GLUED_POSTAL);
    const standalone = glued ? null : addressRaw.match(STANDALONE_POSTAL);
    const match = glued ?? standalone;
    if (match) {
      const digits = glued ? match[1] : match[2];
      const pos = addressRaw.search(digits);
      postal = digits;
      if (!city) {
        const after = addressRaw.slice(pos + digits.length).replace(/^[,;\s]+/, "");
        if (after) city = after;
      }
      if (!street) {
        const before = addressRaw.slice(0, pos).replace(/[,;\s]+$/, "");
        if (before) street = before;
      }
    }
  }

  if (!street) warnings.push("Ulica i broj nisu pročitani sa slike — proveri ručno.");
  if (!postal) warnings.push("Poštanski broj nije bio na slici — ne unositi, proveri ručno.");

  const parts: string[] = [];
  if (street) parts.push(street);
  const place = [postal, city].filter(Boolean).join(" ");
  if (place) parts.push(place);
  return { address: parts.join(", "), warnings };
}

// --- Pravilo 1: samo telefon bez adrese → lično preuzimanje; eksplicitno "lično" uvek ---
export function decidePickup(raw: ScreenshotRaw, hasAddress: boolean, hasPhone: boolean): boolean {
  if (raw.pickupExplicit) return true;
  if (hasPhone && !hasAddress) return true;
  return false;
}

// --- Pravilo 5: jedan broj = prodajna; "80-130€" = nabavna 80 + prodajna 130 ---
function parseRange(raw: string): { nabavna: number; prodajna: number } | null {
  const digits = raw.replace(/[^0-9-]/g, "");
  if (!digits.includes("-")) return null;
  const parts = digits.split("-").filter((p) => p.length >= 2);
  if (parts.length !== 2) return null;
  const [a, b] = parts.map((p) => Number.parseInt(p, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 10 || b < 10) return null;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return { nabavna: lo, prodajna: hi };
}

export function normalizePrices(prices: RawPrice[]): NormalizedPrices {
  const warnings: string[] = [];
  let prodajnaCena: number | undefined;
  let nabavnaCena: number | undefined;

  for (const price of prices) {
    const range = parseRange(price.raw);
    if (range) {
      nabavnaCena ??= range.nabavna;
      prodajnaCena ??= range.prodajna;
      continue;
    }
    const value = parsePriceText(price.value);
    if (value === undefined) continue;
    if (price.role === "nabavna") {
      nabavnaCena ??= value;
    } else {
      // "prodajna" i "unknown": jedan broj uz proizvod = prodajna (pravilo 5)
      prodajnaCena ??= value;
    }
  }

  if (prodajnaCena === undefined && nabavnaCena === undefined) {
    warnings.push("Cena nije pročitana sa slike — unesi ručno.");
  }
  return { prodajnaCena, nabavnaCena, warnings };
}
