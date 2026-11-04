"use client";

import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import type { OrderListResponse } from "@/types/order";
import { ORDER_COLUMNS, type OrderColumnKey, type OrdersDensity } from "../../_lib/orderView";
import type { OrderEntry } from "../../_hooks/useOrderEntries";
import { OrderTableRow, type RowDragHandlers } from "./OrderTableRow";
import { TableSkeletonRows } from "../list/ListSkeleton";

// Širine (px) za `table-fixed`. Naslov uzima ostatak: na 1280 ~290px sa podrazumevanim kolonama.
const WIDTHS: Record<OrderColumnKey | "izbor" | "status" | "akcije", number> = {
  izbor: 52,
  status: 116,
  kupac: 220,
  prodajno: 92,
  nabavno: 84,
  transport: 76,
  profit: 92,
  povrat: 100,
  posiljka: 128,
  napomena: 160,
  akcije: 48,
};

const MONEY_TOTALS: Partial<Record<OrderColumnKey, keyof OrderListResponse["totals"]>> = {
  prodajno: "prodajno",
  nabavno: "nabavno",
  transport: "transport",
  profit: "profit",
  povrat: "povrat",
};

const thBase =
  "sticky top-(--header-h) z-(--z-sticky) bg-surface px-2 py-2 align-bottom text-[11px] leading-4 font-medium uppercase tracking-[0.06em] text-text-muted shadow-[inset_0_-1px_0_var(--color-border)]";
const tfBase = "sticky bottom-0 z-(--z-sticky) bg-surface px-2 py-2.5 shadow-[inset_0_1px_0_var(--color-border)]";

export function OrdersTableView({
  entries,
  columns,
  density,
  drag,
  totals,
  total,
  allVisibleSelected,
  onToggleAll,
  selectionDisabled,
  loading,
  loadingMore,
  empty,
}: {
  entries: OrderEntry[];
  columns: OrderColumnKey[];
  density: OrdersDensity;
  drag: RowDragHandlers;
  totals: OrderListResponse["totals"];
  total: number;
  allVisibleSelected: boolean;
  onToggleAll: () => void;
  selectionDisabled: boolean;
  loading: boolean;
  loadingMore: boolean;
  empty: React.ReactNode;
}) {
  const visible = new Set(columns);
  const shownColumns = ORDER_COLUMNS.filter((column) => visible.has(column.key));
  const colCount = 3 + shownColumns.length + 1;

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border">
      <table className="w-full table-fixed border-separate border-spacing-0">
        <caption className="sr-only">Narudžbine</caption>
        <colgroup>
          <col style={{ width: WIDTHS.izbor }} />
          <col style={{ width: WIDTHS.status }} />
          <col />
          {shownColumns.map((column) => (
            <col key={column.key} style={{ width: WIDTHS[column.key] }} />
          ))}
          <col style={{ width: WIDTHS.akcije }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={cn(thBase, "rounded-tl-2xl pl-2")}>
              <label className="ml-4 flex size-8 cursor-pointer items-center justify-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleAll}
                  disabled={selectionDisabled || entries.length === 0}
                  aria-label="Izaberi sve prikazane narudžbine"
                  className="size-4 cursor-pointer accent-accent"
                />
              </label>
            </th>
            <th scope="col" className={cn(thBase, "text-left")}>Status</th>
            <th scope="col" className={cn(thBase, "text-left")}>Naslov</th>
            {shownColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(thBase, MONEY_TOTALS[column.key] ? "text-right" : "text-left")}
              >
                {column.label}
              </th>
            ))}
            <th scope="col" className={cn(thBase, "rounded-tr-2xl")}>
              <span className="sr-only">Akcije</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeletonRows columns={colCount} density={density} rows={8} />
          ) : entries.length === 0 ? (
            <tr>
              <td colSpan={colCount}>{empty}</td>
            </tr>
          ) : (
            <>
              {entries.map((entry) => (
                <OrderTableRow key={entry.order._id} entry={entry} columns={visible} density={density} drag={drag} />
              ))}
              {loadingMore ? <TableSkeletonRows columns={colCount} density={density} rows={3} /> : null}
            </>
          )}
        </tbody>
        {entries.length > 0 ? (
          <tfoot>
            <tr className="text-[13px]">
              <td className={cn(tfBase, "rounded-bl-2xl")} />
              <td colSpan={2} className={cn(tfBase, "text-left font-medium text-text")}>
                Zbir <span className="font-normal text-text-muted">· <span className="num">{total.toLocaleString("sr-RS")}</span> narudžbina</span>
              </td>
              {shownColumns.map((column) => {
                const key = MONEY_TOTALS[column.key];
                return (
                  <td key={column.key} className={cn(tfBase, "text-right font-semibold")}>
                    {key ? (
                      <Money value={totals[key]} tone={key === "profit" ? "profit" : "default"} trimZeroCents className={key === "nabavno" || key === "transport" ? "font-medium text-text-muted" : undefined} />
                    ) : null}
                  </td>
                );
              })}
              <td className={cn(tfBase, "rounded-br-2xl")} />
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
