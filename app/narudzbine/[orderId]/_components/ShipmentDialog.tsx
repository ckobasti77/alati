"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resolveOrderShippingMode } from "../_lib/detailHelpers";
import type { OrderWithProduct } from "@/types/order";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";

type ShipmentDialogProps = {
  order: OrderWithProduct;
  shipmentStageModalOpen: ReturnType<typeof useOrderDetailUpdates>["shipmentStageModalOpen"];
  shipmentNumberDraft: ReturnType<typeof useOrderDetailUpdates>["shipmentNumberDraft"];
  setShipmentNumberDraft: ReturnType<typeof useOrderDetailUpdates>["setShipmentNumberDraft"];
  isShipmentStageSaving: ReturnType<typeof useOrderDetailUpdates>["isShipmentStageSaving"];
  closeShipmentStageModal: ReturnType<typeof useOrderDetailUpdates>["closeShipmentStageModal"];
  handleShipmentStageSubmit: ReturnType<typeof useOrderDetailUpdates>["handleShipmentStageSubmit"];
};

export function ShipmentDialog({ order, shipmentStageModalOpen, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, closeShipmentStageModal, handleShipmentStageSubmit }: ShipmentDialogProps) {
  return (
    <Dialog
      open={shipmentStageModalOpen}
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
            {order ? ` (${resolveOrderShippingMode(order) ?? "Slanje"})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="shipment-number-details">
            Broj porudzbine
          </label>
          <Input
            id="shipment-number-details"
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
