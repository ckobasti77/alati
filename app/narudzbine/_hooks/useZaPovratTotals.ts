"use client";

import { useConvexQueryState } from "@/lib/convex";
import { zaPovratListArgs, zaPovratScope } from "@/lib/zaPovrat";
import type { OrderListResponse } from "@/types/order";
import type { OrderFilters } from "../_lib/orderFilters";
import type { useOrdersFeed } from "./useOrdersFeed";

export type ZaPovratTotals = {
  /** Iznos povrata (ulog + transport + 50% profita) samo za Leglo bez urađenog povrata u ovoj listi. */
  amount: number | null;
  count: number | null;
  error: boolean;
};

/**
 * Povrat za obračun na vrhu liste: presek prikazane liste sa skupom Za povrat. Kad je lista već Za povrat,
 * koriste se njeni zbirovi; kad presek ne može da postoji, 0. Inače jedan dodatni `orders:list` (strana 1/1).
 */
export function useZaPovratTotals({
  filters,
  listArgs,
  listTotals,
  listTotal,
  listLoading,
}: {
  filters: OrderFilters;
  listArgs: ReturnType<typeof useOrdersFeed>["orderListQueryArgs"];
  listTotals: OrderListResponse["totals"];
  listTotal: number;
  listLoading: boolean;
}): ZaPovratTotals {
  const scope = zaPovratScope(filters);
  const { data, error } = useConvexQueryState<OrderListResponse>("orders:list", scope === "subset" ? zaPovratListArgs(listArgs) : "skip");
  if (scope === "same") return { amount: listLoading ? null : listTotals.povrat, count: listLoading ? null : listTotal, error: false };
  if (scope === "empty") return { amount: 0, count: 0, error: false };
  if (error) return { amount: null, count: null, error: true };
  return { amount: data?.totals.povrat ?? null, count: data?.pagination.total ?? null, error: false };
}
