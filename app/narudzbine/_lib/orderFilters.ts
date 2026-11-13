import { orderTotals } from "@/lib/calc";
import { calculateOrderRefund, type OrderRefundPeriod } from "@/lib/refund-policy";
import { isZaPovratFilter, ZA_POVRAT_STAGE } from "@/lib/zaPovrat";
import type { Order, OrderListResponse, OrderStage } from "@/types/order";
import { normalizeStageFilters, resolveOrderSortValue } from "./helpers";

/** Filteri liste (isto značenje kao argumenti `orders:list`). */
export type OrderFilters = {
  /** Primenjena pretraga (bez razmaka na krajevima). */
  search: string;
  stages: OrderStage[];
  unreturned: boolean;
  returned: boolean;
  pickup: boolean;
  shipping: boolean;
  late: boolean;
  refund100: boolean;
  dateFrom: string;
  dateTo: string;
};

/**
 * Da li narudžbina i dalje prolazi filtere posle lokalne izmene (status, povrat, kasni, ručni 100%).
 * Ista pravila kao `orders:list`, osim pretrage i datuma: akcije iz liste ih ne menjaju.
 */
export function orderMatchesFilters(order: Order, filters: OrderFilters, refundPeriod?: OrderRefundPeriod | null) {
  if (filters.stages.length > 0 && !filters.stages.includes(order.stage)) return false;
  if (filters.returned && !order.povratVracen) return false;
  if (filters.unreturned && order.povratVracen) return false;
  if (filters.pickup && !order.pickup) return false;
  if (filters.shipping && order.pickup) return false;
  if (filters.late && !(order.kasni && order.stage === "poslato")) return false;
  if (filters.refund100) {
    const totals = orderTotals(order);
    const refund = calculateOrderRefund({
      orderCreatedAt: order.kreiranoAt,
      totalNabavno: totals.totalNabavno,
      profit: totals.profit,
      transport: totals.transport,
      myProfitPercent: order.myProfitPercent,
      refundPeriod,
      povratVracen: order.povratVracen,
      manualRefund100: order.manualRefund100,
    });
    if (!refund.isFullRefund100 || refund.isExcludedBecauseReturned) return false;
  }
  return true;
}

/** Brzi čipovi iznad liste: prečice za stage ili za skup Za povrat (Leglo + povrat nije urađen). */
export type QuickFilterKey = "poruceno" | "poslato" | "zaPovrat";

export function isQuickFilterActive(filters: OrderFilters, key: QuickFilterKey) {
  if (key === "zaPovrat") return isZaPovratFilter(filters);
  return !isZaPovratFilter(filters) && filters.stages.includes(key);
}

/**
 * Izmena filtera za tap na brzi čip. „Za povrat“ upisuje Leglo + Nije urađen (i skida ih kad je aktivan).
 * Stage čip dok je Za povrat aktivan izlazi iz Za povrat i bira samo taj stage; inače se stage-ovi sabiraju.
 */
export function applyQuickFilter(filters: OrderFilters, key: QuickFilterKey): Partial<OrderFilters> {
  const zaPovrat = isZaPovratFilter(filters);
  if (key === "zaPovrat") {
    return zaPovrat ? { stages: [], unreturned: false } : { stages: [ZA_POVRAT_STAGE], unreturned: true, returned: false };
  }
  const base = zaPovrat ? [] : filters.stages;
  const stages = base.includes(key) ? base.filter((stage) => stage !== key) : normalizeStageFilters([...base, key]);
  return zaPovrat ? { stages, unreturned: false } : { stages };
}

/** Redosled liste: kao server (sortIndex ili kreiranoAt, novije gore). */
export const compareOrders = (a: Order, b: Order) =>
  resolveOrderSortValue(b) - resolveOrderSortValue(a) || b.kreiranoAt - a.kreiranoAt;

/**
 * Spaja jednu stranu sa servera u učitanu listu. Redovi koji su u opsegu te strane, a server ih više ne
 * vraća (više ne prolaze filter ili su obrisani), izlaze iz liste; ostali se zamenjuju svežim.
 */
export function mergeListPage(prev: Order[], list: Pick<OrderListResponse, "items" | "pagination">): Order[] {
  const items = list.items ?? [];
  const isFirstPage = list.pagination.page <= 1;
  const isLastPage = list.pagination.page >= list.pagination.totalPages;
  const incoming = new Set(items.map((item) => String(item._id)));
  const sorted = [...items].sort(compareOrders);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const kept = prev.filter((order) => {
    if (incoming.has(String(order._id))) return false;
    if (!first || !last) {
      // Prazna strana: prva strana bez rezultata znači da nema ništa; kasnije strane ne diraju ostalo.
      return !isFirstPage;
    }
    const afterStart = isFirstPage || compareOrders(order, first) > 0;
    const beforeEnd = isLastPage || compareOrders(order, last) < 0;
    return !(afterStart && beforeEnd);
  });
  return [...kept, ...items].sort(compareOrders);
}
