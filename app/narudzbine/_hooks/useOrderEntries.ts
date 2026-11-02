"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useMemo } from "react";
import { orderTotals } from "@/lib/calc";
import { calculateOrderRefund } from "@/lib/refund-policy";
import { resolveProfitPercent } from "../_lib/helpers";
import type { Order, OrderRefundPeriodOverview } from "@/types/order";

type UseOrderEntriesParams = {
  orders: Order[];
  refundPeriodOverview: OrderRefundPeriodOverview | undefined;
};

export function useOrderEntries({ orders, refundPeriodOverview }: UseOrderEntriesParams) {
  const orderEntries = useMemo(
    () =>
      orders.map((order) => {
        const totals = orderTotals(order);
        const refund = calculateOrderRefund({
          orderCreatedAt: order.kreiranoAt,
          totalNabavno: totals.totalNabavno,
          profit: totals.profit,
          transport: totals.transport,
          myProfitPercent: order.myProfitPercent,
          refundPeriod: refundPeriodOverview?.period,
          povratVracen: order.povratVracen,
          manualRefund100: order.manualRefund100,
        });
        const myProfitPercent = resolveProfitPercent(order.myProfitPercent);
        const myProfit = totals.profit * (myProfitPercent / 100);
        return {
          order,
          prodajnoUkupno: totals.totalProdajno,
          nabavnoUkupno: totals.totalNabavno,
          transport: totals.transport,
          myProfit,
          myProfitPercent,
          profitShare: refund.outstandingProfitForRefund,
          calculatedProfitShare: refund.profitForRefund,
          profitSharePercent: refund.profitForRefundPercent,
          povrat: refund.outstandingRefundAmount,
          calculatedPovrat: refund.refundAmount,
          isInRefundPeriod: refund.isInRefundPeriod,
          isManualRefund100: refund.isManualRefund100,
          isFullRefund100: refund.isFullRefund100,
          isExcludedBecauseReturned: refund.isExcludedBecauseReturned,
        };
      }),
    [orders, refundPeriodOverview?.period],
  );
  const visibleOrderIds = useMemo(() => orderEntries.map(({ order }) => order._id), [orderEntries]);

  return { orderEntries, visibleOrderIds };
}

