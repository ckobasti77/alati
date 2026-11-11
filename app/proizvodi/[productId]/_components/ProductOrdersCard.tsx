"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { OrderStageBadge } from "./LegacyFields";
import type { ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailState } from "../_hooks/useProductDetailState";

type ProductOrdersCardProps = {
  productOrders: ReturnType<typeof useProductDetailState>["productOrders"];
  product: ProductWithUrls;
};

export function ProductOrdersCard({ productOrders, product }: ProductOrdersCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Porudzbine sa ovim proizvodom
          <Badge variant="default">{productOrders?.length ?? 0}</Badge>
        </CardTitle>
        <p className="text-sm text-slate-500">Klikom otvaras pojedinacnu narudzbinu.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {productOrders === undefined ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ucitavanje porudzbina...
          </div>
        ) : productOrders.length === 0 ? (
          <p className="text-sm text-slate-500">Jos nema porudzbina za ovaj proizvod.</p>
        ) : (
          <div className="space-y-2">
            {productOrders.map((order) => {
              const matchedItems = (order.items ?? []).filter(
                (item) => String(item.productId) === String(product._id),
              );
              const matchedQty = matchedItems.reduce((sum, item) => sum + item.kolicina, 0);
              const displayQty = matchedQty > 0 ? matchedQty : order.kolicina;
              const matchedLabels = matchedItems
                .map((item) => item.variantLabel || item.title)
                .filter((label) => Boolean(label && label.trim().length > 0));
              const primaryLabel = matchedLabels[0] ?? "";
              const secondaryLabels = matchedLabels.slice(1, 3);
              const remainingCount = matchedLabels.length > 3 ? matchedLabels.length - 3 : 0;
              const orderHref = `/narudzbine/${order._id}`;

              return (
                <Link
                  key={order._id}
                  href={orderHref}
                  className="group block space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{order.title}</p>
                      <p className="text-xs text-slate-500">
                        Kupac: {order.customerName} - Kreirano {formatDate(order.kreiranoAt)}
                      </p>
                      {primaryLabel ? (
                        <p className="text-xs text-slate-500">
                          {primaryLabel}
                          {secondaryLabels.length > 0 ? ` / ${secondaryLabels.join(" / ")}` : ""}
                          {remainingCount > 0 ? ` +${remainingCount}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <OrderStageBadge stage={order.stage} />
                      <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-600" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Kolicina: {displayQty}
                    </span>
                    {order.items && order.items.length > 1 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {order.items.length} stavki
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
