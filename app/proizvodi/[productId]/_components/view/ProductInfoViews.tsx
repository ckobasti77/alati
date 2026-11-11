"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Layers, MapPin, Star } from "lucide-react";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import type { Category, Product, Supplier } from "@/types/order";

/** Detalj radi sa `ProductWithUrls` (adImage može biti null), pa prikaz ne zavisi od tog polja. */
type ProductView = Omit<Product, "adImage">;

const card = "rounded-2xl bg-surface p-4 ring-1 ring-border md:p-5";

export function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mb-2 text-base font-semibold text-text">
      {children}
      {count !== undefined ? <span className="num ml-1.5 font-normal text-text-muted">{count}</span> : null}
    </h2>
  );
}

/** Ključni brojevi odmah ispod galerije: prodajna (naglašena), nabavna, Prodato, Profit; oznake. */
export function ProductKeyNumbers({
  product,
  price,
  purchase,
  sold,
  profit,
  categories,
}: {
  product: ProductView;
  price: number;
  purchase: { price: number | undefined; supplierName?: string };
  sold: number | undefined;
  profit: number | undefined;
  categories: Category[];
}) {
  const marks = [
    { key: "KP", active: Boolean(product.publishKp) },
    { key: "FB", active: Boolean(product.publishMarketplace || product.publishFbProfile) },
    { key: "IG", active: Boolean(product.publishIg) },
  ];
  return (
    <section aria-label="Ključni brojevi" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <Money value={price} className="text-[28px] leading-8 font-semibold tracking-tight text-text" />
        <div className="text-right text-[13px] text-text-muted">
          <span className="block">
            Prodato <span className="num font-medium text-text">{sold ?? "—"}</span>
          </span>
          <span className="block">
            Profit <Money value={profit} tone="profit" className="font-medium" />
          </span>
        </div>
      </div>
      <p className="-mt-2 text-[13px] text-text-muted">
        Nabavna <Money value={purchase.price} className="font-medium text-text" />
        {purchase.supplierName ? ` · ${purchase.supplierName}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {(product.variants?.length ?? 0) > 0 ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2 text-text-muted ring-1 ring-border">
            <Layers className="size-3.5" aria-hidden />
            Tipski
          </span>
        ) : null}
        {product.pickupAvailable ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-surface-2 px-2 text-text-muted ring-1 ring-border">
            <MapPin className="size-3.5" aria-hidden />
            Lično
          </span>
        ) : null}
        {marks.map((mark) => (
          <span
            key={mark.key}
            className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 font-medium", mark.active ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-text-muted line-through decoration-text-muted/60")}
          >
            {mark.active ? <Check className="size-3" aria-hidden /> : null}
            {mark.key}
            <span className="sr-only">{mark.active ? " (objavljuje se)" : " (ne objavljuje se)"}</span>
          </span>
        ))}
        {categories.map((category) => (
          <span key={category._id} className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2 text-text-muted ring-1 ring-border">
            {category.name}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Tipovi kao kartice (samo prikaz; izmena ide kroz formu). */
export function ProductVariantCards({ product, purchaseFor }: { product: ProductView; purchaseFor: (variantId: string) => number | undefined }) {
  const variants = product.variants ?? [];
  if (!variants.length) return null;
  return (
    <section className={card} aria-labelledby="tipovi-naslov">
      <h2 id="tipovi-naslov" className="mb-2 text-base font-semibold text-text">
        Tipovi <span className="num ml-1.5 font-normal text-text-muted">{variants.length}</span>
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {variants.map((variant) => (
          <li key={variant.id} className="rounded-xl bg-surface-2 p-3 ring-1 ring-border">
            <p className="flex items-center gap-1.5 text-sm font-medium text-text">
              {variant.label}
              {variant.isDefault ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-normal text-accent-text">
                  <Star className="size-3" aria-hidden />
                  glavni
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[13px] text-text-muted">
              <Money value={variant.prodajnaCena} className="font-semibold text-text" /> · nab. <Money value={purchaseFor(variant.id) ?? variant.nabavnaCena} />
            </p>
            {variant.opis ? <p className="mt-1 line-clamp-3 text-[13px] text-text-muted">{variant.opis}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ponude dobavljača (najjeftinija označena). */
export function ProductSupplierList({
  product,
  supplierMap,
}: {
  product: ProductView;
  supplierMap: Map<string, Supplier>;
}) {
  const offers = product.supplierOffers ?? [];
  if (!offers.length) return null;
  const min = Math.min(...offers.map((offer) => offer.price));
  const variantLabel = (id?: string) => product.variants?.find((variant) => variant.id === id)?.label;
  return (
    <section className={card} aria-labelledby="dobavljaci-naslov">
      <h2 id="dobavljaci-naslov" className="mb-1 text-base font-semibold text-text">
        Dobavljači
      </h2>
      <dl className="divide-y divide-border">
        {offers.map((offer, index) => (
          <div key={`${offer.supplierId}-${offer.variantId ?? "base"}-${index}`} className="flex items-baseline justify-between gap-3 py-2">
            <dt className="min-w-0 text-sm text-text">
              {supplierMap.get(String(offer.supplierId))?.name ?? "Dobavljač"}
              <span className="block text-xs text-text-muted">{offer.variantId ? `važi za: ${variantLabel(offer.variantId) ?? "tip"}` : "važi za sve"}</span>
            </dt>
            <dd className="text-right text-sm">
              <Money value={offer.price} className="font-medium text-text" />
              {offer.price === min && offers.length > 1 ? <span className="block text-xs text-success">najjeftiniji</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DescriptionItem({ title, text, onCopy }: { title: string; text: string; onCopy: (value: string) => void }) {
  const [copied, setCopied] = useState(false);
  // Dugme „Kopiraj“ je van <summary> (bez ugnježdenih interaktivnih elemenata), pozicionirano u istom redu.
  return (
    <div className="relative border-b border-border last:border-b-0">
      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 py-1 pr-28 text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
          <ChevronDown className="size-4 text-text-muted transition-transform group-open:rotate-180" aria-hidden />
          {title}
        </summary>
        <p className="pb-3 text-[15px] leading-[22px] whitespace-pre-wrap break-words text-text md:text-sm md:leading-6">{text}</p>
      </details>
      <button
        type="button"
        onClick={() => {
          onCopy(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
        className="absolute top-0.5 right-0 -mr-2 inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-accent-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Kopiraj: ${title}`}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? "Kopirano" : "Kopiraj"}
      </button>
    </div>
  );
}

/** Dugi opisi (KP, FB/Insta): sklopivi, sa „Kopiraj“. */
export function ProductDescriptions({ product, onCopy }: { product: ProductView; onCopy: (value: string) => void }) {
  const items = [
    { title: "KP naziv", text: product.kpName ?? "" },
    { title: "KupujemProdajem opis", text: product.opisKp ?? "" },
    { title: "FB / Insta naziv", text: product.name ?? "" },
    { title: "FB / Insta opis", text: product.opisFbInsta ?? product.opis ?? "" },
  ].filter((item) => item.text.trim());
  if (!items.length) return null;
  return (
    <section className={card} aria-labelledby="opisi-naslov">
      <h2 id="opisi-naslov" className="text-base font-semibold text-text">
        Opisi
      </h2>
      {items.map((item) => (
        <DescriptionItem key={item.title} {...item} onCopy={onCopy} />
      ))}
    </section>
  );
}
