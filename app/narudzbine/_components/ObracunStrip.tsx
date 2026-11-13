"use client";

import { ChevronRight } from "lucide-react";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderListResponse } from "@/types/order";
import { pluralOrders } from "../_lib/orderView";
import type { ZaPovratTotals } from "../_hooks/useZaPovratTotals";

function Tile({ label, aside, children, className }: { label: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative flex min-w-0 flex-col justify-center gap-0.5 bg-surface px-3 py-1.5 md:px-4 md:py-2.5", className)}>
      <dt className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-text-muted">{label}{aside}</dt>
      <dd className="min-w-0 truncate text-[15px] leading-5 font-semibold text-text md:text-base md:leading-6">{children}</dd>
    </div>
  );
}

const valueSkeleton = <Skeleton className="my-0.5 h-4 w-16 md:h-5" />;

/**
 * Obračun za ono što je u listi (svi filteri): Ulog · Transport · Prodajno · 50% profita · Povrat.
 * Uvek vidljiv, u svim prikazima. Povrat je samo za Leglo bez urađenog povrata (Za povrat); tap na njega
 * filtrira listu na Za povrat.
 */
export function ObracunStrip({
  totals: rawTotals,
  loading,
  unavailable = false,
  zaPovrat,
  zaPovratActive,
  onShowZaPovrat,
}: {
  totals: OrderListResponse["totals"];
  loading: boolean;
  /** Lista nije mogla da se učita: umesto nula ide „—“ (nema lažnih brojeva). */
  unavailable?: boolean;
  zaPovrat: ZaPovratTotals;
  zaPovratActive: boolean;
  onShowZaPovrat: () => void;
}) {
  const totals = unavailable ? { nabavno: null, transport: null, prodajno: null, profit: null } : rawTotals;
  const fullProfit = unavailable ? null : rawTotals.prodajno - rawTotals.nabavno - rawTotals.transport;
  const povratCount = zaPovrat.count;

  return (
    <section aria-label="Obračun za prikazane narudžbine" className="overflow-hidden rounded-2xl ring-1 ring-border">
      <dl className="grid grid-cols-3 gap-px bg-border md:grid-cols-5">
        <Tile label="Ulog">{loading ? valueSkeleton : <Money value={totals.nabavno} trimZeroCents />}</Tile>
        <Tile label="Transport">{loading ? valueSkeleton : <Money value={totals.transport} trimZeroCents />}</Tile>
        <Tile label="Prodajno">{loading ? valueSkeleton : <Money value={totals.prodajno} trimZeroCents />}</Tile>
        <Tile label="50% profita" className="col-span-2 md:col-span-1">
          {loading ? (
            valueSkeleton
          ) : (
            <span className="flex min-w-0 items-baseline gap-1.5">
              <Money value={totals.profit} tone="profit" trimZeroCents />
              {fullProfit !== null ? (
                <span className="num truncate text-xs font-normal text-text-muted" title="Ceo profit: prodajno − ulog − transport">
                  (100%: {formatCurrency(fullProfit, "EUR").replace(/,00(?=\s|$)/, "")})
                </span>
              ) : null}
            </span>
          )}
        </Tile>
        <Tile
          label="Povrat"
          className={cn(!zaPovratActive && "transition-colors duration-(--duration-fast) hover:bg-surface-2 has-[button:active]:bg-surface-2")}
          aside={
            povratCount !== null ? (
              <span className="ml-auto inline-flex items-center gap-0.5 text-text">
                <span className="num font-medium">{povratCount.toLocaleString("sr-RS")}</span>
                <span className="sr-only"> {pluralOrders(povratCount)} za povrat</span>
                {!zaPovratActive ? <ChevronRight className="size-3.5 text-text-muted" aria-hidden /> : null}
              </span>
            ) : null
          }
        >
          {zaPovrat.amount === null && !zaPovrat.error ? valueSkeleton : <Money value={zaPovrat.amount} trimZeroCents />}
          {!zaPovratActive ? (
            <button
              type="button"
              onClick={onShowZaPovrat}
              className="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="sr-only">Prikaži narudžbine za povrat</span>
            </button>
          ) : null}
        </Tile>
      </dl>
    </section>
  );
}
