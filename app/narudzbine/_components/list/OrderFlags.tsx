"use client";

import { BadgePercent, CheckCheck, Clock, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderEntry } from "../../_hooks/useOrderEntries";

type Flag = { key: string; icon: LucideIcon; label: string; short: string; text: string; bg: string };

export function getOrderFlags(entry: OrderEntry): Flag[] {
  const { order, isFullRefund100, isManualRefund100, isExcludedBecauseReturned } = entry;
  const flags: Flag[] = [];
  if (order.stage === "poslato" && order.kasni) {
    flags.push({
      key: "kasni",
      icon: Clock,
      label: order.slanjeMode ? `Kasni, zovi ${order.slanjeMode}` : "Kasni sa isporukom",
      short: "Kasni",
      text: "text-warning", bg: "bg-warning-soft",
    });
  }
  if (isFullRefund100 && !isExcludedBecauseReturned) {
    flags.push({
      key: "povrat100",
      icon: BadgePercent,
      label: isManualRefund100 ? "100% povrat, ručno dodato" : "100% povrat",
      short: isManualRefund100 ? "100% ručno" : "100%",
      text: "text-success", bg: "bg-success-soft",
    });
  }
  if (order.povratVracen) {
    flags.push({
      key: "vracen",
      icon: CheckCheck,
      label: isFullRefund100 ? "Povrat je vraćen (ne računa se)" : "Povrat je vraćen",
      short: "Vraćen",
      text: "text-text-muted", bg: "bg-surface-2",
    });
  }
  if (order.pickup) {
    flags.push({ key: "licno", icon: UserRound, label: "Lično preuzimanje", short: "Lično", text: "text-text-muted", bg: "bg-surface-2" });
  }
  return flags;
}

/** Oznake narudžbine: `icons` = sitne ikonice (red tabele, kompaktna kartica), `pills` = ikonica + reč (kartice). */
export function OrderFlags({ entry, variant = "icons", className }: { entry: OrderEntry; variant?: "icons" | "pills"; className?: string }) {
  const flags = getOrderFlags(entry);
  if (flags.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center", variant === "icons" ? "gap-1" : "flex-wrap gap-1.5", className)}>
      {flags.map(({ key, icon: Icon, label, short, text, bg }) =>
        variant === "icons" ? (
          <span key={key} title={label} className={cn("inline-flex size-4 items-center justify-center", text)}>
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{label}</span>
          </span>
        ) : (
          <span key={key} title={label} className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium", text, bg)}>
            <Icon className="size-3.5" aria-hidden />
            {short}
            {short !== label ? <span className="sr-only">: {label}</span> : null}
          </span>
        ),
      )}
    </span>
  );
}
