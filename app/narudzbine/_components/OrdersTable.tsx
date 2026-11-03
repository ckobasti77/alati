"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";
import { OrderRow } from "./OrderRow";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";
import type { useOrderCatalog } from "../_hooks/useOrderCatalog";
import type { useOrderEntries } from "../_hooks/useOrderEntries";
import type { useOrderSelection } from "../_hooks/useOrderSelection";
import type { useOrderReorder } from "../_hooks/useOrderReorder";
import type { useOrderRowActions } from "../_hooks/useOrderRowActions";
import type { useOrderDelete } from "../_hooks/useOrderDelete";

type OrdersTableProps = {
  feed: ReturnType<typeof useOrdersFeed>;
  catalog: ReturnType<typeof useOrderCatalog>;
  entries: ReturnType<typeof useOrderEntries>;
  selection: ReturnType<typeof useOrderSelection>;
  reorder: ReturnType<typeof useOrderReorder>;
  rowActions: ReturnType<typeof useOrderRowActions>;
  orderDelete: ReturnType<typeof useOrderDelete>;
  getOrderPreviewImages: (order: Order) => { id: string; url?: string | null; alt: string }[];
  handleRowClick: (id: string) => void;
};

export function OrdersTable({
  feed,
  catalog,
  entries,
  selection,
  reorder,
  rowActions,
  orderDelete,
  getOrderPreviewImages,
  handleRowClick,
}: OrdersTableProps) {
  const { ordersTotals, isOrdersLoading } = feed;
  const { orderEntries, visibleOrderIds } = entries;
  const { allVisibleSelected, toggleAllVisibleOrders, bulkAction } = selection;
  return (
    <div
      className="hidden md:block md:relative md:left-1/2 md:right-1/2 md:ml-[-50vw] md:mr-[-50vw] md:w-screen md:overflow-x-auto"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--card-border)",
        borderBottom: "1px solid var(--card-border)",
      }}
    >
      <Table>
        <TableHeader>
        <TableRow>
          <TableHead className="text-center">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisibleOrders}
              disabled={visibleOrderIds.length === 0 || bulkAction !== null}
              aria-label="Označi sve prikazane porudžbine"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </TableHead>
          <TableHead className="text-center">Datum</TableHead>
          <TableHead className="text-center">Stage</TableHead>
          <TableHead className="text-center">Naslov</TableHead>
          <TableHead className="text-center">Kontakt</TableHead>
          <TableHead className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              <span>Nabavno</span>
              <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.nabavno, "EUR")})</span>
            </div>
          </TableHead>
          <TableHead className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              <span>Transport</span>
              <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.transport, "EUR")})</span>
            </div>
          </TableHead>
          <TableHead className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              <span>Prodajno</span>
              <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.prodajno, "EUR")})</span>
            </div>
          </TableHead>
          <TableHead className="text-center text-nowrap">
            <div className="flex flex-col items-center gap-0.5">
              <span>Profit za povrat</span>
              <span className={cn("text-[11px]", ordersTotals.profit < 0 ? "text-red-600" : "text-slate-500")}>
                ({formatCurrency(ordersTotals.profit, "EUR")})
              </span>
            </div>
          </TableHead>
          <TableHead className="text-center">
            <div className="flex flex-col items-center gap-0.5">
              <span>Povrat</span>
              <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.povrat, "EUR")})</span>
            </div>
          </TableHead>
          <TableHead className="text-center">Broj porudzbine</TableHead>
          <TableHead className="text-center">Akcije</TableHead>
        </TableRow>
        </TableHeader>
        <TableBody>
        {isOrdersLoading ? (
          <TableRow>
            <TableCell colSpan={12} className="text-center text-sm text-slate-500">
              Ucitavanje...
            </TableCell>
          </TableRow>
        ) : orderEntries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={12} className="text-center text-sm text-slate-500">
              Jos nema narudzbina.
            </TableCell>
          </TableRow>
        ) : (
          orderEntries.map((entry) => (
            <OrderRow
              key={entry.order._id}
              entry={entry}
              feed={feed}
              catalog={catalog}
              selection={selection}
              reorder={reorder}
              rowActions={rowActions}
              orderDelete={orderDelete}
              getOrderPreviewImages={getOrderPreviewImages}
              handleRowClick={handleRowClick}
            />
          ))
        )}
        </TableBody>
      </Table>
    </div>
  );
}
