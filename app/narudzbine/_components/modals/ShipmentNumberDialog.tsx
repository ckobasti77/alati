"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { resolveOrderShippingMode } from "../../_lib/helpers";
import type { useOrderRowActions } from "../../_hooks/useOrderRowActions";

type ShipmentNumberDialogProps = {
  rowActions: ReturnType<typeof useOrderRowActions>;
};

export function ShipmentNumberDialog({ rowActions }: ShipmentNumberDialogProps) {
  const { shipmentStageModal, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, closeShipmentStageModal, handleShipmentStageSubmit } = rowActions;
  const shippingMode = shipmentStageModal?.order ? resolveOrderShippingMode(shipmentStageModal.order) : null;
  return (
    <Sheet
      open={Boolean(shipmentStageModal)}
      onOpenChange={(open) => {
        if (!open) closeShipmentStageModal();
      }}
      title="Broj pošiljke"
      description="Status „Poslato“ traži broj pošiljke."
      size="auto"
      desktopWidth="sm"
      footer={
        <div className="flex gap-2 md:justify-end">
          <Button type="button" variant="ghost" onClick={closeShipmentStageModal} disabled={isShipmentStageSaving}>
            Otkaži
          </Button>
          <Button
            type="button"
            className="flex-1 md:flex-none"
            onClick={() => void handleShipmentStageSubmit()}
            disabled={isShipmentStageSaving}
          >
            {isShipmentStageSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Sačuvaj i pošalji
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] text-text-muted" htmlFor="shipment-number-input">
          Broj pošiljke{shipmentStageModal?.order ? ` (${shippingMode ?? "Slanje"})` : ""}
        </label>
        <Input
          id="shipment-number-input"
          value={shipmentNumberDraft}
          autoFocus
          inputMode="text"
          autoCapitalize="characters"
          enterKeyHint="done"
          onChange={(event) => setShipmentNumberDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleShipmentStageSubmit();
            }
          }}
        />
      </div>
    </Sheet>
  );
}
