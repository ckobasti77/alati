"use client";

import { createContext, useContext } from "react";
import type { Order, OrderStage, Product } from "@/types/order";
import type { useOrderRowActions } from "../../_hooks/useOrderRowActions";

export type OrderPreview = { url: string | null; alt: string; count: number };

export type OrdersListContextValue = {
  productMap: Map<string, Product>;
  getPreview: (order: Order) => OrderPreview;
  rowActions: ReturnType<typeof useOrderRowActions>;
  onStageChange: (order: Order, stage: OrderStage) => void;
  onDelete: (order: Order) => void;
  /** Ručni redosled bez miša (desktop); undefined na telefonu. */
  onMove?: (orderId: string, direction: -1 | 1) => void;
  /** Pozicija u učitanoj listi (za "Pomeri gore/dole"). */
  positionOf: (orderId: string) => { index: number; count: number };
  selected: Set<string>;
  toggleSelected: (id: string, checked: boolean) => void;
  /** Grupna akcija je u toku: izbor je zaključan. */
  selectionLocked: boolean;
  /** Telefon: tap bira umesto da otvara. */
  selectionMode: boolean;
  enterSelection: (id?: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  orderHref: (id: string) => string;
  openOrder: (id: string) => void;
  /** Jedno "sada" za ceo render (relativni datumi). */
  now: number;
};

const OrdersListContext = createContext<OrdersListContextValue | null>(null);

export const OrdersListProvider = OrdersListContext.Provider;

export function useOrdersList() {
  const value = useContext(OrdersListContext);
  if (!value) throw new Error("useOrdersList mora biti unutar OrdersListProvider-a");
  return value;
}
