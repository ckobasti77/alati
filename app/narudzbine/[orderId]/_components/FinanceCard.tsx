"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatPercent, formatRefundPeriodDate } from "../../_lib/helpers";
import { InlineField } from "./LegacyFields";
import type { OrderWithProduct } from "@/types/order";
import type { useOrderDetailData } from "../_hooks/useOrderDetailData";
import type { useOrderDetailDerived } from "../_hooks/useOrderDetailDerived";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";

type FinanceCardProps = {
  refundPeriodOverview: ReturnType<typeof useOrderDetailData>["refundPeriodOverview"];
  order: OrderWithProduct;
  isManualRefundSaving: ReturnType<typeof useOrderDetailUpdates>["isManualRefundSaving"];
  handleOrderFieldSave: ReturnType<typeof useOrderDetailUpdates>["handleOrderFieldSave"];
  handlePovratToggle: ReturnType<typeof useOrderDetailUpdates>["handlePovratToggle"];
  handleManualRefund100Toggle: ReturnType<typeof useOrderDetailUpdates>["handleManualRefund100Toggle"];
  totals: ReturnType<typeof useOrderDetailDerived>["totals"];
  prodajnoUkupno: ReturnType<typeof useOrderDetailDerived>["prodajnoUkupno"];
  nabavnoUkupno: ReturnType<typeof useOrderDetailDerived>["nabavnoUkupno"];
  transport: ReturnType<typeof useOrderDetailDerived>["transport"];
  prof: ReturnType<typeof useOrderDetailDerived>["prof"];
  myProfitPercent: ReturnType<typeof useOrderDetailDerived>["myProfitPercent"];
  myProfit: ReturnType<typeof useOrderDetailDerived>["myProfit"];
  profitShare: ReturnType<typeof useOrderDetailDerived>["profitShare"];
  calculatedProfitShare: ReturnType<typeof useOrderDetailDerived>["calculatedProfitShare"];
  profitSharePercent: ReturnType<typeof useOrderDetailDerived>["profitSharePercent"];
  povrat: ReturnType<typeof useOrderDetailDerived>["povrat"];
  calculatedPovrat: ReturnType<typeof useOrderDetailDerived>["calculatedPovrat"];
  isInRefundPeriod: ReturnType<typeof useOrderDetailDerived>["isInRefundPeriod"];
  isManualRefund100: ReturnType<typeof useOrderDetailDerived>["isManualRefund100"];
  isFullRefund100: ReturnType<typeof useOrderDetailDerived>["isFullRefund100"];
  isExcludedBecauseReturned: ReturnType<typeof useOrderDetailDerived>["isExcludedBecauseReturned"];
};

export function FinanceCard({ refundPeriodOverview, order, isManualRefundSaving, handleOrderFieldSave, handlePovratToggle, handleManualRefund100Toggle, totals, prodajnoUkupno, nabavnoUkupno, transport, prof, myProfitPercent, myProfit, profitShare, calculatedProfitShare, profitSharePercent, povrat, calculatedPovrat, isInRefundPeriod, isManualRefund100, isFullRefund100, isExcludedBecauseReturned }: FinanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finansije</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isInRefundPeriod || isManualRefund100 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Ručno uključi povrat 100%</p>
              <p className="text-xs text-slate-500">Porudžbina koristi ceo profit bez obzira na datum kreiranja.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
              <input
                type="checkbox"
                checked={Boolean(order.manualRefund100)}
                disabled={isManualRefundSaving}
                onChange={(event) => void handleManualRefund100Toggle(event.target.checked)}
                className="h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600"
              />
              {isManualRefundSaving ? "Čuvanje..." : order.manualRefund100 ? "Ručno uključeno" : "Uključi"}
            </label>
          </div>
        ) : null}
        {isFullRefund100 ? (
          <div
            className={`rounded-lg border px-3 py-2 ${
              isExcludedBecauseReturned
                ? "border-slate-200 bg-slate-50 text-slate-800"
                : "border-emerald-200 bg-emerald-50/80 text-emerald-950"
            }`}
          >
            <p className="text-sm font-semibold">
              {isExcludedBecauseReturned
                ? "Povrat je već vraćen i ne ulazi u zbir"
                : isManualRefund100
                  ? "Porudžbina je ručno uključena u 100% povrat"
                  : "Porudžbina je u periodu 100% povrata"}
            </p>
            {isInRefundPeriod && refundPeriodOverview?.period ? (
              <p className="mt-0.5 text-xs">
                Period: {formatRefundPeriodDate(refundPeriodOverview.period.startDate)} –{" "}
                {formatRefundPeriodDate(refundPeriodOverview.period.endDate)}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs">Povrat: nabavna cena + 100% ukupnog profita − transport.</p>
            {isExcludedBecauseReturned ? (
              <p className="mt-1 text-xs text-slate-500">
                Obračunati iznos je {formatCurrency(calculatedPovrat, "EUR")}, a preostalo za vraćanje 0.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ukupna kolicina</p>
            <p className="text-base font-semibold text-slate-900">{totals?.totalQty ?? order.kolicina}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Prodajno ukupno</p>
            <p className="text-base font-semibold text-slate-900">{formatCurrency(prodajnoUkupno, "EUR")}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Nabavno ukupno</p>
            <p className="text-base font-semibold text-slate-900">{formatCurrency(nabavnoUkupno, "EUR")}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Transport</p>
            <p className="text-base font-semibold text-slate-900">{formatCurrency(transport, "EUR")}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InlineField
            label="Moj procenat profita"
            value={myProfitPercent}
            formatter={(val) => formatPercent(Number(val ?? 0))}
            onSave={(val) => handleOrderFieldSave("myProfitPercent", val)}
          />
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Moj profit</p>
            <p className={`text-base font-semibold ${myProfit < 0 ? "text-red-600" : "text-slate-900"}`}>
              {formatCurrency(myProfit, "EUR")}
            </p>
            <p className="text-xs text-slate-500">Ukupno {formatCurrency(prof, "EUR")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Povrat</p>
            <p className="text-base font-semibold text-slate-900">{formatCurrency(povrat, "EUR")}</p>
            <p className="text-xs text-slate-500">
              {isFullRefund100
                ? isExcludedBecauseReturned
                  ? `Obračunati profit (100%): ${formatCurrency(calculatedProfitShare, "EUR")} — već vraćeno`
                  : `Ukupan profit (100%): ${formatCurrency(profitShare, "EUR")}`
                : `Profit (50%): ${formatCurrency(profitShare, "EUR")} (${formatPercent(profitSharePercent)})`}
            </p>
          </div>
          <div className="text-right">
            <label className="flex items-center justify-end gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(order.povratVracen)}
                onChange={(event) => handlePovratToggle(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Povrat vracen
            </label>
            {order.povratVracen ? (
              <p className="mt-1 text-xs text-slate-500">
                {order.povratVracenAt ? `Vracen ${formatDate(order.povratVracenAt)}` : "Datum nije zabelezen"}
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
