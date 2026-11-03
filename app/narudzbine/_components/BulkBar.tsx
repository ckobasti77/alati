"use client";

import { Button } from "@/components/ui/button";
import { STAGES, STAGE_OPTIONS } from "@/lib/stages";
import type { OrderStage } from "@/types/order";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";
import type { useOrderEntries } from "../_hooks/useOrderEntries";
import type { useOrderSelection } from "../_hooks/useOrderSelection";

type BulkBarProps = {
  feed: ReturnType<typeof useOrdersFeed>;
  entries: ReturnType<typeof useOrderEntries>;
  selection: ReturnType<typeof useOrderSelection>;
};

export function BulkBar({ feed, entries, selection }: BulkBarProps) {
  const { hasMoreOrders } = feed;
  const { visibleOrderIds } = entries;
  const { allVisibleSelected, bulkAction, handleBulkAction, selectedVisibleCount, toggleAllVisibleOrders } = selection;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-accent-soft p-4 ring-1 ring-inset ring-accent/20 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAllVisibleOrders}
            disabled={visibleOrderIds.length === 0 || bulkAction !== null}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Označi sve prikazane
        </label>
        <span className="text-sm text-slate-600">Izabrano: {selectedVisibleCount}</span>
        {hasMoreOrders ? (
          <span className="text-xs text-slate-500">Učitane su samo trenutno prikazane porudžbine.</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value=""
          disabled={selectedVisibleCount === 0 || bulkAction !== null}
          onChange={(event) => {
            const stage = event.target.value as OrderStage;
            if (stage) void handleBulkAction({ stage, message: `Status promenjen u ${STAGES[stage].label}` });
          }}
        >
          <option value="">Promeni status za izabrane...</option>
          {STAGE_OPTIONS
            .filter((option) => option.value !== "poslato")
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={selectedVisibleCount === 0 || bulkAction !== null}
          onClick={() => void handleBulkAction({ povratVracen: true, message: "Povrat označen" })}
        >
          Povrati sve
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={selectedVisibleCount === 0 || bulkAction !== null}
          onClick={() => void handleBulkAction({ povratVracen: false, message: "Povrat poništen" })}
        >
          Poništi povrat
        </Button>
      </div>
    </div>
  );
}
