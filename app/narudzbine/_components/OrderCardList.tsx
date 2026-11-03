"use client";

import { ArrowUpRight, BadgePercent, Copy, PhoneCall, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { openTracking, resolveTrackingTarget } from "@/lib/tracking";
import { STAGE_OPTIONS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { Order, OrderStage } from "@/types/order";
import { resolveOrderShippingMode, resolveShipmentNumber, getProductDisplayName } from "../_lib/helpers";
import { StageBadge } from "./LegacyStageBadge";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";
import type { useOrderEntries } from "../_hooks/useOrderEntries";
import type { useOrderCatalog } from "../_hooks/useOrderCatalog";
import type { useOrderSelection } from "../_hooks/useOrderSelection";
import type { useLongPress } from "../_hooks/useLongPress";
import type { useOrderRowActions } from "../_hooks/useOrderRowActions";
import type { useOrderDelete } from "../_hooks/useOrderDelete";

type OrderCardListProps = {
  feed: ReturnType<typeof useOrdersFeed>;
  entries: ReturnType<typeof useOrderEntries>;
  catalog: ReturnType<typeof useOrderCatalog>;
  selection: ReturnType<typeof useOrderSelection>;
  longPress: ReturnType<typeof useLongPress>;
  rowActions: ReturnType<typeof useOrderRowActions>;
  orderDelete: ReturnType<typeof useOrderDelete>;
  getOrderPreviewImages: (order: Order) => { id: string; url?: string | null; alt: string }[];
  handleRowClick: (id: string) => void;
};

export function OrderCardList({
  feed,
  entries,
  catalog,
  selection,
  longPress,
  rowActions,
  orderDelete,
  getOrderPreviewImages,
  handleRowClick,
}: OrderCardListProps) {
  const { draggingOrderId, isOrdersLoading } = feed;
  const { orderEntries } = entries;
  const { productMap } = catalog;
  const { bulkAction, selectedOrderIds, toggleOrderSelection } = selection;
  const { consumeLongPressClick, createLongPressHandlers } = longPress;
  const { copyText, handleManualRefund100Toggle, handlePovratToggle, handleStageChange, manualRefundSavingId, openQuickEdit } = rowActions;
  const { openDeleteModal } = orderDelete;
  return (
    <div className="space-y-3 md:hidden">
      {isOrdersLoading ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
          Ucitavanje...
        </div>
      ) : orderEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
          Jos nema narudzbina.
        </div>
      ) : (
        orderEntries.map(({
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
        }) => {
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

            return (
              <div
                key={order._id}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition",
                  draggingOrderId === order._id ? "opacity-60" : "hover:border-blue-200",
                  isFullRefund100 && !isExcludedBecauseReturned
                    ? "refund-card refund-card--active"
                    : "",
                  isExcludedBecauseReturned
                    ? "refund-card refund-card--complete"
                    : "",
                )}
                onClick={() => handleRowClick(order._id)}
                aria-label={
                  isFullRefund100
                    ? `${primaryTitle}, ${isExcludedBecauseReturned ? "povrat je već vraćen" : "obračun sa 100% profita"}`
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <label
                    className="flex items-center gap-2 text-xs text-slate-500"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order._id)}
                      onChange={(event) => toggleOrderSelection(order._id, event.target.checked)}
                      disabled={bulkAction !== null}
                      aria-label={`Označi porudžbinu ${order._id}`}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {formatDate(order.kreiranoAt)}
                  </label>
                  <div className="flex flex-col items-end gap-1">
                    <StageBadge stage={order.stage} />
                    <p className="text-[10px] text-slate-500">
                      {order.stageChangedAt ? `Status: ${formatDate(order.stageChangedAt)}` : "Datum nije zabelezen"}
                    </p>
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
                </div>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex flex-wrap gap-1">
                    {previewImages.length === 0 ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                        N/A
                      </div>
                    ) : (
                      previewImages.slice(0, 3).map((image) =>
                        image.url ? (
                          <div
                            key={image.id}
                            className="h-12 w-12 overflow-hidden rounded-md border-2 border-white shadow-sm"
                          >
                            <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div
                            key={image.id}
                            className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400"
                          >
                            N/A
                          </div>
                        ),
                      )
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                      <span className="truncate">{primaryTitle}</span>
                      <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    </div>
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
                <div
                  className="mt-3 flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  {...createLongPressHandlers(() => openQuickEdit(order, "contact"))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="truncate text-left font-medium text-slate-800 hover:text-blue-700"
                      onClick={(event) => {
                        if (consumeLongPressClick(event)) return;
                        event.stopPropagation();
                        void copyText(order.customerName, "Ime je kopirano.");
                      }}
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
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <a
                      href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-blue-50"
                      onClick={(event) => {
                        if (consumeLongPressClick(event)) return;
                        event.stopPropagation();
                      }}
                    >
                      <PhoneCall className="h-4 w-4 text-blue-500" />
                      {order.phone}
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
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Nabavno</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(nabavnoUkupno, "EUR")}
                    </p>
                  </div>
                  <div
                    className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1"
                    {...createLongPressHandlers(() => openQuickEdit(order, "transport"))}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Transport</p>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(transport, "EUR")}</p>
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Prodajno</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(prodajnoUkupno, "EUR")}
                    </p>
                  </div>
                  <div
                    className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1"
                    {...createLongPressHandlers(() => openQuickEdit(order, "profit"))}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Profit za povrat</p>
                    <p className={`text-sm font-semibold ${profitShare < 0 ? "text-red-600" : "text-slate-900"}`}>
                      {formatCurrency(profitShare, "EUR")}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2",
                    isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-card" : "",
                  )}
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Povrat</p>
                    <p
                      className={cn(
                        "text-sm font-semibold text-slate-900",
                        isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-value" : "",
                      )}
                    >
                      {formatCurrency(povrat, "EUR")}
                    </p>
                    {isExcludedBecauseReturned ? (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Obračunato {formatCurrency(calculatedPovrat, "EUR")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <label className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-600">
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
                      Vracen
                    </label>
                    {order.povratVracen ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {order.povratVracenAt ? `Vracen: ${formatDate(order.povratVracenAt)}` : "Datum nije zabelezen"}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div
                  className="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-500"
                  {...createLongPressHandlers(() => openQuickEdit(order, "address"))}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Adresa</p>
                  <p className="mt-1 line-clamp-2">{order.address || "-"}</p>
                </div>
                {showShipmentNumberInNote ? (
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs text-blue-700"
                    title="Kopiraj + otvori pracenje"
                    onClick={(event) => {
                      event.stopPropagation();
                      void copyText(shipmentNumber, "Broj posiljke je kopiran.");
                      const target = resolveTrackingTarget(shipmentNumber, resolveOrderShippingMode(order));
                      if (target) openTracking(target);
                    }}
                  >
                    <span className="font-semibold uppercase tracking-wide">Broj porudzbine</span>
                    <span className="font-mono text-sm">{shipmentNumber}</span>
                  </button>
                ) : null}
                <div
                  className="mt-3 flex flex-wrap items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
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
              </div>
            );
          },
        )
      )}
    </div>
  );
}
