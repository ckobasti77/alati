"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { STAGES } from "@/lib/stages";
import { deleteConfirmPhrase } from "../../_lib/types";
import type { useOrderDelete } from "../../_hooks/useOrderDelete";

type DeleteOrderDialogProps = {
  orderDelete: ReturnType<typeof useOrderDelete>;
};

export function DeleteOrderDialog({ orderDelete }: DeleteOrderDialogProps) {
  const { deleteModalOpen, deleteCandidate, deleteConfirmText, setDeleteConfirmText, isDeletingOrder, deleteRequiresConfirmation, isDeleteDisabled, closeDeleteModal, handleDeleteModalOpenChange, handleDelete } = orderDelete;
  return (
    <Dialog open={deleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Obrisi narudzbinu?</DialogTitle>
          <DialogDescription>Brisanje je trajno i ne moze da se vrati.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-600">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Proveri pre brisanja.</p>
              <p className="text-xs text-rose-800">Ova akcija nepovratno uklanja narudzbinu.</p>
            </div>
          </div>
          {deleteCandidate ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{deleteCandidate.title}</p>
              <p className="text-xs text-slate-500">
                {deleteCandidate.customerName} · Stage:{" "}
                {STAGES[deleteCandidate.stage]?.label ?? deleteCandidate.stage}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Narudzbina nije izabrana.</p>
          )}
          {deleteRequiresConfirmation ? (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-sm font-semibold text-amber-900">Za nastavak unesi potvrdu.</p>
              <Input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder={deleteConfirmPhrase}
                autoComplete="off"
              />
              <p className="text-xs text-amber-900">
                Upisi tacno: <span className="font-semibold">{deleteConfirmPhrase}</span>
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDeleteModal} disabled={isDeletingOrder}>
            Otkazi
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteCandidate && handleDelete(deleteCandidate._id)}
            disabled={isDeleteDisabled}
          >
            {isDeletingOrder ? "Brisanje..." : "Obrisi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
