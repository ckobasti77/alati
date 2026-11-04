"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
    <ConfirmDialog
      open={exitConfirmOpen}
      onOpenChange={setExitConfirmOpen}
      tone="danger"
      title="Napusti formu?"
      description="Nesačuvane izmene će biti izgubljene."
      confirmLabel="Napusti"
      cancelLabel="Nastavi unos"
      onConfirm={() => {
        setExitConfirmOpen(false);
        resetOrderForm({ closeModal: true });
      }}
    />
  );
}
