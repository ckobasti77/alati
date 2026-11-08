"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useProductFormSubmit } from "../_hooks/useProductFormSubmit";
import type { useProductsState } from "../_hooks/useProductsState";

type ProductExitConfirmProps = {
  exitConfirmOpen: ReturnType<typeof useProductsState>["exitConfirmOpen"];
  setExitConfirmOpen: ReturnType<typeof useProductsState>["setExitConfirmOpen"];
  closeModal: ReturnType<typeof useProductFormSubmit>["closeModal"];
};

export function ProductExitConfirm({ exitConfirmOpen, setExitConfirmOpen, closeModal }: ProductExitConfirmProps) {
  return (
    <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Napusti formu?</DialogTitle>
          <DialogDescription>Imas nesacuvane izmene. Ako izadjes, izgubices uneto.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setExitConfirmOpen(false)}>
            Ostani
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setExitConfirmOpen(false);
              closeModal();
            }}
          >
            Napusti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
