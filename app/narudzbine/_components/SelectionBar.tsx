"use client";

import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { StageList } from "@/components/ui/stage-badge";
import { STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { OrderStage } from "@/types/order";
import type { useOrderSelection } from "../_hooks/useOrderSelection";

type Selection = ReturnType<typeof useOrderSelection>;

/**
 * Traka grupnih akcija. Desktop: plutajuća na dnu kad je nešto izabrano.
 * Telefon: iznad donje navigacije dok traje mod izbora.
 */
export function SelectionBar({ selection, isDesktop, hasMore }: { selection: Selection; isDesktop: boolean; hasMore: boolean }) {
  const [stageOpen, setStageOpen] = useState(false);
  const { selectedVisibleCount: count, bulkAction, selectionMode, allVisibleSelected } = selection;
  const visible = isDesktop ? count > 0 : selectionMode || count > 0;
  if (!visible) return null;

  const busy = bulkAction !== null;
  const disabled = busy || count === 0;
  const pickStage = (stage: OrderStage) => {
    setStageOpen(false);
    void selection.handleBulkAction({ stage, message: `Status promenjen u ${STAGES[stage].label}` });
  };
  const stageList = <StageList onSelect={pickStage} compact={isDesktop} exclude={["poslato"]} />;
  const statusButton = (
    <Button type="button" variant="outline" size="sm" disabled={disabled} className="h-11 rounded-xl md:h-9" onClick={isDesktop ? undefined : () => setStageOpen(true)}>
      {bulkAction === "stage" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      Status
    </Button>
  );

  return (
    <div
      role="region"
      aria-label="Izabrane narudžbine"
      data-probe-bottom-bar
      className={cn(
        "fixed z-(--z-nav) flex items-center gap-1",
        isDesktop
          ? "bottom-6 left-1/2 -translate-x-1/2 rounded-2xl bg-raised p-1.5 pl-2 shadow-(--shadow-popover) ring-1 ring-border"
          : "inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] h-16 border-t border-border bg-raised px-2",
      )}
    >
      <IconButton aria-label="Završi izbor" onClick={selection.clearSelection}>
        <X />
      </IconButton>
      <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-text md:flex-none md:pr-3" aria-live="polite">
        {count === 0 ? "Izaberi narudžbine" : `${count} ${count === 1 ? "izabrana" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "izabrane" : "izabranih"}`}
      </p>
      {isDesktop ? (
        <Popover open={stageOpen} onOpenChange={setStageOpen}>
          <PopoverTrigger asChild>{statusButton}</PopoverTrigger>
          <PopoverContent side="top" align="center" className="w-56" aria-label="Status za izabrane">
            {stageList}
          </PopoverContent>
        </Popover>
      ) : (
        <>
          {statusButton}
          <Sheet open={stageOpen} onOpenChange={setStageOpen} title="Status za izabrane" description={`Izabrano: ${count}. Poslato traži broj pošiljke, pa ide pojedinačno.`}>
            {stageList}
          </Sheet>
        </>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-11 rounded-xl md:h-9"
        onClick={() => void selection.handleBulkAction({ povratVracen: true, message: "Povrat označen" })}
      >
        {bulkAction === "povrat" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Povrati
      </Button>
      <ActionMenu
        label="Još akcija za izabrane"
        items={[
          {
            label: allVisibleSelected ? "Poništi izbor svih" : hasMore ? "Izaberi sve učitane" : "Izaberi sve",
            onSelect: selection.toggleAllVisibleOrders,
            disabled: busy,
          },
          {
            label: "Poništi povrat",
            disabled,
            onSelect: () => void selection.handleBulkAction({ povratVracen: false, message: "Povrat poništen" }),
          },
        ]}
      />
    </div>
  );
}
