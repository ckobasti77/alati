"use client";

import Link from "next/link";
import { ChevronRight, ShoppingCart } from "lucide-react";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/ui/stage-badge";
import { orderTotals } from "@/lib/calc";
import { formatDate } from "@/lib/format";
import type { ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailState } from "../_hooks/useProductDetailState";

type ProductOrdersCardProps = {
  productOrders: ReturnType<typeof useProductDetailState>["productOrders"];
  product: ProductWithUrls;
};

const pluralStavki = (count: number) => (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "stavke" : "stavki");

/** Narudžbine u kojima je ovaj proizvod: status, kupac, datum, količina i prodajno; ceo red vodi na narudžbinu. */
export function ProductOrdersCard({ productOrders, product }: ProductOrdersCardProps) {
  const count = productOrders?.length ?? 0;
  return (
    <section aria-labelledby="proizvod-narudzbine" className="rounded-2xl bg-surface ring-1 ring-border">
      <h2 id="proizvod-narudzbine" className="flex min-h-14 items-center gap-2 px-4 pt-3 pb-2 text-base font-semibold text-text md:px-5">
        Narudžbine sa ovim proizvodom
        {productOrders ? <span className="num rounded-full bg-surface-2 px-2 text-xs font-medium text-text-muted ring-1 ring-border">{count}</span> : null}
      </h2>

      {productOrders === undefined ? (
        <div className="flex flex-col gap-2 px-4 pb-4 md:px-5" aria-busy="true" aria-label="Učitavanje narudžbina">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : count === 0 ? (
        <p className="flex items-center gap-2 px-4 pb-4 text-sm text-text-muted md:px-5">
          <ShoppingCart className="size-4 shrink-0" aria-hidden />
          Još nema narudžbina sa ovim proizvodom.
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {productOrders.map((order) => {
            const matchedItems = (order.items ?? []).filter((item) => String(item.productId) === String(product._id));
            const matchedQty = matchedItems.reduce((sum, item) => sum + item.kolicina, 0);
            const displayQty = matchedQty > 0 ? matchedQty : order.kolicina;
            const labels = matchedItems.map((item) => item.variantLabel || item.title).filter((label): label is string => Boolean(label && label.trim()));
            const variantText = labels.length > 0 ? `${labels.slice(0, 3).join(" / ")}${labels.length > 3 ? ` +${labels.length - 3}` : ""}` : null;
            const itemCount = order.items?.length ?? 0;
            const prodajno = orderTotals(order).totalProdajno;
            return (
              <li key={order._id}>
                <Link
                  href={`/narudzbine/${order._id}`}
                  className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-(--duration-fast) hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:px-5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-[15px] leading-5 font-medium text-text md:text-sm">{order.title}</span>
                      <StageBadge stage={order.stage} className="shrink-0" />
                    </div>
                    <span className="truncate text-[13px] text-text-muted">
                      {order.customerName || "—"} · <span className="num">{formatDate(order.kreiranoAt)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-text-muted">
                      <span className="num">Količina {displayQty}</span>
                      {itemCount > 1 ? (
                        <span className="num">
                          {itemCount} {pluralStavki(itemCount)}
                        </span>
                      ) : null}
                      {variantText ? <span className="min-w-0 truncate">{variantText}</span> : null}
                      <Money value={prodajno} trimZeroCents className="ml-auto font-medium text-text" />
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-text-muted transition-transform duration-(--duration-fast) group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
