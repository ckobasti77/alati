"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { StageList } from "@/components/ui/stage-badge";
import { STAGES, getStage } from "@/lib/stages";
import type { OrderStage, OrderWithProduct } from "@/types/order";
import { resolveOrderShippingMode } from "../_lib/detailHelpers";
import { deleteConfirmPhrase, matchesDeleteConfirmPhrase } from "../../_lib/types";
import { requiresDeleteConfirmation } from "../../_lib/helpers";
import type { useOrderDetailDelete } from "../_hooks/useOrderDetailDelete";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";

/** Izbor statusa iz trake akcija (isti sadržaj kao sheet StageBadge-a). */
export function StageSheet({ open, onOpenChange, stage, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; stage: OrderStage; onSelect: (stage: OrderStage) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Promeni status" description={`Trenutno: ${getStage(stage).label}`}>
      <StageList
        current={stage}
        onSelect={(next) => {
          onOpenChange(false);
          if (next !== stage) onSelect(next);
        }}
      />
    </Sheet>
  );
}

/** Prelazak na „Poslato“ traži broj pošiljke (isti tok kao ranije, sada u Sheet-u). */
export function ShipmentNumberSheet({ order, updates }: { order: OrderWithProduct; updates: ReturnType<typeof useOrderDetailUpdates> }) {
  const { shipmentStageModalOpen, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, closeShipmentStageModal, handleShipmentStageSubmit } = updates;
  const shippingMode = resolveOrderShippingMode(order);
  return (
    <Sheet
      open={shipmentStageModalOpen}
      onOpenChange={(open) => {
        if (!open) closeShipmentStageModal();
      }}
      title="Broj pošiljke"
      description="Status „Poslato“ traži broj pošiljke."
      desktopWidth="sm"
      footer={
        <div className="flex gap-2 md:justify-end">
          <Button type="button" variant="ghost" onClick={closeShipmentStageModal} disabled={isShipmentStageSaving}>
            Otkaži
          </Button>
          <Button type="button" className="flex-1 gap-2 md:flex-none" onClick={() => void handleShipmentStageSubmit()} disabled={isShipmentStageSaving}>
            {isShipmentStageSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Sačuvaj i pošalji
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="detail-shipment-number">
          Broj pošiljke{shippingMode ? ` (${shippingMode === "Posta" ? "Pošta" : shippingMode})` : ""}
        </label>
        <Input
          id="detail-shipment-number"
          value={shipmentNumberDraft}
          autoFocus
          autoComplete="off"
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

/** Brisanje: potvrda, a za Stiglo/Leglo/Vraćeno i ukucana fraza (kao ranije). */
export function DeleteOrderConfirm({ order, orderDelete }: { order: OrderWithProduct; orderDelete: ReturnType<typeof useOrderDetailDelete> }) {
  const { deleteModalOpen, deleteConfirmText, setDeleteConfirmText, isDeletingOrder, handleDeleteModalOpenChange, handleDeleteOrder } = orderDelete;
  const needsPhrase = requiresDeleteConfirmation(order.stage);
  const phraseOk = matchesDeleteConfirmPhrase(deleteConfirmText);
  const stageLabel = STAGES[order.stage]?.label ?? order.stage;
  return (
    <ConfirmDialog
      open={deleteModalOpen}
      onOpenChange={handleDeleteModalOpenChange}
      tone="danger"
      title="Obrisati narudžbinu?"
      description={`${order.title} · ${order.customerName || "bez kupca"} · ${stageLabel}. Brisanje je trajno.`}
      confirmLabel="Obriši"
      confirmDisabled={isDeletingOrder || (needsPhrase && !phraseOk)}
      onConfirm={async () => {
        const deleted = await handleDeleteOrder();
        if (!deleted) throw new Error("Brisanje nije uspelo.");
      }}
    >
      {needsPhrase ? (
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
