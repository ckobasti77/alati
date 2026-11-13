"use client";

// PDF i deljenje narudžbine (⋯ meni detalja), kopiranje broja pošiljke uz praćenje.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { createOrderDetailPdfFile, downloadPdfFile, sanitizePdfFileName, sharePdfFile } from "@/lib/pdfExport";
import { openTracking, resolveTrackingTarget } from "@/lib/tracking";
import { resolveOrderShippingMode, resolveOrderDetailPdfItems } from "../_lib/detailHelpers";
import { formatPercent } from "../../_lib/helpers";
import type { useOrderDetailData } from "./useOrderDetailData";
import type { useOrderDetailDerived } from "./useOrderDetailDerived";

type UseOrderDetailShareParams = {
  order: ReturnType<typeof useOrderDetailData>["order"];
  copyText: ReturnType<typeof useOrderDetailData>["copyText"];
  prodajnoUkupno: ReturnType<typeof useOrderDetailDerived>["prodajnoUkupno"];
  nabavnoUkupno: ReturnType<typeof useOrderDetailDerived>["nabavnoUkupno"];
  transport: ReturnType<typeof useOrderDetailDerived>["transport"];
  prof: ReturnType<typeof useOrderDetailDerived>["prof"];
  profitShare: ReturnType<typeof useOrderDetailDerived>["profitShare"];
  profitSharePercent: ReturnType<typeof useOrderDetailDerived>["profitSharePercent"];
  povrat: ReturnType<typeof useOrderDetailDerived>["povrat"];
  calculatedPovrat: ReturnType<typeof useOrderDetailDerived>["calculatedPovrat"];
  isManualRefund100: ReturnType<typeof useOrderDetailDerived>["isManualRefund100"];
  isFullRefund100: ReturnType<typeof useOrderDetailDerived>["isFullRefund100"];
  isExcludedBecauseReturned: ReturnType<typeof useOrderDetailDerived>["isExcludedBecauseReturned"];
  shipmentNumber: ReturnType<typeof useOrderDetailDerived>["shipmentNumber"];
  hasShipmentNumber: ReturnType<typeof useOrderDetailDerived>["hasShipmentNumber"];
};

export function useOrderDetailShare({ order, copyText, prodajnoUkupno, nabavnoUkupno, transport, prof, profitShare, profitSharePercent, povrat, calculatedPovrat, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, shipmentNumber, hasShipmentNumber }: UseOrderDetailShareParams) {
  const [orderPdfMode, setOrderPdfMode] = useState<"download" | "share" | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const resolveShareUrl = () => (typeof window !== "undefined" ? window.location.href : "");
  const handleCopyShareLink = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      toast.error("Link nije dostupan.");
      return;
    }
    await copyText(shareUrl, "Link je kopiran.");
  };

  const handleShareLink = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      toast.error("Link nije dostupan.");
      return;
    }
    if (!canShare || typeof navigator === "undefined") {
      toast.error("Deljenje nije podržano na ovom uređaju.");
      return;
    }
    try {
      await navigator.share({
        title: order?.title ?? "Narudzbina",
        url: shareUrl,
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error(error);
      toast.error("Deljenje nije uspelo.");
    }
  };
  const isOrderPdfBusy = orderPdfMode !== null;

  const handleOrderPdf = useCallback(
    async (mode: "download" | "share") => {
      if (!order || isOrderPdfBusy) return;
      setOrderPdfMode(mode);
      try {
        const file = await createOrderDetailPdfFile({
          fileName: `${sanitizePdfFileName(`narudzbina-${order._id}`)}.pdf`,
          orderTitle: order.title,
          createdAt: `Kreirano ${formatDate(order.kreiranoAt)}`,
          items: resolveOrderDetailPdfItems(order),
          customerName: order.customerName,
          nabavno: formatCurrency(nabavnoUkupno, "EUR"),
          transport: formatCurrency(transport, "EUR"),
          prodajno: formatCurrency(prodajnoUkupno, "EUR"),
          cleanProfit: formatCurrency(prof, "EUR"),
          refund: formatCurrency(povrat, "EUR"),
          refundProfit: formatCurrency(profitShare, "EUR"),
          refundNote: isFullRefund100
            ? isExcludedBecauseReturned
              ? `Povrat 100% - povrat uradjen (obracunato ${formatCurrency(calculatedPovrat, "EUR")})`
              : `${isManualRefund100 ? "Rucno dodat 100%" : "Period 100%"}: nabavna + ceo profit + transport`
            : `Standardni obracun (${formatPercent(profitSharePercent)})`,
        });

        if (mode === "share") {
          const result = await sharePdfFile(file, {
            title: "Narudzbina PDF",
            text: `Narudzbina: ${order.title}`,
          });
          if (result === "shared") toast.success("PDF je poslat u share.");
          if (result === "downloaded") toast.info("Uredjaj ne podrzava deljenje PDF fajla, PDF je preuzet.");
        } else {
          downloadPdfFile(file);
          toast.success("PDF je preuzet.");
        }
          } catch (error) {
        console.error(error);
        toast.error("Izvoz PDF-a nije uspeo.");
      } finally {
        setOrderPdfMode(null);
      }
    },
    [
      calculatedPovrat,
      isExcludedBecauseReturned,
      isFullRefund100,
      isManualRefund100,
      isOrderPdfBusy,
      nabavnoUkupno,
      order,
      povrat,
      prodajnoUkupno,
      prof,
      profitShare,
      profitSharePercent,
      transport,
    ],
  );

  const handleShipmentNumberCopy = useCallback(async () => {
    if (!hasShipmentNumber) return;
    const target = resolveTrackingTarget(shipmentNumber, resolveOrderShippingMode(order));
    if (target) openTracking(target);
    await copyText(shipmentNumber, "Broj pošiljke je kopiran.");
  }, [copyText, hasShipmentNumber, order, shipmentNumber]);

  return { orderPdfMode, canShare, handleCopyShareLink, handleShareLink, isOrderPdfBusy, handleOrderPdf, handleShipmentNumberCopy };
}
