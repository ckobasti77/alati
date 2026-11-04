"use client";

import {
  BadgePercent,
  Banknote,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Pencil,
  Percent,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { openTracking, resolveTrackingTarget } from "@/lib/tracking";
import type { Order } from "@/types/order";
import { resolveOrderShippingMode, resolveShipmentNumber } from "../../_lib/helpers";
import type { OrderEntry } from "../../_hooks/useOrderEntries";
import { useOrdersList } from "./OrdersListContext";

/** Kopira broj pošiljke i otvara praćenje kad postoji pouzdan cilj (isto kao ranije). */
export function useOpenShipment() {
  const { rowActions } = useOrdersList();
  return (order: Order) => {
    const shipmentNumber = resolveShipmentNumber(order);
    if (!shipmentNumber) return;
    void rowActions.copyText(shipmentNumber, "Broj pošiljke je kopiran.");
    const target = resolveTrackingTarget(shipmentNumber, resolveOrderShippingMode(order));
    if (target) openTracking(target);
  };
}

/** ⋯ meni narudžbine. Brisanje je poslednje, odvojeno i ide kroz potvrdu. */
export function OrderActionsMenu({ entry, className }: { entry: OrderEntry; className?: string }) {
  const { rowActions, onDelete, orderHref } = useOrdersList();
  const openShipment = useOpenShipment();
  const { order, isInRefundPeriod, isManualRefund100 } = entry;
  const shipmentNumber = resolveShipmentNumber(order);
  const isSent = order.stage === "poslato";

  const items: ActionMenuItem[] = [
    { label: "Izmeni", icon: Pencil, href: orderHref(order._id) },
    { label: "Transport…", icon: Truck, onSelect: () => rowActions.openQuickEdit(order, "transport"), separatorBefore: true },
    { label: "Profit %…", icon: Percent, onSelect: () => rowActions.openQuickEdit(order, "profit") },
    { label: "Kupac i telefon…", icon: UserRound, onSelect: () => rowActions.openQuickEdit(order, "contact") },
    ...(order.pickup ? [] : [{ label: "Adresa…", icon: MapPin, onSelect: () => rowActions.openQuickEdit(order, "address") }]),
    ...(isSent
      ? [
          {
            label: order.kasni ? "Ukloni oznaku kašnjenja" : "Označi da kasni",
            icon: Clock,
            disabled: rowActions.kasniSavingId === order._id,
            onSelect: () => void rowActions.handleKasniToggle(order, !order.kasni),
            separatorBefore: true,
          },
        ]
      : []),
    ...(!isInRefundPeriod || isManualRefund100
      ? [
          {
            label: isManualRefund100 ? "Ukloni iz 100% povrata" : "Dodaj u 100% povrat",
            icon: BadgePercent,
            disabled: rowActions.manualRefundSavingId === order._id,
            onSelect: () => void rowActions.handleManualRefund100Toggle(order, !isManualRefund100),
            separatorBefore: !isSent,
          },
        ]
      : []),
    {
      label: order.povratVracen ? "Poništi vraćen povrat" : "Označi povrat vraćen",
      icon: order.povratVracen ? Banknote : CheckCheck,
      onSelect: () => void rowActions.handlePovratToggle(order, !order.povratVracen),
    },
    ...(shipmentNumber ? [{ label: "Prati pošiljku", icon: ExternalLink, onSelect: () => openShipment(order), separatorBefore: true }] : []),
    {
      label: "Kopiraj telefon",
      icon: Copy,
      onSelect: () => void rowActions.copyText(order.phone, "Broj telefona je kopiran."),
      separatorBefore: !shipmentNumber,
    },
    { label: "Kopiraj ID", icon: Copy, onSelect: () => void rowActions.copyText(order._id, "ID narudžbine je kopiran.") },
    { label: "Obriši", icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => onDelete(order) },
  ];

  return (
    // Meni je u redu/kartici koja na klik otvara detalj: klikovi (i iz portala) ne idu dalje.
    <span className={className} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <ActionMenu items={items} label={`Akcije za narudžbinu ${order.customerName || ""}`.trim()} />
    </span>
  );
}
