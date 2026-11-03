"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { useOrderRowActions } from "../../_hooks/useOrderRowActions";

type QuickEditDialogProps = {
  rowActions: ReturnType<typeof useOrderRowActions>;
};

export function QuickEditDialog({ rowActions }: QuickEditDialogProps) {
  const { quickEdit, setQuickEdit, isQuickEditSaving, closeQuickEdit, handleQuickEditSave } = rowActions;
  return (
    <Dialog
      open={Boolean(quickEdit)}
      onOpenChange={(open) => {
        if (!open) {
          closeQuickEdit();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {quickEdit?.field === "contact"
              ? "Izmeni kontakt"
              : quickEdit?.field === "address"
                ? "Izmeni adresu"
                : quickEdit?.field === "transport"
                  ? "Izmeni transport"
                  : "Izmeni procenat profita"}
          </DialogTitle>
          {quickEdit ? (
            <DialogDescription>
              Narudzbina: <span className="font-medium text-slate-700">{quickEdit.order.title}</span>
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {quickEdit?.field === "contact" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <FormLabel>Ime i prezime</FormLabel>
              <Input
                autoFocus
                value={quickEdit.customerName}
                onChange={(event) =>
                  setQuickEdit((current) =>
                    current?.field === "contact" ? { ...current, customerName: event.target.value } : current,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Telefon</FormLabel>
              <Input
                value={quickEdit.phone}
                onChange={(event) =>
                  setQuickEdit((current) =>
                    current?.field === "contact" ? { ...current, phone: event.target.value } : current,
                  )
                }
              />
            </div>
          </div>
        ) : null}
        {quickEdit?.field === "address" ? (
          <div className="space-y-2">
            <FormLabel>Adresa</FormLabel>
            <Textarea
              autoFocus
              rows={3}
              value={quickEdit.address}
              onChange={(event) =>
                setQuickEdit((current) =>
                  current?.field === "address" ? { ...current, address: event.target.value } : current,
                )
              }
            />
          </div>
        ) : null}
        {quickEdit?.field === "transport" ? (
          <div className="space-y-2">
            <FormLabel>Trosak transporta</FormLabel>
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="npr. 15 ili 15.5"
              value={quickEdit.transportCost}
              onChange={(event) =>
                setQuickEdit((current) =>
                  current?.field === "transport" ? { ...current, transportCost: event.target.value } : current,
                )
              }
            />
          </div>
        ) : null}
        {quickEdit?.field === "profit" ? (
          <div className="space-y-2">
            <FormLabel>Procenat profita</FormLabel>
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="npr. 50"
              value={quickEdit.myProfitPercent}
              onChange={(event) =>
                setQuickEdit((current) =>
                  current?.field === "profit" ? { ...current, myProfitPercent: event.target.value } : current,
                )
              }
            />
            <p className="text-xs text-slate-500">Unesi vrednost izmedju 0 i 100.</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeQuickEdit} disabled={isQuickEditSaving}>
            Otkazi
          </Button>
          <Button type="button" onClick={handleQuickEditSave} disabled={isQuickEditSaving}>
            {isQuickEditSaving ? "Cuvanje..." : "Sacuvaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
