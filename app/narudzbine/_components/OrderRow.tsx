"use client";

import { ArrowUpRight, BadgePercent, Copy, GripVertical, PhoneCall, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { openTracking, resolveTrackingTarget } from "@/lib/tracking";
import { STAGE_OPTIONS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { Order, OrderStage } from "@/types/order";
import { resolveOrderShippingMode, resolveShipmentNumber, getProductDisplayName } from "../_lib/helpers";
import { StageBadge } from "./LegacyStageBadge";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";
import type { useOrderCatalog } from "../_hooks/useOrderCatalog";
import type { useOrderEntries } from "../_hooks/useOrderEntries";
import type { useOrderSelection } from "../_hooks/useOrderSelection";
import type { useOrderReorder } from "../_hooks/useOrderReorder";
import type { useOrderRowActions } from "../_hooks/useOrderRowActions";
import type { useOrderDelete } from "../_hooks/useOrderDelete";

type OrderRowProps = {
  entry: ReturnType<typeof useOrderEntries>["orderEntries"][number];
  feed: ReturnType<typeof useOrdersFeed>;
  catalog: ReturnType<typeof useOrderCatalog>;
  selection: ReturnType<typeof useOrderSelection>;
  reorder: ReturnType<typeof useOrderReorder>;
  rowActions: ReturnType<typeof useOrderRowActions>;
  orderDelete: ReturnType<typeof useOrderDelete>;
  getOrderPreviewImages: (order: Order) => { id: string; url?: string | null; alt: string }[];
  handleRowClick: (id: string) => void;
};

export function OrderRow({
  entry,
  feed,
  catalog,
  selection,
  reorder,
  rowActions,
  orderDelete,
  getOrderPreviewImages,
  handleRowClick,
}: OrderRowProps) {
  const { draggingOrderId, dragOverOrderId } = feed;
  const { productMap } = catalog;
  const { selectedOrderIds, bulkAction, toggleOrderSelection } = selection;
  const { handleOrderDragOver, handleOrderDragLeave, handleOrderDrop, handleOrderDragStart, handleOrderDragEnd } = reorder;
  const { kasniSavingId, handleKasniToggle, manualRefundSavingId, handleManualRefund100Toggle, copyText, openQuickEdit, handlePovratToggle, handleStageChange } = rowActions;
  const { openDeleteModal } = orderDelete;
  const {
    order,
    prodajnoUkupno,
    nabavnoUkupno,
    transport,
    profitShare,
    povrat,
    calculatedPovrat,
    isInRefundPeriod,
    isManualRefund100,
    isFullRefund100,
    isExcludedBecauseReturned,
  } = entry;
  const previewImages = getOrderPreviewImages(order);
  const itemNames = (order.items ?? [])
    .map((item) => {
      const product = item.productId ? productMap.get(item.productId) : undefined;
      return product ? getProductDisplayName(product) : item.title;
    })
    .filter((name) => Boolean(name && name.trim().length > 0));
  const primaryTitle = itemNames[0] ?? order.title;
  const secondaryNames = itemNames.slice(1, 3);
  const remainingCount = itemNames.length > 3 ? itemNames.length - 3 : 0;
  const shipmentNumber = resolveShipmentNumber(order);
  const showShipmentNumberInNote = shipmentNumber.length > 0;
  const isSent = order.stage === "poslato";
  const isLate = isSent && Boolean(order.kasni);

  return (
    <TableRow
      key={order._id}
      className={cn(
        "cursor-pointer transition",
        draggingOrderId === order._id ? "opacity-60" : "hover:bg-slate-50",
        dragOverOrderId === order._id && draggingOrderId !== order._id ? "bg-blue-50" : "",
        isFullRefund100 && !isExcludedBecauseReturned
          ? "refund-row refund-row--active"
          : "",
        isExcludedBecauseReturned
          ? "refund-row refund-row--complete"
          : "",
        isLate ? "order-row--late" : "",
      )}
      aria-label={
        isFullRefund100
          ? `${primaryTitle}, ${isExcludedBecauseReturned ? "povrat je već vraćen" : "obračun sa 100% profita"}`
          : undefined
      }
      onClick={() => handleRowClick(order._id)}
      onDragOver={handleOrderDragOver(order._id)}
      onDragLeave={handleOrderDragLeave(order._id)}
      onDrop={handleOrderDrop(order._id)}
    >
      <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedOrderIds.has(order._id)}
          onChange={(event) => toggleOrderSelection(order._id, event.target.checked)}
          disabled={bulkAction !== null}
          aria-label={`Označi porudžbinu ${order._id}`}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      </TableCell>
      <TableCell>
        <div
          className="flex items-center gap-2 text-sm text-slate-600 cursor-grab active:cursor-grabbing"
          draggable
          onClick={(event) => event.stopPropagation()}
          onDragStart={handleOrderDragStart(order._id)}
          onDragEnd={handleOrderDragEnd}
        >
          <GripVertical className="h-4 w-4 text-slate-400" />
          <span>{formatDate(order.kreiranoAt)}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-center gap-1">
          <StageBadge stage={order.stage} />
          <p className="text-[10px] text-slate-500">
            {order.stageChangedAt ? formatDate(order.stageChangedAt) : "Datum nije zabelezen"}
          </p>
          {isSent ? (
            <label
              className={cn(
                "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                isLate
                  ? "border-orange-300 bg-orange-100 text-orange-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700",
                kasniSavingId === order._id ? "opacity-60" : "",
              )}
              title="Označi da paket kasni sa isporukom"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={Boolean(order.kasni)}
                disabled={kasniSavingId === order._id}
                onChange={(event) => {
                  event.stopPropagation();
                  void handleKasniToggle(order, event.target.checked);
                }}
                className="h-3 w-3 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              {isLate
                ? `Kasni${order.slanjeMode ? ` · zovi ${order.slanjeMode}` : ""}`
                : "Kasni"}
            </label>
          ) : null}
          {isFullRefund100 ? (
            <span
              className={cn(
                "refund-status-badge",
                isExcludedBecauseReturned
                  ? "refund-status-badge--complete"
                  : "refund-status-badge--active",
              )}
            >
              <BadgePercent aria-hidden="true" />
              {isExcludedBecauseReturned
                ? "Već vraćeno — ne računa se"
                : isManualRefund100
                  ? "Povrat 100% · ručno"
                  : "Povrat 100%"}
            </span>
          ) : null}
          {!isInRefundPeriod || isManualRefund100 ? (
            <button
              type="button"
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                isManualRefund100
                  ? "border-slate-200 bg-white/80 text-slate-600 hover:border-red-200 hover:text-red-700"
                  : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100",
              )}
              disabled={manualRefundSavingId === order._id}
              onClick={(event) => {
                event.stopPropagation();
                void handleManualRefund100Toggle(order, !isManualRefund100);
              }}
            >
              {manualRefundSavingId === order._id
                ? "Čuvanje..."
                : isManualRefund100
                  ? "Ukloni ručno"
                  : "+ Dodaj u 100%"}
            </button>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="font-medium text-slate-700">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {previewImages.length === 0 ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                N/A
              </div>
            ) : (
              previewImages.map((image) =>
                image.url ? (
                  <div
                    key={image.id}
                    className="h-10 w-10 overflow-hidden rounded-md border-2 border-white shadow-sm"
                  >
                    <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div
                    key={image.id}
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400"
                  >
                    N/A
                  </div>
                ),
              )
            )}
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1">
              {primaryTitle}
              <ArrowUpRight className="h-4 w-4 text-slate-400" />
            </span>
            {secondaryNames.length > 0 ? (
              <p className="text-xs text-slate-500">
                {secondaryNames.join(" / ")}
                {remainingCount > 0 ? ` +${remainingCount}` : ""}
              </p>
            ) : null}
            {order.items && order.items.length > 1 ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {order.items.length} proizvoda
              </span>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-[220px]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1">
            <button
              type="button"
              className="truncate text-left font-medium text-slate-800 hover:text-blue-700"
              onClick={(event) => {
                event.stopPropagation();
                void copyText(order.customerName, "Ime je kopirano.");
              }}
              title={order.customerName}
            >
              {order.customerName}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
              onClick={(event) => {
                event.stopPropagation();
                void copyText(order._id, "Broj porudzbine je kopiran.");
              }}
              title={order._id}
            >
              ID
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-blue-50">
            <a
              href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}
              className="flex min-w-0 items-center gap-1 text-xs text-slate-500"
              onClick={(event) => event.stopPropagation()}
            >
              <PhoneCall className="h-4 w-4 text-blue-500" />
              <span className="truncate">{order.phone}</span>
            </a>
            <button
              type="button"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              onClick={(event) => {
                event.stopPropagation();
                void copyText(order.phone, "Broj telefona je kopiran.");
              }}
              title="Kopiraj broj telefona"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {order.pickup ? (
            <span className="inline-flex items-center gap-1 self-start rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
              <UserRound className="h-3.5 w-3.5" />
              Licno
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-center">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
      <TableCell className="text-center">
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-transparent px-2 py-1 font-medium text-slate-900 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          onClick={(event) => {
            event.stopPropagation();
            openQuickEdit(order, "transport");
          }}
          title="Brza izmena transporta"
        >
          {formatCurrency(transport, "EUR")}
        </button>
      </TableCell>
      <TableCell className="text-center">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
      <TableCell className="text-center font-semibold">
          <span className={profitShare < 0 ? "text-red-600" : ""}>
            {formatCurrency(profitShare, "EUR")}
          </span>
      </TableCell>
      <TableCell className="text-center">
        <div
          className={cn(
            "flex flex-col items-end gap-1",
            isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-card" : "",
          )}
        >
          <div className="flex items-center justify-end gap-2">
            <span
              className={cn(
                isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-value" : "",
              )}
            >
              {formatCurrency(povrat, "EUR")}
            </span>
            <input
              type="checkbox"
              checked={Boolean(order.povratVracen)}
              onChange={(event) => {
                event.stopPropagation();
                void handlePovratToggle(order, event.target.checked);
              }}
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          {isExcludedBecauseReturned ? (
            <p className="text-[10px] text-slate-500">
              Obračunato {formatCurrency(calculatedPovrat, "EUR")}
            </p>
          ) : null}
          {order.povratVracen ? (
            <p className="text-[10px] text-slate-500">
              {order.povratVracenAt ? formatDate(order.povratVracenAt) : "Datum nije zabelezen"}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="max-w-[180px] truncate text-sm text-slate-500">
        {showShipmentNumberInNote ? (
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-1 truncate font-mono text-blue-700 hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              void copyText(shipmentNumber, "Broj posiljke je kopiran.");
              const target = resolveTrackingTarget(shipmentNumber, resolveOrderShippingMode(order));
              if (target) openTracking(target);
            }}
            title={shipmentNumber}
          >
            {shipmentNumber}
          </button>
        ) : (
          order.napomena || "-"
        )}
      </TableCell>
      <TableCell>
        <div className="flex flex-nowrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={order.stage}
            onChange={(event) => handleStageChange(order, event.target.value as OrderStage)}
          >
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            variant="destructive"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              openDeleteModal(order);
            }}
          >
            Obrisi
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
