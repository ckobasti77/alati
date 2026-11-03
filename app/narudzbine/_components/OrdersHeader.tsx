"use client";

import type { useRouter } from "next/navigation";
import { Banknote, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";
import type { useOrderFormActions } from "../_hooks/useOrderFormActions";

type OrdersHeaderProps = {
  feed: ReturnType<typeof useOrdersFeed>;
  formActions: ReturnType<typeof useOrderFormActions>;
  router: ReturnType<typeof useRouter>;
};

export function OrdersHeader({ feed, formActions, router }: OrdersHeaderProps) {
  const { ordersPagination } = feed;
  const { openCreateModal } = formActions;
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Narudzbine</h1>
        <p className="text-sm text-slate-500">Tabela narudzbina, klik na red otvara detalje. Forma je u modalu.</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {ordersPagination.total} narudzbina
        </div>
        <Button variant="outline" onClick={() => router.push("/narudzbine/uvoz")} className="hidden gap-2 md:inline-flex">
          <Share2 className="h-4 w-4" />
          Uvoz priznanica
        </Button>
        <Button variant="outline" onClick={() => router.push("/narudzbine/pare")} className="hidden gap-2 md:inline-flex">
          <Banknote className="h-4 w-4" />
          Legle pare
        </Button>
        <Button onClick={openCreateModal} className="hidden gap-2 md:inline-flex">
          <Plus className="h-4 w-4" />
          Nova narudzbina
        </Button>
      </div>
    </header>
  );
}
