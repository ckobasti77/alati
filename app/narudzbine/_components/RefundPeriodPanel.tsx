"use client";

import { formatCurrency } from "@/lib/format";
import { formatRefundPeriodDate } from "../_lib/helpers";
import type { useRefundPeriod } from "../_hooks/useRefundPeriod";

type RefundPeriodPanelProps = {
  refund: ReturnType<typeof useRefundPeriod>;
};

export function RefundPeriodPanel({ refund }: RefundPeriodPanelProps) {
  const { refundPeriodOverview } = refund;
  return refundPeriodOverview &&
    (refundPeriodOverview.period || refundPeriodOverview.manualCount > 0) ? (
      <div className="grid gap-3 rounded-2xl bg-success-soft p-4 ring-1 ring-inset ring-success/25 sm:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-success">
            {refundPeriodOverview.period ? "Aktivan period 100% povrata" : "Ručno izabrani 100% povrati"}
          </p>
          <p className="mt-1 text-sm font-semibold text-text">
            {refundPeriodOverview.period
              ? `${formatRefundPeriodDate(refundPeriodOverview.period.startDate)} – ${formatRefundPeriodDate(
                  refundPeriodOverview.period.endDate,
                )}`
              : `${refundPeriodOverview.manualCount} ručno ${
                  refundPeriodOverview.manualCount === 1 ? "dodata porudžbina" : "dodatih porudžbina"
                }`}
          </p>
          {refundPeriodOverview.period && refundPeriodOverview.manualCount > 0 ? (
            <p className="mt-1 text-xs text-success">
              + {refundPeriodOverview.manualCount} ručno dodatih
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-success">Za povrat</p>
          <p className="text-lg font-bold text-text">{refundPeriodOverview.pendingCount}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-success">Već vraćeno</p>
          <p className="text-lg font-bold text-text">{refundPeriodOverview.returnedCount}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-success">Preostali iznos</p>
          <p className="text-lg font-bold text-text">
            {formatCurrency(refundPeriodOverview.pendingAmount, "EUR")}
          </p>
        </div>
      </div>
    ) : null;
}
