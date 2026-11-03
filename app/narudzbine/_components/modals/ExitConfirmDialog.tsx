"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { useOrderFormActions } from "../../_hooks/useOrderFormActions";

type ExitConfirmDialogProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  formActions: ReturnType<typeof useOrderFormActions>;
};

export function ExitConfirmDialog({ orderForm, formActions }: ExitConfirmDialogProps) {
  const { exitConfirmOpen, setExitConfirmOpen } = orderForm;
  const { resetOrderForm } = formActions;
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
              resetOrderForm({ closeModal: true });
            }}
          >
            Napusti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
