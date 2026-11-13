import type { OrderStage } from "@/types/order";

/**
 * „Za povrat“ = stage je Leglo (`legle_pare`) I povrat još nije urađen (`povratVracen` nije true).
 * Stage „Vraćeno“ nema veze sa povratom. „100% povrat“ je samo dodatna oznaka unutar ovog skupa.
 * Backend to već podržava: `stages: ["legle_pare"]` + `unreturnedOnly: true` u `orders:list`.
 */
export const ZA_POVRAT_STAGE: OrderStage = "legle_pare";

/** Lista narudžbina filtrirana na skup Za povrat (isti parametri kao Filteri: Leglo + Nije urađen). */
export const ZA_POVRAT_HREF = "/narudzbine?stage=legle_pare&unreturned=1";

export type ZaPovratOrder = { stage: OrderStage | string; povratVracen?: boolean | null };

export function isZaPovrat(order: ZaPovratOrder) {
  return order.stage === ZA_POVRAT_STAGE && order.povratVracen !== true;
}

/** Delovi filtera liste koji određuju presek sa Za povrat. */
export type ZaPovratFilterInput = { stages: readonly OrderStage[]; unreturned: boolean; returned: boolean };

/** Filter je tačno „Za povrat“. */
export function isZaPovratFilter(filters: ZaPovratFilterInput) {
  return filters.stages.length === 1 && filters.stages[0] === ZA_POVRAT_STAGE && filters.unreturned && !filters.returned;
}

/**
 * Odnos liste prema skupu Za povrat:
 * - `same`: lista je već Za povrat (iznos povrata = totals liste)
 * - `empty`: nijedna narudžbina iz liste ne može biti za povrat (iznos 0)
 * - `subset`: treba presek (isti filteri + Leglo + Nije urađen)
 */
export function zaPovratScope(filters: ZaPovratFilterInput): "same" | "empty" | "subset" {
  if (filters.returned) return "empty";
  if (filters.stages.length > 0 && !filters.stages.includes(ZA_POVRAT_STAGE)) return "empty";
  if (filters.stages.length === 1 && filters.unreturned) return "same";
  return "subset";
}

/** Argumenti `orders:list` za presek liste sa Za povrat (samo zbirovi, jedna stavka po strani). */
export function zaPovratListArgs<T extends { stages: OrderStage[]; unreturnedOnly: boolean; returnedOnly: boolean }>(listArgs: T) {
  return { ...listArgs, stages: [ZA_POVRAT_STAGE], unreturnedOnly: true, returnedOnly: false, page: 1, pageSize: 1 };
}
