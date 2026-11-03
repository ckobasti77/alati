"use client";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";

type MiniObracunProps = {
  feed: ReturnType<typeof useOrdersFeed>;
};

export function MiniObracun({ feed }: MiniObracunProps) {
  const { ordersTotals } = feed;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Mini obracun za aktivne filtere
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Nabavno</p>
          <p className="text-base font-bold text-blue-700">{formatCurrency(ordersTotals.nabavno, "EUR")}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Transport</p>
          <p className="text-base font-bold text-red-700">{formatCurrency(ordersTotals.transport, "EUR")}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Prodajno</p>
          <p className="text-base font-bold text-slate-900">{formatCurrency(ordersTotals.prodajno, "EUR")}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Profit za povrat</p>
          <p className={cn("text-base font-bold", ordersTotals.profit < 0 ? "text-red-700" : "text-emerald-700")}>
            {formatCurrency(ordersTotals.profit, "EUR")}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Povrat</p>
          <p className="text-base font-bold text-amber-700">{formatCurrency(ordersTotals.povrat, "EUR")}</p>
        </div>
      </div>
    </div>
  );
}
