"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Nesačuvane izmene u formi proizvoda: potvrda pre zatvaranja (isti tok kao ranije). */
export function ProductExitConfirm({ exitConfirmOpen, setExitConfirmOpen, closeModal }: { exitConfirmOpen: boolean; setExitConfirmOpen: (open: boolean) => void; closeModal: () => void }) {
  return (
    <ConfirmDialog
      open={exitConfirmOpen}
      onOpenChange={setExitConfirmOpen}
      title="Napusti formu?"
      description="Izmene koje nisu sačuvane biće izgubljene."
      confirmLabel="Napusti"
      cancelLabel="Nastavi unos"
      tone="danger"
      onConfirm={() => {
        setExitConfirmOpen(false);
        closeModal();
      }}
    />
  );
}
