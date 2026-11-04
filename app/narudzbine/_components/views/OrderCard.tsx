"use client";

import { Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Money } from "@/components/ui/money";
import { StageBadge } from "@/components/ui/stage-badge";
import { cn } from "@/lib/utils";
import { resolveShipmentNumber } from "../../_lib/helpers";
import { formatShortDate, getOrderTitle, phoneHref } from "../../_lib/orderView";
import type { OrderEntry } from "../../_hooks/useOrderEntries";
import { OrderActionsMenu, useOpenShipment } from "../list/OrderActionsMenu";
import { OrderFlags } from "../list/OrderFlags";
import { OrderThumb } from "../list/OrderThumb";
import { useOrdersList } from "../list/OrdersListContext";

const stop = (event: React.SyntheticEvent) => event.stopPropagation();

/** Kartica narudžbine na desktopu (prikaz Kartice). */
export function OrderCard({ entry }: { entry: OrderEntry }) {
  const ctx = useOrdersList();
  const openShipment = useOpenShipment();
  const { order, prodajnoUkupno, nabavnoUkupno, transport, profitShare } = entry;
  const title = getOrderTitle(order, ctx.productMap);
  const selected = ctx.selected.has(order._id);
  const shipmentNumber = resolveShipmentNumber(order);

  return (
    <article
      data-flip-id={order._id}
      tabIndex={-1}
      aria-current={ctx.activeId === order._id ? "true" : undefined}
      onClick={() => ctx.openOrder(order._id)}
      onFocus={() => ctx.setActiveId(order._id)}
      className={cn(
        "group flex cursor-pointer flex-col rounded-2xl bg-surface ring-1 transition-colors duration-(--duration-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=true]:ring-border-strong",
        selected ? "ring-accent/50 bg-accent-soft/40" : "ring-border hover:ring-border-strong",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <label className="-ml-1.5 flex min-h-8 cursor-pointer items-center gap-2 text-xs text-text-muted" onClick={stop}>
          <input
            type="checkbox"
            checked={selected}
            disabled={ctx.selectionLocked}
            onChange={(event) => ctx.toggleSelected(order._id, event.target.checked)}
            aria-label={`Izaberi: ${title.primary}`}
            className="ml-1.5 size-4 cursor-pointer accent-accent"
          />
          <span className="num">{formatShortDate(order.kreiranoAt, ctx.now)}</span>
        </label>
        <StageBadge stage={order.stage} onChange={(stage) => ctx.onStageChange(order, stage)} />
      </div>

      <div className="flex gap-3 px-4 pt-3">
        <OrderThumb preview={ctx.getPreview(order)} size={48} />
        <div className="min-w-0 flex-1">
          <Link
            href={ctx.orderHref(order._id)}
            onClick={stop}
            tabIndex={-1}
            className="line-clamp-2 text-sm leading-5 font-medium text-text hover:underline"
            title={title.primary}
          >
            {title.primary}
          </Link>
          {title.itemCount > 1 ? (
            <p className="mt-0.5 truncate text-xs text-text-muted" title={title.secondary}>
              +{title.itemCount - 1} {title.itemCount - 1 === 1 ? "proizvod" : "proizvoda"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1 px-4 pt-2 text-[13px]">
        <span className="truncate font-medium text-text">{order.customerName || "—"}</span>
        {order.phone ? (
          <>
            <span aria-hidden className="text-text-muted">·</span>
            <a href={phoneHref(order.phone)} onClick={stop} className="num shrink-0 text-text-muted hover:text-text hover:underline">
              {order.phone}
            </a>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                void ctx.rowActions.copyText(order.phone, "Broj telefona je kopiran.");
              }}
              aria-label="Kopiraj broj telefona"
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Copy className="size-3.5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      <dl className="mx-4 mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-[13px]">
        <div className="flex flex-col">
          <dt className="text-xs text-text-muted">Prodajno</dt>
          <dd><Money value={prodajnoUkupno} trimZeroCents /></dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-text-muted">Nabavno</dt>
          <dd><Money value={nabavnoUkupno} trimZeroCents className="text-text-muted" /></dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-text-muted">Transport</dt>
          <dd><Money value={transport} trimZeroCents className="text-text-muted" /></dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-text-muted">Profit za povrat</dt>
          <dd><Money value={profitShare} tone="profit" trimZeroCents className="font-semibold" /></dd>
        </div>
      </dl>

      <div className="mt-auto flex min-h-12 items-center gap-2 px-4 pt-2 pb-2">
        <OrderFlags entry={entry} variant="pills" className="min-w-0" />
        {shipmentNumber ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openShipment(order);
            }}
            title={`${shipmentNumber}: kopiraj i otvori praćenje`}
            className="inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md font-mono text-xs text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="truncate">{shipmentNumber}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden />
          </button>
        ) : null}
        <OrderActionsMenu entry={entry} className="ml-auto" />
      </div>
    </article>
  );
}
