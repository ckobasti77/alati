"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { orderTotals } from "@/lib/calc";
import { calculateOrderRefund } from "@/lib/refund-policy";
import { resolveShipmentNumber } from "../_lib/detailHelpers";
import { normalizeOwnerLookupKey, resolveProfitPercent } from "../../_lib/helpers";
import type { useOrderDetailData } from "./useOrderDetailData";

type UseOrderDetailDerivedParams = {
  refundPeriodOverview: ReturnType<typeof useOrderDetailData>["refundPeriodOverview"];
  shippingOwners: ReturnType<typeof useOrderDetailData>["shippingOwners"];
  order: ReturnType<typeof useOrderDetailData>["order"];
};

export function useOrderDetailDerived({ refundPeriodOverview, shippingOwners, order }: UseOrderDetailDerivedParams) {
  const totals = order ? orderTotals(order) : null;
  const prodajnoUkupno = totals?.totalProdajno ?? 0;
  const nabavnoUkupno = totals?.totalNabavno ?? 0;
  const transport = totals?.transport ?? 0;
  const prof = totals?.profit ?? 0;
  const slanjeOwnerLabel =
    order?.slanjeMode === "Posta"
      ? "Posta - na ime"
      : order?.slanjeMode
        ? "Aks/Bex - na ciji racun"
        : "Slanje - na ciji racun";
  const slanjeOwnerPlaceholder =
    order?.slanjeMode === "Posta"
      ? "Unesi na ime"
      : order?.slanjeMode
        ? "Unesi na ciji racun"
        : "Izaberi slanje prvo";
  const isAksBexMode = order?.slanjeMode === "Aks" || order?.slanjeMode === "Bex";
  const aksBexOwnerOptions = shippingOwners?.aksBexAccounts ?? [];
  const aksBexOwnerQuickOptions = aksBexOwnerOptions.slice(0, 12);
  const normalizedSlanjeOwnerLookupKey = normalizeOwnerLookupKey(order?.slanjeOwner);
  const myProfitPercent = resolveProfitPercent(order?.myProfitPercent);
  const myProfit = prof * (myProfitPercent / 100);
  const refund = order
    ? calculateOrderRefund({
        orderCreatedAt: order.kreiranoAt,
        totalNabavno: nabavnoUkupno,
        profit: prof,
        transport,
        myProfitPercent: order.myProfitPercent,
        refundPeriod: refundPeriodOverview?.period,
        povratVracen: order.povratVracen,
        manualRefund100: order.manualRefund100,
      })
    : null;
  const profitShare = refund?.outstandingProfitForRefund ?? 0;
  const calculatedProfitShare = refund?.profitForRefund ?? 0;
  const profitSharePercent = refund?.profitForRefundPercent ?? 0;
  const povrat = refund?.outstandingRefundAmount ?? 0;
  const calculatedPovrat = refund?.refundAmount ?? 0;
  const isInRefundPeriod = refund?.isInRefundPeriod ?? false;
  const isManualRefund100 = refund?.isManualRefund100 ?? false;
  const isFullRefund100 = refund?.isFullRefund100 ?? false;
  const isExcludedBecauseReturned = refund?.isExcludedBecauseReturned ?? false;
  const telHref = order ? `tel:${order.phone.replace(/[^+\d]/g, "")}` : "";
  const shipmentNumber = resolveShipmentNumber(order);
  const hasShipmentNumber = shipmentNumber.length > 0;

  return { totals, prodajnoUkupno, nabavnoUkupno, transport, prof, slanjeOwnerLabel, slanjeOwnerPlaceholder, isAksBexMode, aksBexOwnerOptions, aksBexOwnerQuickOptions, normalizedSlanjeOwnerLookupKey, myProfitPercent, myProfit, profitShare, calculatedProfitShare, profitSharePercent, povrat, calculatedPovrat, isInRefundPeriod, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, telHref, shipmentNumber, hasShipmentNumber };
}
