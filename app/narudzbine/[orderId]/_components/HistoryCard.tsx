"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { getOrderEventTitle, getOrderEventDetail } from "../_lib/detailHelpers";
import type { OrderWithProduct } from "@/types/order";

type HistoryCardProps = {
  order: OrderWithProduct;
};

export function HistoryCard({ order }: HistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tok narudzbine</CardTitle>
      </CardHeader>
      <CardContent>
        {(order.history ?? []).length > 0 ? (
          <ol className="space-y-4">
            {order.history?.map((event, index) => {
              const detail = getOrderEventDetail(event);
              return (
                <li key={event._id} className="relative flex gap-3 pl-1">
                  {index < (order.history?.length ?? 0) - 1 ? (
                    <span className="absolute left-[7px] top-4 h-[calc(100%+12px)] w-px bg-slate-200" />
                  ) : null}
                  <span className={`relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-sm ${event.type === "povrat" ? "bg-emerald-500" : "bg-blue-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{getOrderEventTitle(event)}</p>
                    {detail ? <p className="mt-0.5 font-mono text-xs text-blue-700">{detail}</p> : null}
                    <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">Istorija pocinje sa narednom stvarnom promenom.</p>
        )}
      </CardContent>
    </Card>

  );
}
