"use client";

import { Copy, ExternalLink } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { OrderWithProduct } from "@/types/order";
import { resolveOrderShippingMode } from "../_lib/detailHelpers";
import { DetailRow, DetailSection, SectionAction } from "./DetailSection";

type ShippingSectionProps = {
  order: OrderWithProduct;
  shipmentNumber: string;
  copyText: (value: string, message: string) => Promise<boolean>;
  onTrack: () => void;
  onEdit: () => void;
  aside?: boolean;
  className?: string;
};

const modeLabel = (mode?: string) => (mode === "Posta" ? "Pošta" : mode);

/** Slanje (Pošta/Aks/Bex), račun ili ime, lično preuzimanje i broj pošiljke (kopiranje, praćenje). */
export function ShippingSection({ order, shipmentNumber, copyText, onTrack, onEdit, aside, className }: ShippingSectionProps) {
  const mode = resolveOrderShippingMode(order);
  return (
    <DetailSection
      id="slanje"
      title="Slanje i račun"
      aside={aside}
      className={className}
      action={<SectionAction label="Izmeni" ariaLabel="Izmeni slanje i račun" onClick={onEdit} />}
    >
      <dl className="divide-y divide-border">
        <DetailRow label="Slanje">{order.pickup ? "Lično preuzimanje" : (modeLabel(mode) ?? <span className="text-text-muted">Bez slanja</span>)}</DetailRow>
        {mode ? (
          <DetailRow label={mode === "Posta" ? "Na ime" : "Račun"}>
            {order.slanjeOwner ? <span className="break-words">{order.slanjeOwner}</span> : <span className="text-text-muted">—</span>}
          </DetailRow>
        ) : null}
        <div className="flex min-h-11 items-center justify-between gap-2 py-1.5">
          <dt className="text-[13px] text-text-muted">Pošiljka</dt>
          {shipmentNumber ? (
            <dd className="flex min-w-0 items-center gap-1">
              <span className="num truncate text-sm font-medium text-text">{shipmentNumber}</span>
              <IconButton aria-label="Kopiraj broj pošiljke" className="text-text-muted" onClick={() => void copyText(shipmentNumber, "Broj pošiljke je kopiran.")}>
                <Copy />
              </IconButton>
              <button
                type="button"
                onClick={onTrack}
                className="-mr-2 inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-accent-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-9"
              >
                <ExternalLink className="size-4" aria-hidden />
                Prati
              </button>
            </dd>
          ) : (
            <dd className="text-sm text-text-muted">Bez broja</dd>
          )}
        </div>
      </dl>
    </DetailSection>
  );
}
