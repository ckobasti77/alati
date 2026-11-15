"use client";

import { MapPin, Phone, UserRound } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import type { OrderWithProduct } from "@/types/order";
import { phoneHref } from "../../_lib/orderView";
import { DetailSection, SectionAction } from "./DetailSection";

type CustomerSectionProps = {
  order: OrderWithProduct;
  copyText: (value: string, message: string) => Promise<boolean>;
  onEdit: () => void;
  aside?: boolean;
  className?: string;
};

function Row({ icon: Icon, children, copyValue, copyLabel, copyMessage, copyText }: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  copyValue?: string;
  copyLabel: string;
  copyMessage: string;
  copyText: CustomerSectionProps["copyText"];
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Icon className="size-4 shrink-0 text-text-muted" aria-hidden />
      <div className="min-w-0 flex-1 break-words text-[15px] leading-[22px] text-text md:text-sm">{children}</div>
      {copyValue ? (
        <CopyButton aria-label={copyLabel} className="-mr-2 shrink-0 text-text-muted" onCopy={() => copyText(copyValue, copyMessage)} />
      ) : null}
    </div>
  );
}

/** Kupac: ime, telefon (poziv), adresa; kopiranje je pored svakog reda. */
export function CustomerSection({ order, copyText, onEdit, aside, className }: CustomerSectionProps) {
  const name = order.customerName?.trim();
  const phone = order.phone?.trim();
  const address = order.address?.trim();
  return (
    <DetailSection
      id="kupac"
      title="Kupac"
      aside={aside}
      className={className}
      action={<SectionAction label="Izmeni" ariaLabel="Izmeni kupca" onClick={onEdit} />}
    >
      <Row icon={UserRound} copyValue={name} copyLabel="Kopiraj ime" copyMessage="Ime je kopirano." copyText={copyText}>
        {name ? <span className="font-medium">{name}</span> : <span className="text-text-muted">Bez imena</span>}
      </Row>
      <Row icon={Phone} copyValue={phone} copyLabel="Kopiraj telefon" copyMessage="Broj telefona je kopiran." copyText={copyText}>
        {phone ? (
          <a href={phoneHref(phone)} className="num inline-flex min-h-11 items-center font-medium text-accent-text underline-offset-4 hover:underline md:min-h-0">
            {phone}
          </a>
        ) : (
          <span className="text-text-muted">Bez telefona</span>
        )}
      </Row>
      <Row icon={MapPin} copyValue={order.pickup ? undefined : address} copyLabel="Kopiraj adresu" copyMessage="Adresa je kopirana." copyText={copyText}>
        {order.pickup ? (
          <span className="text-text-muted">Lično preuzimanje</span>
        ) : address ? (
          address
        ) : (
          <span className="text-text-muted">Bez adrese</span>
        )}
      </Row>
    </DetailSection>
  );
}
