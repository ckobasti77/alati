"use client";

import { ArrowLeftRight, Copy, Phone, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { phoneHref } from "../../_lib/orderView";

type OrderActionBarProps = {
  phone: string;
  hasShipmentNumber: boolean;
  onCopyPhone: () => void;
  onStatus: () => void;
  onTrack: () => void;
};

const itemClass =
  "flex h-full min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium text-text transition-colors duration-(--duration-fast) active:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-disabled:pointer-events-none aria-disabled:opacity-40 [&_svg]:size-5";

/** Telefon: najčešće akcije na dohvat palca, iznad donje navigacije. */
export function OrderActionBar({ phone, hasShipmentNumber, onCopyPhone, onStatus, onTrack }: OrderActionBarProps) {
  const hasPhone = phone.trim().length > 0;
  return (
    <div
      role="region"
      aria-label="Brze akcije"
      data-probe-bottom-bar
      data-action-bar
      className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-(--z-sticky) border-t border-border bg-raised px-2 md:hidden"
    >
      <div className={cn("mx-auto grid h-16 max-w-md gap-1 py-1.5", hasShipmentNumber ? "grid-cols-4" : "grid-cols-3")}>
        <a href={hasPhone ? phoneHref(phone) : undefined} aria-disabled={!hasPhone || undefined} className={cn(itemClass, "text-accent-text")}>
          <Phone aria-hidden />
          Pozovi
        </a>
        <button type="button" className={itemClass} onClick={onCopyPhone} disabled={!hasPhone}>
          <Copy aria-hidden />
          Kopiraj broj
        </button>
        <button type="button" id="detail-bar-status" className={itemClass} onClick={onStatus}>
          <ArrowLeftRight aria-hidden />
          Status
        </button>
        {hasShipmentNumber ? (
          <button type="button" className={itemClass} onClick={onTrack}>
            <Truck aria-hidden />
            Prati
          </button>
        ) : null}
      </div>
    </div>
  );
}
