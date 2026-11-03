"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolveOrderShippingMode } from "../../_lib/helpers";
import type { useOrderRowActions } from "../../_hooks/useOrderRowActions";

type ShipmentNumberDialogProps = {
  rowActions: ReturnType<typeof useOrderRowActions>;
};

export function ShipmentNumberDialog({ rowActions }: ShipmentNumberDialogProps) {
  const { shipmentStageModal, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, closeShipmentStageModal, handleShipmentStageSubmit } = rowActions;
  return (
    <Dialog
      open={Boolean(shipmentStageModal)}
      onOpenChange={(open) => {
        if (!open) {
          closeShipmentStageModal();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Broj porudzbine</DialogTitle>
          <DialogDescription>
            Unesi broj porudzbine pre promene statusa na "Poslato"
            {shipmentStageModal?.order ? ` (${resolveOrderShippingMode(shipmentStageModal.order) ?? "Slanje"})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="shipment-number-input">
            Broj porudzbine
          </label>
          <Input
            id="shipment-number-input"
            value={shipmentNumberDraft}
            placeholder="Unesi broj porudzbine"
            autoFocus
            onChange={(event) => setShipmentNumberDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleShipmentStageSubmit();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeShipmentStageModal} disabled={isShipmentStageSaving}>
            Otkazi
          </Button>
          <Button type="button" onClick={() => void handleShipmentStageSubmit()} disabled={isShipmentStageSaving}>
            {isShipmentStageSaving ? "Cuvanje..." : "Sacuvaj i oznaci kao poslato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
