"use client";

import { Check, Copy, ExternalLink, Phone } from "lucide-react";
import Link from "next/link";
import { IconButton } from "@/components/ui/icon-button";
import { Money } from "@/components/ui/money";
import { StageBadge } from "@/components/ui/stage-badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { resolveShipmentNumber } from "../../_lib/helpers";
import { formatRelativeDay, formatShortDate, getAddressPlace, getOrderTitle, phoneHref } from "../../_lib/orderView";
import type { OrderEntry } from "../../_hooks/useOrderEntries";
import type { useLongPress } from "../../_hooks/useLongPress";
import { OrderActionsMenu, useOpenShipment } from "../list/OrderActionsMenu";
import { OrderFlags } from "../list/OrderFlags";
import { OrderThumb } from "../list/OrderThumb";
import { useOrdersList } from "../list/OrdersListContext";

type LongPress = ReturnType<typeof useLongPress>;

/** Naslov kao "rastegnut" link (ceo red je meta), ili dugme za izbor u modu selekcije. */
function CardTarget({ entry, title, longPress, className }: { entry: OrderEntry; title: string; longPress: LongPress; className?: string }) {
  const ctx = useOrdersList();
  const { order } = entry;
  const selected = ctx.selected.has(order._id);
  const stretched = "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none";
  if (ctx.selectionMode) {
    return (
      <button
        type="button"
        data-card-target
        aria-pressed={selected}
        disabled={ctx.selectionLocked}
        onClick={() => {
          // Posle long-press-a browser pošalje i "click" kad se prst podigne; kartica je tada već u modu
          // izbora i taj klik bi odmah poništio izbor.
          if (longPress.wasRecentLongPress()) return;
          ctx.toggleSelected(order._id, !selected);
        }}
        className={cn("text-left", stretched, className)}
      >
        {title}
      </button>
    );
  }
  const { onClick: consumeClick, ...pressHandlers } = longPress.createLongPressHandlers(() => {
    navigator.vibrate?.(10);
    ctx.enterSelection(order._id);
  }, 450);
  return (
    <Link
      href={ctx.orderHref(order._id)}
      data-card-target
      {...pressHandlers}
      onClick={consumeClick}
      onContextMenu={(event) => event.preventDefault()}
      onFocus={() => ctx.setActiveId(order._id)}
      className={cn(stretched, className)}
    >
      {title}
    </Link>
  );
}

const cardShell = (selected: boolean) =>
  cn(
    "relative flex gap-3 px-4 py-3 select-none [-webkit-touch-callout:none] transition-colors duration-(--duration-fast)",
    "has-[[data-card-target]:focus-visible]:outline-2 has-[[data-card-target]:focus-visible]:-outline-offset-2 has-[[data-card-target]:focus-visible]:outline-ring",
    "active:bg-surface-2",
    selected && "bg-accent-soft",
  );

function SelectMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-2 ring-inset transition-colors",
        selected ? "bg-accent text-accent-fg ring-accent" : "ring-border-strong",
      )}
    >
      {selected ? <Check className="size-4" strokeWidth={3} /> : null}
    </span>
  );
}

