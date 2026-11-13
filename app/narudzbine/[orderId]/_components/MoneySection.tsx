"use client";

import { Money } from "@/components/ui/money";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderRefundPeriodOverview, OrderWithProduct } from "@/types/order";
import { formatPercent, formatRefundPeriodDate } from "../../_lib/helpers";
import type { useOrderDetailDerived } from "../_hooks/useOrderDetailDerived";
import { DetailRow, DetailSection, SectionAction } from "./DetailSection";

type MoneySectionProps = {
  order: OrderWithProduct;
  derived: ReturnType<typeof useOrderDetailDerived>;
  refundPeriodOverview: OrderRefundPeriodOverview | undefined;
  isManualRefundSaving: boolean;
  onPovratToggle: (value: boolean) => void;
  onManualRefund100Toggle: (value: boolean) => void;
  onEdit: () => void;
  aside?: boolean;
  className?: string;
};

/** Novac: prodajno, nabavno, transport, profit, povrat (tabular, desno). „Povrat urađen“ i ručni 100% su prekidači. */
export function MoneySection({ order, derived, refundPeriodOverview, isManualRefundSaving, onPovratToggle, onManualRefund100Toggle, onEdit, aside, className }: MoneySectionProps) {
  const { totals, prodajnoUkupno, nabavnoUkupno, transport, prof, myProfitPercent, myProfit, profitShare, calculatedProfitShare, profitSharePercent, povrat, calculatedPovrat, isInRefundPeriod, isManualRefund100, isFullRefund100, isExcludedBecauseReturned } = derived;
  const quantity = totals?.totalQty ?? order.kolicina;
  const refundHint = isFullRefund100
    ? isExcludedBecauseReturned
      ? `obračunato ${formatPercent(100)} profita, povrat urađen`
      : `ceo profit ${isManualRefund100 ? "(ručno 100%)" : "(period 100%)"}`
    : `profit ${formatPercent(profitSharePercent)}`;

  return (
    <DetailSection
      id="novac"
      title="Novac"
      aside={aside}
      className={className}
      action={<SectionAction label="Izmeni" ariaLabel="Izmeni transport i procenat profita" onClick={onEdit} />}
    >
      <dl className="divide-y divide-border">
        <DetailRow label={quantity > 1 ? `Prodajno · ${quantity} kom.` : "Prodajno"}>
          <Money value={prodajnoUkupno} />
        </DetailRow>
        <DetailRow label="Nabavno">
          <Money value={nabavnoUkupno} />
        </DetailRow>
        <DetailRow label="Transport">
          <Money value={transport} />
        </DetailRow>
        <DetailRow label="Profit">
          <Money value={prof} tone="profit" />
        </DetailRow>
        <DetailRow label={`Moj profit (${formatPercent(myProfitPercent)})`} emphasized>
          <Money value={myProfit} tone="profit" />
        </DetailRow>
        <DetailRow
          label="Povrat"
          hint={
            <>
              {refundHint}: <Money value={isExcludedBecauseReturned ? calculatedProfitShare : profitShare} />
            </>
          }
        >
          <Money value={povrat} />
        </DetailRow>
      </dl>

      {isFullRefund100 ? (
        <div className={cn("mt-2 rounded-xl px-3 py-2.5 text-[13px] leading-5", isExcludedBecauseReturned ? "bg-surface-2 text-text-muted" : "bg-success-soft text-text")}>
          <p className="font-medium">
            {isExcludedBecauseReturned
              ? "Povrat je urađen i ne ulazi u zbir"
              : isManualRefund100
                ? "Ručno uključena u 100% povrat"
                : "U periodu 100% povrata"}
          </p>
          {isInRefundPeriod && refundPeriodOverview?.period ? (
            <p>
              Period {formatRefundPeriodDate(refundPeriodOverview.period.startDate)} – {formatRefundPeriodDate(refundPeriodOverview.period.endDate)}
            </p>
          ) : null}
          <p>Povrat = nabavna + transport + ceo profit.</p>
          {isExcludedBecauseReturned ? (
            <p>
              Obračunato <Money value={calculatedPovrat} />, preostalo 0.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 divide-y divide-border border-t border-border">
        {order.stage === "legle_pare" || order.povratVracen ? (
          <Switch
            label="Povrat urađen"
            description={
              order.povratVracen
                ? order.povratVracenAt
                  ? `Urađen ${formatDate(order.povratVracenAt)}`
                  : "Datum nije zabeležen"
                : "Leglo, a povrat još nije urađen"
            }
            checked={Boolean(order.povratVracen)}
            onCheckedChange={(value) => onPovratToggle(value)}
          />
        ) : null}
        {!isInRefundPeriod || isManualRefund100 ? (
          <Switch
            label="Ručno u 100% povrat"
            description="Računa ceo profit bez obzira na datum."
            checked={Boolean(order.manualRefund100)}
            disabled={isManualRefundSaving}
            onCheckedChange={(value) => onManualRefund100Toggle(value)}
          />
        ) : null}
      </div>
    </DetailSection>
  );
}
