// markPoslatoDecision.ts
// Cista odluka da li se narudzbina sme oznaciti kao "poslato" u batch uvozu priznanica.
// Bez Convex zavisnosti -> testira se vitest-om, a convex/orders.ts (markPoslatoBatch)
// je uvozi relativno, isto kao lib/refund-policy.
//
// Redosled provera je namerni:
// 1. prazan broj -> skip (nema sta da se upise)
// 2. vec "poslato" -> skip PRE provere konflikta, da idempotentan ponovni run istog
//    batcha prijavi "vec oznacena" umesto laznog konflikta broja
// 3. postojeci DRUGI broj posiljke -> skip (poredjenje samo po ciframa, bez laznih
//    konflikata zbog razmaka; upisuje se trimovan string kao normalizeShipmentNumber)
//
// Napomena o stanjima: priznanica sme da oznaci BILO KOJU narudzbinu (bilo koje stanje,
// ukljucujuci "poruceno" i "licno") kao poslato. Jedini izuzetak je vec "poslato"
// (idempotencija). Zavrsena stanja (stiglo/legle_pare/vraceno) matcher salje na
// review sa upozorenjem, pa je covekova potvrda svesno gaziranje unazad.

export type MarkPoslatoSnapshot = {
  stage: string;
  brojPosiljke?: string;
};

export type MarkPoslatoDecision =
  | { action: "update"; brojPosiljke: string }
  | { action: "skip"; reason: string };

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");

export function decideMarkPoslato(
  order: MarkPoslatoSnapshot,
  requestedBroj: string | undefined,
): MarkPoslatoDecision {
  const trimmed = requestedBroj?.trim() ?? "";
  if (!trimmed) {
    return { action: "skip", reason: "Broj posiljke je prazan." };
  }
  if (order.stage === "poslato") {
    return { action: "skip", reason: "Narudzbina je vec oznacena kao poslato." };
  }
  const existing = digitsOnly(order.brojPosiljke);
  if (existing && existing !== digitsOnly(trimmed)) {
    return {
      action: "skip",
      reason: `Narudzbina vec ima drugi broj posiljke (${order.brojPosiljke?.trim()}).`,
    };
  }
  return { action: "update", brojPosiljke: trimmed };
}
