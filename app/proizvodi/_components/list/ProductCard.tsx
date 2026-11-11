import Link from "next/link";
import { Archive, Layers, MapPin, Package } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Money } from "@/components/ui/money";
import type { Product } from "@/types/order";
import { productFlags, productHref, type ProductListApi } from "./productListApi";

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