/** Kompaktna kartica (~110px): naslov + status, kupac · mesto, profit · prodajno · datum, oznake. */
export function OrderCompactCard({ entry, longPress }: { entry: OrderEntry; longPress: LongPress }) {
  const ctx = useOrdersList();
  const { order, prodajnoUkupno, profitShare } = entry;
  const title = getOrderTitle(order, ctx.productMap);
  const selected = ctx.selected.has(order._id);
  const place = order.pickup ? "Lično" : getAddressPlace(order.address);
  const who = [order.customerName, place].filter(Boolean).join(" · ");

  return (
    <div data-flip-id={order._id} tabIndex={-1} className={cardShell(selected)}>
      {ctx.selectionMode ? <SelectMark selected={selected} /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <CardTarget
            entry={entry}
            longPress={longPress}
            title={title.itemCount > 1 ? `${title.primary} +${title.itemCount - 1}` : title.primary}
            className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-5 font-semibold text-text"
          />
          {ctx.selectionMode ? (
            <StageBadge stage={order.stage} className="shrink-0" />
          ) : (
            <div className="relative z-10 shrink-0">
              <StageBadge stage={order.stage} onChange={(stage) => ctx.onStageChange(order, stage)} />
            </div>
          )}
        </div>
        <p className="mt-1 truncate text-[13px] leading-[18px] text-text-muted">{who || "—"}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[13px] leading-5">
          <span className="sr-only">Profit za povrat</span>
          <Money value={profitShare} tone="profit" trimZeroCents className="text-[15px] font-semibold" />
          <span className="sr-only">, prodajno</span>
          <span aria-hidden className="text-text-muted">·</span>
          <Money value={prodajnoUkupno} trimZeroCents className="text-text-muted" />
          <span aria-hidden className="text-text-muted">·</span>
          <span className="truncate text-text-muted" title={formatShortDate(order.kreiranoAt, ctx.now)}>
            {formatRelativeDay(order.kreiranoAt, ctx.now)}
          </span>
          <OrderFlags entry={entry} className="ml-auto shrink-0 pl-1" />
        </div>
      </div>
    </div>
  );
}

/** Detaljna kartica: sve cifre, adresa, telefon, povrat, pošiljka i ⋯ (bez Obriši u kartici). */
export function OrderDetailCard({ entry, longPress }: { entry: OrderEntry; longPress: LongPress }) {
  const ctx = useOrdersList();
  const openShipment = useOpenShipment();
  const { order, prodajnoUkupno, nabavnoUkupno, transport, profitShare, povrat, isFullRefund100, isExcludedBecauseReturned } = entry;
  const title = getOrderTitle(order, ctx.productMap);
  const selected = ctx.selected.has(order._id);
  const shipmentNumber = resolveShipmentNumber(order);
  const interactive = !ctx.selectionMode;

  return (
    <div data-flip-id={order._id} tabIndex={-1} className={cardShell(selected)}>
      {ctx.selectionMode ? <SelectMark selected={selected} /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <OrderThumb preview={ctx.getPreview(order)} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <CardTarget entry={entry} longPress={longPress} title={title.primary} className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-5 font-semibold text-text" />
              <div className={cn("shrink-0", interactive && "relative z-10")}>
                <StageBadge stage={order.stage} onChange={interactive ? (stage) => ctx.onStageChange(order, stage) : undefined} />
              </div>
            </div>
            <p className="mt-1 text-[13px] text-text-muted">
              {title.itemCount > 1 ? `+${title.itemCount - 1} ${title.itemCount - 1 === 1 ? "proizvod" : "proizvoda"} · ` : ""}
              <span className="num">{formatShortDate(order.kreiranoAt, ctx.now)}</span>
            </p>
          </div>
        </div>

        <div className={cn("mt-2 flex min-h-11 items-center gap-1", interactive && "relative z-10")}>
          <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-text">{order.customerName || "—"}</p>
          {order.phone ? (
            <>
              <a
                href={phoneHref(order.phone)}
                tabIndex={interactive ? undefined : -1}
                aria-label={`Pozovi ${order.phone}`}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-[15px] text-accent-text active:bg-surface-2"
              >
                <Phone className="size-4" aria-hidden />
                <span className="num">{order.phone}</span>
              </a>
              <IconButton
                aria-label="Kopiraj broj telefona"
                tabIndex={interactive ? undefined : -1}
                className="-mr-2"
                onClick={() => void ctx.rowActions.copyText(order.phone, "Broj telefona je kopiran.")}
              >
                <Copy />
              </IconButton>
            </>
          ) : null}
        </div>
        <p className="line-clamp-2 text-[13px] leading-[18px] text-text-muted">{order.pickup ? "Lično preuzimanje" : order.address || "—"}</p>

        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-xl bg-surface-2 px-3 py-2 text-[13px] leading-5">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-text-muted">Prodajno</dt>
            <dd><Money value={prodajnoUkupno} trimZeroCents /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-text-muted">Nabavno</dt>
            <dd><Money value={nabavnoUkupno} trimZeroCents className="text-text-muted" /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-text-muted">Transport</dt>
            <dd><Money value={transport} trimZeroCents className="text-text-muted" /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="truncate text-text-muted">Profit za povrat</dt>
            <dd><Money value={profitShare} tone="profit" trimZeroCents className="font-semibold" /></dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-text-muted">Povrat</dt>
            <dd>
              <Money
                value={povrat}
                trimZeroCents
                className={cn("font-medium", isFullRefund100 && !isExcludedBecauseReturned ? "text-success" : "text-text", order.povratVracen && "line-through decoration-text-muted/60")}
              />
            </dd>
          </div>
          <div className={cn("-my-2 flex items-center justify-end", interactive && "relative z-10")}>
            <dt className="sr-only">Povrat vraćen</dt>
            <dd>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-text-muted">
                Vraćen
                <Switch
                  checked={Boolean(order.povratVracen)}
                  disabled={!interactive}
                  onCheckedChange={(checked) => void ctx.rowActions.handlePovratToggle(order, checked)}
                  aria-label={`Povrat vraćen: ${title.primary}`}
                />
              </label>
            </dd>
          </div>
        </dl>

        <div className={cn("flex items-center gap-2", interactive && "relative z-10")}>
          <OrderFlags entry={entry} variant="pills" className="min-w-0" />
          {shipmentNumber ? (
            <button
              type="button"
              tabIndex={interactive ? undefined : -1}
              onClick={() => openShipment(order)}
              className="inline-flex h-11 min-w-0 cursor-pointer items-center gap-1 font-mono text-[13px] text-accent-text"
            >
              <span className="truncate">{shipmentNumber}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </button>
          ) : null}
          {interactive ? <OrderActionsMenu entry={entry} className="ml-auto" /> : null}
        </div>
      </div>
    </div>
  );
}
