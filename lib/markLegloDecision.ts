// markLegloDecision.ts
// Cista odluka da li se narudzbina sme oznaciti kao "legle_pare" u batch uvozu
// AKS specifikacije. Bez Convex zavisnosti -> testira se vitest-om, a
// convex/orders.ts (markLegloBatch) je uvozi relativno, isto kao decideMarkPoslato.
//
// Za razliku od decideMarkPoslato, ovde se NE upisuje broj posiljke (vec postoji na
// narudzbini — po njemu smo je i pronasli); menja se samo stanje. Jedini skip je
// idempotencija: vec "legle_pare".

export type MarkLegloSnapshot = {
  stage: string;
};

export type MarkLegloDecision =
  | { action: "update" }
  | { action: "skip"; reason: string };

export function decideMarkLeglo(order: MarkLegloSnapshot): MarkLegloDecision {
  if (order.stage === "legle_pare") {
    return { action: "skip", reason: "Narudzbina je vec oznacena kao legle pare." };
  }
  return { action: "update" };
}
