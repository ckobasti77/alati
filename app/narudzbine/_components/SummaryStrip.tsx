"use client";

import { BadgePercent, ChevronRight, Sigma } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderListResponse, OrderRefundPeriodOverview } from "@/types/order";
import { formatRefundPeriodDate } from "../_lib/helpers";
import { pluralOrders } from "../_lib/orderView";

const rowButton =
  "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-[13px] transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-9";

function RefundDetails({
  overview,
  showRefund100Only,
  onToggleFilter,
  onEditPeriod,
  onDone,
}: {
  overview: OrderRefundPeriodOverview;
  showRefund100Only: boolean;
  onToggleFilter: () => void;
  onEditPeriod: () => void;
  onDone: () => void;
}) {
  const rows: [string, React.ReactNode][] = [
    [
      "Period",
      overview.period
        ? `${formatRefundPeriodDate(overview.period.startDate)} – ${formatRefundPeriodDate(overview.period.endDate)}`
        : "Nije postavljen (samo ručno dodate)",
    ],
    ["Za povrat", <span key="p" className="num">{overview.pendingCount}</span>],
    ["Već vraćeno", <span key="r" className="num">{overview.returnedCount}</span>],
    ["Ručno dodatih", <span key="m" className="num">{overview.manualCount}</span>],
    ["Preostali iznos", <Money key="a" value={overview.pendingAmount} className="font-semibold text-success" />],
  ];
  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-10 items-center justify-between gap-4 text-sm">
            <dt className="text-text-muted">{label}</dt>
            <dd className="text-right text-text">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onDone();
            onEditPeriod();
          }}
        >
          Izmeni period
        </Button>
        <Button
          type="button"
          onClick={() => {
            onToggleFilter();
            onDone();
          }}
        >
          {showRefund100Only ? "Prikaži sve" : "Prikaži za povrat"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Jednoredni sažetak iznad liste: 100% povrat (ako postoji period ili ručno dodate) i mini obračun.
 * Telefon: tap otvara Sheet sa detaljima. Desktop: povrat je Popover, obračun je ceo u redu (u tabeli ga zamenjuje tfoot).
 */
export function SummaryStrip({
  isDesktop,
  showTotals,
  overview,
  totals,
  total,
  loading,
  showRefund100Only,
  onToggleRefundFilter,
  onEditRefundPeriod,
}: {
  isDesktop: boolean;
  showTotals: boolean;
  overview: OrderRefundPeriodOverview | undefined;
  totals: OrderListResponse["totals"];
  total: number;
  loading: boolean;
  showRefund100Only: boolean;
  onToggleRefundFilter: () => void;
  onEditRefundPeriod: () => void;
}) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [totalsOpen, setTotalsOpen] = useState(false);
  const hasRefund = Boolean(overview && (overview.period || overview.manualCount > 0));

  const refundLabel = overview ? (
    <>
      <BadgePercent className="size-4 shrink-0 text-success" aria-hidden />
      <span className="min-w-0 truncate">
        <span className="font-medium text-text">100% povrat</span>
        {overview.period && isDesktop ? (
          <span className="text-text-muted">
            {" "}· {formatRefundPeriodDate(overview.period.startDate)} – {formatRefundPeriodDate(overview.period.endDate)}
          </span>
        ) : null}
        <span className="text-text-muted"> · </span>
        <span className="num text-text">{overview.pendingCount}</span>
        <span className="text-text-muted"> za povrat · </span>
        <span className="num font-medium text-success">{formatCurrency(overview.pendingAmount, "EUR")}</span>
      </span>
      <ChevronRight className="ml-auto size-4 shrink-0 text-text-muted" aria-hidden />
    </>
  ) : null;

  const refundDetails =
    overview && hasRefund ? (
      <RefundDetails
        overview={overview}
        showRefund100Only={showRefund100Only}
        onToggleFilter={onToggleRefundFilter}
        onEditPeriod={onEditRefundPeriod}
        onDone={() => setRefundOpen(false)}
      />
    ) : null;

  const totalRows: [string, number, "default" | "muted" | "profit"][] = [
    ["Prodajno", totals.prodajno, "default"],
    ["Nabavno", totals.nabavno, "muted"],
    ["Transport", totals.transport, "muted"],
    ["Profit za povrat", totals.profit, "profit"],
    ["Povrat", totals.povrat, "default"],
  ];

  if (!hasRefund && !showTotals) return null;

  return (
    <div className={cn("flex flex-col gap-1", isDesktop && "gap-2")}>
      {hasRefund && overview ? (
        isDesktop ? (
          <Popover open={refundOpen} onOpenChange={setRefundOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={cn(rowButton, "bg-success-soft/60 hover:bg-success-soft")} aria-label="100% povrat, detalji">
                {refundLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" aria-label="100% povrat">
              {refundDetails}
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <button type="button" className={cn(rowButton, "-mx-1 w-[calc(100%+0.5rem)] px-1 active:bg-surface-2")} onClick={() => setRefundOpen(true)}>
              {refundLabel}
            </button>
            <Sheet open={refundOpen} onOpenChange={setRefundOpen} title="100% povrat">
              {refundDetails}
            </Sheet>
          </>
        )
      ) : null}

      {showTotals ? (
        isDesktop ? (
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 text-[13px]" aria-label="Obračun za aktivne filtere">
            <div className="flex items-center gap-1.5 text-text-muted">
              <dt className="sr-only">Broj narudžbina</dt>
              <dd className="flex items-center gap-1.5">
                <Sigma className="size-4" aria-hidden />
                <span className="num text-text">{total.toLocaleString("sr-RS")}</span> {pluralOrders(total)}
              </dd>
            </div>
            {totalRows.map(([label, value, tone]) => (
              <div key={label} className="flex items-baseline gap-1.5">
                <dt className="text-text-muted">{label}</dt>
                <dd>
                  <Money value={loading ? null : value} tone={tone} trimZeroCents className={tone === "profit" ? "font-semibold" : undefined} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <button type="button" className={cn(rowButton, "-mx-1 w-[calc(100%+0.5rem)] px-1 active:bg-surface-2")} onClick={() => setTotalsOpen(true)}>
              <Sigma className="size-4 shrink-0 text-text-muted" aria-hidden />
              <span className="min-w-0 truncate text-text-muted">
                <span className="num text-text">{total.toLocaleString("sr-RS")}</span> {pluralOrders(total)} · Profit za povrat{" "}
                <Money value={loading ? null : totals.profit} tone="profit" trimZeroCents className="font-semibold" />
              </span>
              <ChevronRight className="ml-auto size-4 shrink-0 text-text-muted" aria-hidden />
            </button>
            <Sheet open={totalsOpen} onOpenChange={setTotalsOpen} title="Obračun za filtere" description={`${total.toLocaleString("sr-RS")} ${pluralOrders(total)}`}>
              <dl className="divide-y divide-border">
                {totalRows.map(([label, value, tone]) => (
                  <div key={label} className="flex min-h-12 items-center justify-between gap-4">
                    <dt className="text-[15px] text-text-muted">{label}</dt>
                    <dd>
                      <Money value={value} tone={tone} className="text-[17px] font-semibold" />
                    </dd>
                  </div>
                ))}
              </dl>
            </Sheet>
          </>
        )
      ) : null}
    </div>
  );
}
