"use client";

import { Settings2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ORDER_COLUMNS, DEFAULT_ORDER_COLUMNS } from "../_lib/orderView";
import type { OrdersViewState } from "../_hooks/useOrdersView";

/** Desktop tabela: gustina reda i vidljive kolone (pamti se). */
export function ViewSettingsMenu({ ordersView }: { ordersView: OrdersViewState }) {
  const { density, setDensity, columns, toggleColumn, resetColumns } = ordersView;
  const isDefault = columns.length === DEFAULT_ORDER_COLUMNS.length && columns.every((key) => DEFAULT_ORDER_COLUMNS.includes(key));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton aria-label="Gustina i kolone" title="Gustina i kolone" variant="outline">
          <Settings2 />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3" aria-label="Gustina i kolone">
        <p className="mb-2 text-[13px] font-medium text-text-muted">Gustina</p>
        <SegmentedControl
          ariaLabel="Gustina redova"
          fullWidth
          value={density}
          onChange={setDensity}
          options={[
            { value: "kompaktno", label: "Kompaktno" },
            { value: "udobno", label: "Udobno" },
          ]}
        />
        <fieldset className="mt-4">
          <legend className="mb-1 text-[13px] font-medium text-text-muted">Kolone</legend>
          {ORDER_COLUMNS.map((column) => (
            <label key={column.key} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-sm text-text hover:bg-surface-2">
              <input
                type="checkbox"
                checked={columns.includes(column.key)}
                onChange={() => toggleColumn(column.key)}
                className="size-4 cursor-pointer accent-accent"
              />
              {column.label}
            </label>
          ))}
        </fieldset>
        {!isDefault ? (
          <button
            type="button"
            onClick={resetColumns}
            className="mt-2 inline-flex h-8 cursor-pointer items-center rounded-lg px-1.5 text-[13px] font-medium text-accent-text hover:bg-surface-2"
          >
            Vrati podrazumevane kolone
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
