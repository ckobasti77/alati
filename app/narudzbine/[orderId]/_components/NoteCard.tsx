"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineField } from "./LegacyFields";
import type { OrderWithProduct } from "@/types/order";
import type { useOrderDetailDerived } from "../_hooks/useOrderDetailDerived";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";

type NoteCardProps = {
  order: OrderWithProduct;
  handleOrderFieldSave: ReturnType<typeof useOrderDetailUpdates>["handleOrderFieldSave"];
  telHref: ReturnType<typeof useOrderDetailDerived>["telHref"];
};

export function NoteCard({ order, handleOrderFieldSave, telHref }: NoteCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Napomena</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <InlineField
          label="Napomena"
          value={order.napomena ?? ""}
          multiline
          onSave={(val) => handleOrderFieldSave("napomena", val)}
        />
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <a href={telHref} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
            <PhoneCall className="h-3.5 w-3.5" />
            {order.phone}
          </a>
          <span className="text-slate-400">·</span>
          <span>Adresa: {order.address}</span>
        </p>
      </CardContent>
    </Card>
  );
}
