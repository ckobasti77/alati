"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useProductDetailCategories } from "../_hooks/useProductDetailCategories";
import type { useProductDetailState } from "../_hooks/useProductDetailState";

type DeleteCategoryDialogProps = {
  categoryToDelete: ReturnType<typeof useProductDetailState>["categoryToDelete"];
  setCategoryToDelete: ReturnType<typeof useProductDetailState>["setCategoryToDelete"];
  isDeletingCategory: ReturnType<typeof useProductDetailState>["isDeletingCategory"];
  handleConfirmDeleteCategory: ReturnType<typeof useProductDetailCategories>["handleConfirmDeleteCategory"];
};

export function DeleteCategoryDialog({ categoryToDelete, setCategoryToDelete, isDeletingCategory, handleConfirmDeleteCategory }: DeleteCategoryDialogProps) {
  return (
    <Dialog open={Boolean(categoryToDelete)} onOpenChange={(open) => (!open ? setCategoryToDelete(null) : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Obrisi kategoriju</DialogTitle>
          <DialogDescription>
            {categoryToDelete?.productCount && categoryToDelete.productCount > 0
              ? `Kategorija "${categoryToDelete.name}" je vezana za ${categoryToDelete.productCount} proizvoda. Brisanjem ce biti uklonjena sa svih.`
              : `Obrisi kategoriju "${categoryToDelete?.name}"?`}
          </DialogDescription>
        </DialogHeader>
        {categoryToDelete?.productCount && categoryToDelete.productCount > 0 ? (
          <div className="flex items-start gap-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Ova kategorija je dodeljena na {categoryToDelete.productCount} proizvod
              {categoryToDelete.productCount === 1 ? "" : "a"}. Potvrdom ce biti skinuta sa svih proizvoda i obrisana.
            </p>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={() => setCategoryToDelete(null)} disabled={isDeletingCategory}>
            Odustani
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirmDeleteCategory} disabled={isDeletingCategory}>
            {isDeletingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Obrisi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
