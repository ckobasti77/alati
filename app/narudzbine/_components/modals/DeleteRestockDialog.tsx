"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { useRestock } from "../../_hooks/useRestock";

type DeleteRestockDialogProps = {
  restock: ReturnType<typeof useRestock>;
};

export function DeleteRestockDialog({ restock }: DeleteRestockDialogProps) {
  const { restockDeleteOpen, restockDeleteCandidate, isDeletingRestock, handleRestockDeleteOpenChange, handleRestockDelete } = restock;
  return (
    <ConfirmDialog
      open={restockDeleteOpen}
      onOpenChange={handleRestockDeleteOpenChange}
      tone="danger"
      title="Obrisati zahtev?"
      description={
        restockDeleteCandidate
          ? `${restockDeleteCandidate.productTitle} · ${restockDeleteCandidate.name} · ${restockDeleteCandidate.phone}. Brisanje je trajno.`
          : "Zahtev nije izabran."
      }
      confirmLabel="Obriši"
      confirmDisabled={!restockDeleteCandidate || isDeletingRestock}
      onConfirm={async () => {
        if (!restockDeleteCandidate) return;
        await handleRestockDelete(restockDeleteCandidate._id);
      }}
    />
  );
}
