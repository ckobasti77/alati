"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/order";
import type { SortOption } from "../../_lib/productHelpers";
import { ProductImage, ProductTags } from "./ProductCard";
import { productHref, productPublishMarks, type ProductListApi } from "./productListApi";

type SortableKey = "price" | "sales" | "profit";

// Sortiranje resetuje i ponovo crta listu: fokus se vraća na isto zaglavlje kad se tabela ponovo pojavi.
let pendingSortFocus: SortableKey | null = null;

/** Samo kolone sa serverskim sortom (products:listPaginated); klik na aktivno zaglavlje vraća „Najnovije“. */
const nextSort = (key: SortableKey, current: SortOption): SortOption => {
  if (key === "price") return current === "price_desc" ? "price_asc" : current === "price_asc" ? "created_desc" : "price_desc";
  if (key === "sales") return current === "sales_desc" ? "created_desc" : "sales_desc";
  return current === "profit_desc" ? "created_desc" : "profit_desc";
};

const sortState = (key: SortableKey, current: SortOption): "ascending" | "descending" | "none" => {
  if (key === "price") return current === "price_desc" ? "descending" : current === "price_asc" ? "ascending" : "none";
  if (key === "sales") return current === "sales_desc" ? "descending" : "none";
  return current === "profit_desc" ? "descending" : "none";
};

function SortHeader({ label, sortKey, sortBy, onSort, className }: { label: string; sortKey: SortableKey; sortBy: SortOption; onSort: (next: SortOption) => void; className?: string }) {
  const state = sortState(sortKey, sortBy);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (pendingSortFocus !== sortKey) return;
    pendingSortFocus = null;
    buttonRef.current?.focus();
  }, [sortKey]);
  const Icon = state === "descending" ? ArrowDown : state === "ascending" ? ArrowUp : ArrowUpDown;
  return (
    <th scope="col" aria-sort={state} className={className}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => {
          pendingSortFocus = sortKey;
          onSort(nextSort(sortKey, sortBy));
        }}
        className={cn(
          "-mx-1 inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg px-1 uppercase tracking-[0.06em] hover:text-text focus-visible:outline-2 focus-visible:outline-ring",
          state !== "none" && "text-text",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", state === "none" && "opacity-50")} aria-hidden />
      </button>
    </th>
  );
}

type ProductTableProps = {
  products: Product[];
  api: ProductListApi;
  sortBy: SortOption;
  onSort: (next: SortOption) => void;
  onOpen: (product: Product) => void;
};

/** Desktop lista: prava tabela, sticky thead, brojevi desno (tabular). */
export function ProductTable({ products, api, sortBy, onSort, onOpen }: ProductTableProps) {
  const th = "h-10 px-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-text-muted";
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border">
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col className="w-16" />
          <col />
          <col className="w-28" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-44" />
          <col className="w-28" />
          <col className="w-14" />
        </colgroup>
        <thead className="sticky top-(--header-h) z-(--z-sticky) bg-surface [&_th]:border-b [&_th]:border-border">
          <tr>
            <th scope="col" className={cn(th, "rounded-tl-2xl")}>
              <span className="sr-only">Slika</span>
            </th>
            <th scope="col" className={th}>
              Naziv
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              Nabavna
            </th>
            <SortHeader label="Prodajna" sortKey="price" sortBy={sortBy} onSort={onSort} className={cn(th, "text-right")} />
            <SortHeader label="Prodato" sortKey="sales" sortBy={sortBy} onSort={onSort} className={cn(th, "text-right")} />
            <SortHeader label="Profit" sortKey="profit" sortBy={sortBy} onSort={onSort} className={cn(th, "text-right")} />
            <th scope="col" className={th}>
              Kategorije
            </th>
            <th scope="col" className={th}>
              Objave
            </th>
            <th scope="col" className={cn(th, "rounded-tr-2xl")}>
              <span className="sr-only">Akcije</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const name = api.getName(product);
            const purchase = api.getPurchase(product);
            const categories = api.getCategories(product);
            const marks = productPublishMarks(product).filter((mark) => mark.active);
            return (
              <tr
                key={product._id}
                data-flip-id={product._id}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a, button, [role='menu']")) return;
                  onOpen(product);
                }}
                className="h-16 cursor-pointer transition-colors duration-(--duration-fast) hover:bg-surface-2 [&>td]:border-b [&>td]:border-border last:[&>td]:border-b-0"
              >
                <td className="px-3 py-2">
                  <span className="block size-10 overflow-hidden rounded-lg ring-1 ring-border">
                    <ProductImage url={api.getImageUrl(product)} />
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link href={productHref(product)} className="line-clamp-2 font-medium text-text hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {name}
                  </Link>
                  <ProductTags product={product} className="text-xs text-text-muted" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={purchase.price} className="text-text" />
                  {purchase.supplierName ? <span className="block truncate text-xs text-text-muted">{purchase.supplierName}</span> : null}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  <Money value={api.getPrice(product)} />
                </td>
                <td className="num px-3 py-2 text-right">{api.getSold(product)}</td>
                <td className="px-3 py-2 text-right">
                  <Money value={api.getProfit(product)} tone="profit" />
                </td>
                <td className="px-3 py-2">
                  {categories.length ? (
                    <span className="line-clamp-2 text-[13px] text-text-muted">{categories.map((category) => category.name).join(", ")}</span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {marks.length ? (
                    <span className="flex flex-wrap gap-1">
                      {marks.map((mark) => (
                        <abbr key={mark.key} title={mark.label} className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-text no-underline">
                          {mark.key}
                        </abbr>
                      ))}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right">
                  <ActionMenu items={api.menuFor(product)} label={`Akcije za ${name}`} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
