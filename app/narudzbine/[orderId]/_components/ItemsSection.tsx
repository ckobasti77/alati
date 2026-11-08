"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Package, Plus, Trash2 } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Money } from "@/components/ui/money";
import type { OrderItemWithProduct, OrderWithProduct } from "@/types/order";
import { DetailSection, SectionAction } from "./DetailSection";

type ItemsSectionProps = {
  order: OrderWithProduct;
  onAdd: () => void;
  onRemove: (itemId: string) => Promise<void>;
  className?: string;
};

function ItemImage({ item }: { item: OrderItemWithProduct }) {
  const images = item.product?.images ?? [];
  const main = images.find((image) => image.isMain) ?? images[0];
  return main?.url ? (
    // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL (kao i ranije)
    <img src={main.url} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-lg bg-surface-2 object-cover ring-1 ring-border" />
  ) : (
    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted ring-1 ring-border">
      <Package className="size-4" aria-hidden />
    </span>
  );
}

/** Stavke narudžbine: sličica, naziv (link na proizvod), količina × cena; uklanjanje kroz ⋯ i potvrdu. */
export function ItemsSection({ order, onAdd, onRemove, className }: ItemsSectionProps) {
  const items = order.items ?? [];
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removeTarget = items.find((item) => item.id === removeId);

  return (
    <DetailSection
      id="stavke"
      title="Stavke"
      count={items.length}
      className={className}
      action={<SectionAction label="Dodaj" ariaLabel="Dodaj stavku" icon={Plus} onClick={onAdd} />}
    >
      {items.length === 0 ? (
        <p className="py-2 text-sm text-text-muted">Narudžbina nema zasebne stavke (stari unos).</p>
      ) : (
        <ul className="-my-1 divide-y divide-border">
          {items.map((item) => {
            const menu: ActionMenuItem[] = [
              ...(item.productId ? [{ label: "Otvori proizvod", icon: ExternalLink, href: `/proizvodi/${item.productId}` }] : []),
              {
                label: "Ukloni stavku",
                icon: Trash2,
                destructive: true,
                disabled: items.length <= 1,
                separatorBefore: Boolean(item.productId),
                onSelect: () => setRemoveId(item.id),
              },
            ];
            return (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <ItemImage item={item} />
                <div className="min-w-0 flex-1">
                  {item.productId ? (
                    <Link
                      href={`/proizvodi/${item.productId}`}
                      className="relative block text-sm font-medium text-text underline-offset-4 after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="line-clamp-2">{item.title}</span>
                    </Link>
                  ) : (
                    <p className="line-clamp-2 text-sm font-medium text-text">{item.title}</p>
                  )}
                  <p className="mt-0.5 text-[13px] leading-5 text-text-muted">
                    <span className="num text-text">{item.kolicina} ×</span> <Money value={item.prodajnaCena} className="text-text" />
                    {" · "}nabavna <Money value={item.nabavnaCena} />
                    {item.manualNabavna || item.manualProdajna ? (
                      <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 py-px text-xs font-medium text-warning">
                        ručno: {[item.manualNabavna && "nabavna", item.manualProdajna && "prodajna"].filter(Boolean).join(", ")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <ActionMenu items={menu} label={`Akcije za stavku ${item.title}`} triggerClassName="-mr-2 -mt-1.5 shrink-0" />
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null);
        }}
        tone="danger"
        title="Ukloniti stavku?"
        description={removeTarget ? `${removeTarget.title} (${removeTarget.kolicina} kom.) se uklanja iz narudžbine.` : undefined}
        confirmLabel="Ukloni"
        onConfirm={async () => {
          if (!removeTarget) return;
          await onRemove(removeTarget.id);
          setRemoveId(null);
        }}
      />
    </DetailSection>
  );
}
