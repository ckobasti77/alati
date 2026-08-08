// waIntake/dedup.ts
// Cista dedup odluka za orders.createBatchFromWa: da li se stavka sme upisati.
// Bez Convex zavisnosti (kao lib/markPoslatoDecision) -> testira se vitest-om.
//
// Kljuc idempotentnosti je waMessageId: ponovni klik na "Povuci" + "Potvrdi"
// za istu poruku NE sme da napravi drugu narudzbinu. Mutacija za svaku stavku
// pita ovu odluku, a posle upisa dodaje id u set, pa je i duplikat UNUTAR
// istog batcha pokriven.

export type WaDedupDecision = { action: "insert" } | { action: "skip"; reason: string };

export function decideWaImport(
  waMessageId: string | undefined,
  alreadyImported: ReadonlySet<string>,
): WaDedupDecision {
  const id = waMessageId?.trim() ?? "";
  if (!id) {
    return { action: "skip", reason: "Nedostaje waMessageId — dedup nije moguc, stavka preskocena." };
  }
  if (alreadyImported.has(id)) {
    return { action: "skip", reason: "Poruka je vec uvezena (isti waMessageId)." };
  }
  return { action: "insert" };
}
