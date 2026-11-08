"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useProductFormSubmit } from "../_hooks/useProductFormSubmit";
import type { useProductsView } from "../_hooks/useProductsView";

type ProductsPageHeaderProps = {
  openCreateModal: ReturnType<typeof useProductFormSubmit>["openCreateModal"];
  items: ReturnType<typeof useProductsView>["items"];
};

export function ProductsPageHeader({ openCreateModal, items }: ProductsPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Proizvodi</h1>
        <p className="text-sm text-slate-500">Klikni na red za detalje ili otvori modal za novi unos.</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {items.length} proizvoda
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj novi proizvod
        </Button>
      </div>
    </header>

  );
}
