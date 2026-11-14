"use client";

import { Copy, GripVertical, Phone } from "lucide-react";
import Link from "next/link";
import type { DragEvent } from "react";
import { Money } from "@/components/ui/money";
import { StageBadge } from "@/components/ui/stage-badge";
import { cn } from "@/lib/utils";
import { resolveShipmentNumber } from "../../_lib/helpers";
import { formatShortDate, getAddressPlace, getOrderTitle, phoneHref, type OrderColumnKey, type OrdersDensity } from "../../_lib/orderView";
import type { OrderEntry } from "../../_hooks/useOrderEntries";
import { OrderActionsMenu, useOpenShipment } from "../list/OrderActionsMenu";
import { OrderFlags } from "../list/OrderFlags";
import { OrderThumb } from "../list/OrderThumb";
import { useOrdersList } from "../list/OrdersListContext";
import { PovratToggle, showsPovratToggle } from "../list/PovratToggle";

export type RowDragHandlers = {
  draggingId: string | null;
  dragOverId: string | null;
  onDragStart: (id: string) => (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDragOver: (id: string) => (event: DragEvent<HTMLTableRowElement>) => void;
  onDragLeave: (id: string) => () => void;
  onDrop: (id: string) => (event: DragEvent<HTMLTableRowElement>) => void;
};

const stop = (event: React.SyntheticEvent) => event.stopPropagation();

export function OrderTableRow({
  entry,
  columns,
  density,
  drag,
}: {
  entry: OrderEntry;
  columns: Set<OrderColumnKey>;
  density: OrdersDensity;
  drag: RowDragHandlers;
}) {
  const ctx = useOrdersList();
  const openShipment = useOpenShipment();
  const { order, prodajnoUkupno, nabavnoUkupno, transport, profitShare, povrat, calculatedPovrat, isFullRefund100, isExcludedBecauseReturned } = entry;
  const title = getOrderTitle(order, ctx.productMap);
  const preview = ctx.getPreview(order);
  const comfy = density === "udobno";
  const selected = ctx.selected.has(order._id);
  const shipmentNumber = resolveShipmentNumber(order);
  const place = order.pickup ? "Lično preuzimanje" : getAddressPlace(order.address);
  const isDragging = drag.draggingId === order._id;
  const isDragOver = drag.dragOverId === order._id && !isDragging;

  return (
    <tr
      data-flip-id={order._id}
      tabIndex={-1}
      aria-current={ctx.activeId === order._id ? "true" : undefined}
      onClick={() => ctx.openOrder(order._id)}
      onFocus={() => ctx.setActiveId(order._id)}
      onDragOver={drag.onDragOver(order._id)}
      onDragLeave={drag.onDragLeave(order._id)}
      onDrop={drag.onDrop(order._id)}
      className={cn(
        "group cursor-pointer text-[13px] transition-colors duration-(--duration-fast) [&>td]:shadow-[inset_0_-1px_0_var(--color-border)]",
        // j/k: aktivni red se ne skriva ispod sticky zaglavlja i zbira.
        "scroll-mt-[calc(var(--header-h)+3.5rem)] scroll-mb-14",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=true]:bg-surface-2",
        comfy ? "h-[88px]" : "h-16",
        selected ? "bg-accent-soft/60 hover:bg-accent-soft" : "hover:bg-surface-2",
        isDragging && "opacity-50",
        isDragOver && "bg-accent-soft",
      )}
    >
      <td className="pl-2" onClick={stop}>
        <div className="flex items-center">
          <div
            draggable
            onDragStart={drag.onDragStart(order._id)}
            onDragEnd={drag.onDragEnd}
            title="Prevuci za novi redosled"
            className="flex h-8 w-4 cursor-grab items-center justify-center text-text-muted/60 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </div>
          <label className="flex size-8 cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              checked={selected}
              disabled={ctx.selectionLocked}
              onChange={(event) => ctx.toggleSelected(order._id, event.target.checked)}
              aria-label={`Izaberi: ${title.primary}`}
              className="size-4 cursor-pointer accent-accent"
            />
          </label>
        </div>
      </td>
      <td className="px-2">
        <div className="flex flex-col items-start gap-1">
          <StageBadge stage={order.stage} onChange={(stage) => ctx.onStageChange(order, stage)} />
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="num" title={`Kreirano ${formatShortDate(order.kreiranoAt, ctx.now)}`}>
              {formatShortDate(order.kreiranoAt, ctx.now, true)}
            </span>
            <OrderFlags entry={entry} hidePovrat={columns.has("povrat") && showsPovratToggle(order)} />
          </span>
        </div>
      </td>
      <td className="px-2">
        <div className="flex min-w-0 items-center gap-3">
          <OrderThumb preview={preview} size={comfy ? 56 : 40} />
          <div className="min-w-0">
            <Link
              href={ctx.orderHref(order._id)}
              onClick={stop}
              title={title.secondary ? `${title.primary} / ${title.secondary}` : title.primary}
              className="line-clamp-2 font-medium leading-[18px] text-text hover:underline"
            >
              {title.primary}
            </Link>
            {comfy && title.secondary ? <p className="mt-0.5 truncate text-xs text-text-muted">{title.secondary}</p> : null}
          </div>
        </div>
      </td>
      {columns.has("kupac") ? (
        <td className="px-2">
          <p className="truncate font-medium text-text" title={order.customerName}>
            {order.customerName || "—"}
          </p>
          {order.phone ? (
            <div className="-ml-1 flex min-w-0 items-center gap-1">
              <a
                href={phoneHref(order.phone)}
                onClick={stop}
                title={`Pozovi ${order.phone}`}
                aria-label={`Pozovi ${order.phone}`}
                className="inline-flex min-h-6 min-w-0 items-center gap-1 rounded-md px-1 text-xs leading-5 text-accent-text transition-colors hover:bg-surface-3 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Phone className="size-3 shrink-0" aria-hidden />
                <span className="num truncate">{order.phone}</span>
              </a>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void ctx.rowActions.copyText(order.phone, "Broj telefona je kopiran.");
                }}
                title="Kopiraj broj telefona"
                aria-label={`Kopiraj broj ${order.phone}`}
                className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-muted opacity-0 transition hover:bg-surface-3 hover:text-text focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100"
              >
                <Copy className="size-3" aria-hidden />
              </button>
            </div>
          ) : null}
          {comfy && place ? <p className="mt-0.5 truncate text-xs text-text-muted">{place}</p> : null}
        </td>
      ) : null}
      {columns.has("prodajno") ? (
        <td className="px-2 text-right">
          <Money value={prodajnoUkupno} trimZeroCents />
        </td>
      ) : null}
      {columns.has("nabavno") ? (
        <td className="px-2 text-right text-text-muted">
          <Money value={nabavnoUkupno} trimZeroCents />
        </td>
      ) : null}
      {columns.has("transport") ? (
        <td className="px-2 text-right text-text-muted">
          <Money value={transport} trimZeroCents />
        </td>
      ) : null}
      {columns.has("profit") ? (
        <td className="px-2 text-right">
          <Money value={profitShare} tone="profit" trimZeroCents className="font-semibold" />
        </td>
      ) : null}
      {columns.has("povrat") ? (
        <td className="px-2 text-right" onClick={stop}>
          <label className="inline-flex cursor-pointer items-center justify-end gap-2">
            <Money
              value={povrat}
              trimZeroCents
              className={cn(isFullRefund100 && !isExcludedBecauseReturned ? "font-medium text-success" : "text-text-muted", order.povratVracen && "line-through decoration-text-muted/60")}
            />
            {showsPovratToggle(order) ? (
              <PovratToggle order={order} title={title.primary} variant="checkbox" />
            ) : (
              <span aria-hidden className="size-4" />
            )}
          </label>
          {comfy && isExcludedBecauseReturned ? (
            <p className="mt-0.5 text-[11px] text-text-muted">
              Obračunato <Money value={calculatedPovrat} trimZeroCents />
            </p>
          ) : null}
        </td>
      ) : null}
      {columns.has("posiljka") ? (
        <td className="px-2">
          {shipmentNumber ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openShipment(order);
              }}
              title={`${shipmentNumber}: kopiraj i otvori praćenje`}
              aria-label={`Pošiljka ${shipmentNumber}: kopiraj i otvori praćenje`}
              className="inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md font-mono text-xs text-accent-text underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="truncate">{shipmentNumber}</span>
            </button>
          ) : (
            <span className="text-text-muted">—</span>
          )}
        </td>
      ) : null}
      {columns.has("napomena") ? (
        <td className="px-2">
          <p className={cn("text-xs text-text-muted", comfy ? "line-clamp-3" : "line-clamp-2")} title={order.napomena || undefined}>
            {order.napomena || "—"}
          </p>
        </td>
      ) : null}
      <td className="pr-2 text-right">
        <OrderActionsMenu entry={entry} />
      </td>
    </tr>
  );
}
