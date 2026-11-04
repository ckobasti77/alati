"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { STAGES } from "@/lib/stages";
import { deleteConfirmPhrase } from "../../_lib/types";
import type { useOrderDelete } from "../../_hooks/useOrderDelete";

type DeleteOrderDialogProps = {
  orderDelete: ReturnType<typeof useOrderDelete>;
};

/** Brisanje ide samo kroz potvrdu; za Stiglo/Leglo/Vraćeno traži se i ukucana fraza. */
export function DeleteOrderDialog({ orderDelete }: DeleteOrderDialogProps) {
  const { deleteModalOpen, deleteCandidate, deleteConfirmText, setDeleteConfirmText, deleteRequiresConfirmation, isDeleteDisabled, handleDeleteModalOpenChange, handleDelete } = orderDelete;
  const stageLabel = deleteCandidate ? STAGES[deleteCandidate.stage]?.label ?? deleteCandidate.stage : "";
  return (
    <ConfirmDialog
      open={deleteModalOpen}
      onOpenChange={handleDeleteModalOpenChange}
      tone="danger"
      title="Obrisati narudžbinu?"
      description={
        deleteCandidate
          ? `${deleteCandidate.title} · ${deleteCandidate.customerName || "bez kupca"} · ${stageLabel}. Brisanje je trajno.`
          : "Brisanje je trajno."
      }
      confirmLabel="Obriši"
      confirmDisabled={isDeleteDisabled}
      onConfirm={async () => {
        if (!deleteCandidate) return;
        const deleted = await handleDelete(deleteCandidate._id);
        if (!deleted) throw new Error("Brisanje nije uspelo.");
      }}
    >
      {deleteRequiresConfirmation ? (
        <label className="flex flex-col gap-1.5 text-[13px] text-text-muted">
          <span>
            Narudžbina je u statusu {stageLabel}. Za potvrdu upiši: <span className="font-medium text-text">{deleteConfirmPhrase}</span>
          </span>
          <Input
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder={deleteConfirmPhrase}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
      ) : null}
    </ConfirmDialog>
  );
}
