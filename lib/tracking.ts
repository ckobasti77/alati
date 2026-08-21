// Resolvanje linka za pracenje posiljke na osnovu broja i kurira.
// Broj se prosledjuje ciljnom sajtu kroz #hash (npr. #alatiTrack=123),
// odakle ga cita browser ekstenzija i upisuje u input za pracenje.

export type TrackingCarrier = "aks" | "posta";

export interface TrackingTarget {
  carrier: TrackingCarrier;
  url: string;
}

const AKS_BASE = "https://www.aks.rs/pracenje-posiljke/";
const POSTA_BASE = "https://posta.rs/cir/alati/pracenje-posiljke.aspx";

/** Kljuc u #hash delu URL-a koji ekstenzija cita. */
export const TRACK_HASH_KEY = "alatiTrack";

const isDigitsOnly = (value: string) => /^\d+$/.test(value);
const isPostaPx = (value: string) => /^PX.*RS$/i.test(value);

/**
 * Odredjuje gde klik na broj posiljke treba da vodi.
 * Vraca null kada nema pouzdanog cilja (tada se samo kopira broj).
 *
 * Prioritet:
 *  1. Broj oblika PX...RS  -> uvek Posta (nadjacava kolonu).
 *  2. Kurir u koloni Bex   -> null (samo kopiraj).
 *  3. Broj samo cifre      -> AKS.
 *  4. Prati kolonu: Aks -> AKS, Posta -> Posta.
 *  5. Sve ostalo           -> null.
 */
export function resolveTrackingTarget(
  rawNumber: string | undefined,
  carrierMode: "Posta" | "Aks" | "Bex" | undefined,
): TrackingTarget | null {
  const num = (rawNumber ?? "").trim();
  if (!num) return null;

  if (isPostaPx(num)) return buildTarget("posta", num);
  if (carrierMode === "Bex") return null;
  if (isDigitsOnly(num)) return buildTarget("aks", num);
  if (carrierMode === "Aks") return buildTarget("aks", num);
  if (carrierMode === "Posta") return buildTarget("posta", num);
  return null;
}

function buildTarget(carrier: TrackingCarrier, num: string): TrackingTarget {
  const base = carrier === "aks" ? AKS_BASE : POSTA_BASE;
  return { carrier, url: `${base}#${TRACK_HASH_KEY}=${encodeURIComponent(num)}` };
}

/** Otvara link za pracenje u novom tabu (poziva se iz onClick user gesture-a). */
export function openTracking(target: TrackingTarget): void {
  window.open(target.url, "_blank", "noopener");
}
