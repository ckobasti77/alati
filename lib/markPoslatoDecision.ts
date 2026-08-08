// markPoslatoDecision.ts
// Cista odluka da li se narudzbina sme oznaciti kao "poslato" u batch uvozu priznanica.
// Bez Convex zavisnosti -> testira se vitest-om, a convex/orders.ts (markPoslatoBatch)
// je uvozi relativno, isto kao lib/refund-policy.
//
// Redosled provera je namerni:
// 1. prazan broj -> skip (nema sta da se upise)
// 2. vec "poslato" -> skip PRE provere konflikta, da idempotentan ponovni run istog
//    batcha prijavi "vec oznacena" umesto laznog konflikta broja
// 3. stage van {aks, na_stanju} -> skip (stiglo/legle_pare/vraceno se ne vracaju nazad)
// 4. postojeci DRUGI broj posiljke -> skip (poredjenje samo po ciframa, bez laznih
//    konflikata zbog razmaka; upisuje se trimovan string kao normalizeShipmentNumber)

export type MarkPoslatoSnapshot = {
  stage: string;
  brojPosiljke?: string;
};

export type MarkPoslatoDecision =
  | { action: "update"; brojPosiljke: string }
  | { action: "skip"; reason: string };

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");

const SENDABLE_STAGES = new Set(["aks", "na_stanju"]);

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
  if (!SENDABLE_STAGES.has(order.stage)) {
    return {
      action: "skip",
      reason: `Status narudzbine (${order.stage}) ne dozvoljava oznacavanje kao poslato.`,
    };
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
