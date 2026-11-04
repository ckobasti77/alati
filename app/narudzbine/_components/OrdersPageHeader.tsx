"use client";

import { Banknote, BellRing, CalendarRange, CheckSquare, Download, LayoutList, List, MessageCircle, ReceiptText, Share2 } from "lucide-react";
import { HeaderActions } from "@/components/shell/ShellProvider";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { IconButton } from "@/components/ui/icon-button";
import type { OrdersViewState } from "../_hooks/useOrdersView";

type OrdersPageHeaderProps = {
  ordersView: OrdersViewState;
  total: number;
  pdfBusy: boolean;
  pdfMode: "download" | "share" | null;
  onPdf: (mode: "download" | "share") => void;
  onEditRefundPeriod: () => void;
  onOpenRestock: () => void;
  restockCount: number;
  onStartSelection: () => void;
};

/** Desktop: H1 + broj + ⋯. Telefon: naslov je u headeru aplikacije, a prekidač prikaza i ⋯ idu u njegov slot. */
export function OrdersPageHeader({ ordersView, total, pdfBusy, pdfMode, onPdf, onEditRefundPeriod, onOpenRestock, restockCount, onStartSelection }: OrdersPageHeaderProps) {
  const items: ActionMenuItem[] = [
    ...(ordersView.isDesktop ? [] : [{ label: "Izaberi", icon: CheckSquare, onSelect: onStartSelection }]),
    {
      label: pdfMode === "download" ? "Izvoz…" : "Izvezi PDF",
      icon: Download,
      disabled: pdfBusy,
      onSelect: () => onPdf("download"),
      separatorBefore: !ordersView.isDesktop,
    },
    { label: pdfMode === "share" ? "Deljenje…" : "Podeli PDF", icon: Share2, disabled: pdfBusy, onSelect: () => onPdf("share") },
    { label: "Period 100% povrata…", icon: CalendarRange, onSelect: onEditRefundPeriod, separatorBefore: true },
    { label: restockCount > 0 ? `Zahtevi za dopunu (${restockCount})` : "Zahtevi za dopunu", icon: BellRing, onSelect: onOpenRestock },
    { label: "Uvoz priznanica", icon: ReceiptText, href: "/narudzbine/uvoz", separatorBefore: true },
    { label: "WA uvoz", icon: MessageCircle, href: "/narudzbine/wa-uvoz" },
    { label: "Legle pare", icon: Banknote, href: "/narudzbine/pare" },
  ];

  if (!ordersView.isDesktop) {
    const detailed = ordersView.view === "detaljno";
    return (
      <>
        <h1 className="sr-only">Narudžbine</h1>
        <HeaderActions>
          <IconButton
            size="lg"
            aria-label={detailed ? "Prikaz: Detaljno. Prebaci na Kompaktno" : "Prikaz: Kompaktno. Prebaci na Detaljno"}
            onClick={ordersView.toggleView}
            className="text-text"
          >
            {detailed ? <LayoutList /> : <List />}
          </IconButton>
          <ActionMenu label="Više akcija za narudžbine" items={items} triggerClassName="text-text" />
        </HeaderActions>
      </>
    );
  }

  return (
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        Narudžbine <span className="num text-base font-normal text-text-muted">{total.toLocaleString("sr-RS")}</span>
      </h1>
      <ActionMenu label="Više akcija za narudžbine" items={items} />
    </header>
  );
}
