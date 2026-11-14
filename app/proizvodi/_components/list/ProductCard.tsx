import Link from "next/link";
import { Archive, Check, Layers, MapPin, Package } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Money } from "@/components/ui/money";
import type { Product } from "@/types/order";
import { cn } from "@/lib/utils";
import { productFlags, productHref, productPublishMarks, type ProductListApi } from "./productListApi";

export function ProductImage({ url, className }: { url?: string; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL (kao i ranije)
    <img src={url} alt="" loading="lazy" decoding="async" className={`size-full bg-surface-2 object-cover ${className ?? ""}`} />
  ) : (
    <span className={`flex size-full items-center justify-center bg-surface-2 text-text-muted ${className ?? ""}`}>
      <Package className="size-6" aria-hidden />
    </span>
  );
}

/** Oznake ispod cene: Tipski, Lično, Arhiva (ikonica + reč, nikad samo boja). */
export function ProductTags({ product, className }: { product: Product; className?: string }) {
  const { isVariant, isPickup, isArchived } = productFlags(product);
  if (!isVariant && !isPickup && !isArchived) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className ?? ""}`}>
      {isVariant ? (
        <span className="inline-flex items-center gap-1">
          <Layers className="size-3.5" aria-hidden />
          Tipski
        </span>
      ) : null}
      {isPickup ? (
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          Lično
        </span>
      ) : null}
      {isArchived ? (
        <span className="inline-flex items-center gap-1 text-warning">
          <Archive className="size-3.5" aria-hidden />
          Arhiva
        </span>
      ) : null}
    </span>
  );
}

/**
 * Kartica proizvoda (mreža na telefonu i desktopu): kvadratna slika bez ičega preko, ispod naziv, prodajna,
 * nabavna i Prodato. Ceo element je link (rastegnut `after:inset-0`), ⋯ je iznad njega.
 */
export function ProductCard({ product, api }: { product: Product; api: ProductListApi }) {
  const name = api.getName(product);
  const purchase = api.getPurchase(product);
  const sold = api.getSold(product);
  return (
    <li data-flip-id={product._id} className="group relative flex flex-col rounded-2xl bg-surface p-2 ring-1 ring-border transition-colors duration-(--duration-fast) hover:bg-surface-2">
      <div className="aspect-square overflow-hidden rounded-xl ring-1 ring-border">
        <ProductImage url={api.getImageUrl(product)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-1 pt-2">
        <h3 className="min-h-9 text-sm leading-[18px] font-medium text-text">
          <Link
            href={productHref(product)}
            className="line-clamp-2 outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {name}
          </Link>
        </h3>
        <div className="mt-1 flex items-center justify-between gap-1">
          <Money value={api.getPrice(product)} className="text-base font-semibold text-text" />
          <ActionMenu items={api.menuFor(product)} label={`Akcije za ${name}`} triggerClassName="relative z-(--z-raised) -my-2.5 -mr-2 text-text-muted" />
        </div>
        <p className="truncate text-xs text-text-muted">
          nab. <Money value={purchase.price} />
          {purchase.supplierName ? ` · ${purchase.supplierName}` : ""}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span className="num">Prodato {sold}</span>
          <ProductTags product={product} />
        </p>
      </div>
    </li>
  );
}

/**
 * Ista kartica kao u mreži /proizvodi, ali za izbor (npr. /objave): dugme sa `aria-pressed`, bez menija.
 * Ispod cene su oznake objave (KP, FB, IG), da se vidi gde je proizvod već objavljen.
 */
export function ProductPickCard({
  product,
  name,
  price,
  imageUrl,
  selected,
  onSelect,
}: {
  product: Product;
  name: string;
  price: number | undefined;
  imageUrl?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const marks = productPublishMarks(product).filter((mark) => mark.active);
  return (
    <li data-flip-id={product._id} className="flex">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "flex w-full cursor-pointer flex-col rounded-2xl p-2 text-left transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          selected ? "bg-accent-soft ring-2 ring-accent" : "bg-surface ring-1 ring-border hover:bg-surface-2",
        )}
      >
        <span className="block aspect-square overflow-hidden rounded-xl ring-1 ring-border">
          <ProductImage url={imageUrl} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col px-1 pt-2">
          <span className="line-clamp-2 min-h-9 text-sm leading-[18px] font-medium text-text">{name}</span>
          <span className="mt-1 flex items-center justify-between gap-1">
            <Money value={price} className="text-base font-semibold text-text" />
            {selected ? (
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-accent-fg">
                <Check className="size-4" strokeWidth={3} aria-hidden />
                <span className="sr-only">Izabrano</span>
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
            {marks.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <span className="sr-only">Objavljeno:</span>
                {marks.map((mark) => (
                  <span key={mark.key} title={mark.label} className="rounded-md bg-surface-2 px-1.5 py-px text-[11px] font-medium text-text">
                    {mark.key}
                  </span>
                ))}
              </span>
            ) : null}
            <ProductTags product={product} />
          </span>
        </span>
      </button>
    </li>
  );
}

export function ProductCardSkeleton() {
  return (
    <li aria-hidden className="flex flex-col rounded-2xl bg-surface p-2 ring-1 ring-border">
      <div className="skeleton aspect-square rounded-xl" />
      <div className="space-y-1.5 px-1 pt-2">
        <div className="skeleton h-4 w-11/12 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-5 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </li>
  );
}
