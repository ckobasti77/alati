"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { STAGES } from "@/lib/stages";
import { createOrdersTablePdfFile, downloadPdfFile, sanitizePdfFileName, sharePdfFile } from "@/lib/pdfExport";
import type { Order, OrderListResponse } from "@/types/order";
import { emptyOrderListTotals } from "../_lib/types";
import { buildOrdersPdfRows } from "../_lib/helpers";
import type { useConvex } from "convex/react";
import type { OrderRefundPeriodOverview, OrderStage, Product } from "@/types/order";

type UseOrdersPdfParams = {
  convex: ReturnType<typeof useConvex>;
  search: string;
  dateFrom: string;
  dateTo: string;
  stageFilters: OrderStage[];
  showUnreturnedOnly: boolean;
  showReturnedOnly: boolean;
  showPickupOnly: boolean;
  showShippingOnly: boolean;
  showLateOnly: boolean;
  showRefund100Only: boolean;
  orderListQueryArgs: { token: string; search: string | undefined; stages: OrderStage[]; unreturnedOnly: boolean; returnedOnly: boolean; pickupOnly: boolean; shippingOnly: boolean; lateOnly: boolean; refund100Only?: true; dateFrom: number | undefined; dateTo: number | undefined; scope: "default" | "kalaba" };
  dateFilterActive: boolean;
  refundPeriodOverview: OrderRefundPeriodOverview | undefined;
  productMap: Map<string, Product>;
};

export function useOrdersPdf({ convex, search, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, showRefund100Only, orderListQueryArgs, dateFilterActive, refundPeriodOverview, productMap }: UseOrdersPdfParams) {
  const [ordersPdfMode, setOrdersPdfMode] = useState<"download" | "share" | null>(null);
  const isOrdersPdfBusy = ordersPdfMode !== null;
  const busyRef = useRef(false);
  const buildOrdersPdfSubtitle = useCallback(
    (count: number, total: number) => {
      const filters: string[] = [];
      const trimmedSearch = search.trim();
      if (trimmedSearch) filters.push(`Pretraga: ${trimmedSearch}`);
      if (stageFilters.length > 0) {
        filters.push(`Stage: ${stageFilters.map((stage) => STAGES[stage]?.label ?? stage).join(", ")}`);
      }
      if (showUnreturnedOnly) filters.push("Povrat: nepovraceni");
      if (showReturnedOnly) filters.push("Povrat: povraceno");
      if (showPickupOnly) filters.push("Preuzimanje: licno");
      if (showShippingOnly) filters.push("Preuzimanje: slanje");
      if (showLateOnly) filters.push("Isporuka: kasni");
      if (showRefund100Only) filters.push("Povrat: 100% (za povrat)");
      if (dateFilterActive) {
        filters.push(`Datum: ${dateFrom || "pocetak"} - ${dateTo || "danas"}`);
      }
      const filterText = filters.length > 0 ? filters.join(" | ") : "Bez aktivnih filtera";
      return `Izvezeno ${count} od ${total} narudzbina. ${filterText}.`;
    },
    [dateFilterActive, dateFrom, dateTo, search, showLateOnly, showPickupOnly, showRefund100Only, showShippingOnly, showReturnedOnly, showUnreturnedOnly, stageFilters],
  );

  const fetchOrdersForPdf = useCallback(async () => {
    const collected: Order[] = [];
    let totals = emptyOrderListTotals;
    let total = 0;
    let totalPages = 1;
    let nextPage = 1;

    do {
      const response = (await convex.query(api.orders.list, {
        ...orderListQueryArgs,
        page: nextPage,
        pageSize: 100,
      })) as OrderListResponse;
      collected.push(...response.items);
      totals = response.totals;
      total = response.pagination.total;
      totalPages = response.pagination.totalPages;
      nextPage += 1;
    } while (nextPage <= totalPages);

    return { orders: collected, totals, total };
  }, [convex, orderListQueryArgs]);

  const handleOrdersPdf = useCallback(
    async (mode: "download" | "share") => {
      if (busyRef.current) return;
      busyRef.current = true;
      setOrdersPdfMode(mode);
      try {
        const exportData = await fetchOrdersForPdf();
        if (exportData.orders.length === 0) {
          toast.info("Nema narudžbina za izvoz.");
          return;
        }

        const rows = buildOrdersPdfRows(exportData.orders, productMap, refundPeriodOverview?.period);
        const today = new Date().toISOString().slice(0, 10);
        const file = await createOrdersTablePdfFile({
          rows,
          totals: exportData.totals,
          fileName: `${sanitizePdfFileName(`narudzbine-${today}`)}.pdf`,
          title: "Narudzbine",
          subtitle: buildOrdersPdfSubtitle(rows.length, exportData.total),
        });

        if (mode === "share") {
          const result = await sharePdfFile(file, {
            title: "Narudžbine PDF",
            text: "Izvoz narudžbina iz tabele.",
          });
          if (result === "shared") toast.success("PDF je podeljen.");
          if (result === "downloaded") toast.info("Uređaj ne podržava deljenje PDF-a, pa je PDF preuzet.");
          return;
        }

        downloadPdfFile(file);
        toast.success("PDF je preuzet.");
      } catch (error) {
        console.error(error);
        toast.error("Izvoz PDF-a nije uspeo.");
      } finally {
        busyRef.current = false;
        setOrdersPdfMode(null);
      }
    },
    [buildOrdersPdfSubtitle, fetchOrdersForPdf, productMap, refundPeriodOverview?.period],
  );


  return { ordersPdfMode, isOrdersPdfBusy, handleOrdersPdf };
}

