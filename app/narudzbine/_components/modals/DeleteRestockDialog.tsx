"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useRestock } from "../../_hooks/useRestock";

type DeleteRestockDialogProps = {
  restock: ReturnType<typeof useRestock>;
};

export function DeleteRestockDialog({ restock }: DeleteRestockDialogProps) {
  const { restockDeleteOpen, restockDeleteCandidate, isDeletingRestock, closeRestockDeleteModal, handleRestockDeleteOpenChange, handleRestockDelete } = restock;
  return (
    <Dialog open={restockDeleteOpen} onOpenChange={handleRestockDeleteOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Obrisi zahtev?</DialogTitle>
          <DialogDescription>Brisanje je trajno i ne moze da se vrati.</DialogDescription>
        </DialogHeader>
        {restockDeleteCandidate ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{restockDeleteCandidate.productTitle}</p>
            <p className="text-xs text-slate-500">
              {restockDeleteCandidate.name} - {restockDeleteCandidate.phone}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Zahtev nije izabran.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeRestockDeleteModal} disabled={isDeletingRestock}>
            Otkazi
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => restockDeleteCandidate && handleRestockDelete(restockDeleteCandidate._id)}
            disabled={!restockDeleteCandidate || isDeletingRestock}
          >
            {isDeletingRestock ? "Brisanje..." : "Obrisi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
