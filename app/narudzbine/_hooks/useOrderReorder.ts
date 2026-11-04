"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, type DragEvent } from "react";
import { toast } from "sonner";
import { useConvexMutation } from "@/lib/convex";
import type { Order } from "@/types/order";
import type { Dispatch, SetStateAction } from "react";

type UseOrderReorderParams = {
  orderScope: "default" | "kalaba";
  sessionToken: string;
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  draggingOrderId: string | null;
  setDraggingOrderId: Dispatch<SetStateAction<string | null>>;
  dragOverOrderId: string | null;
  setDragOverOrderId: Dispatch<SetStateAction<string | null>>;
};

export function useOrderReorder({ orderScope, sessionToken, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId }: UseOrderReorderParams) {
  const reorderOrders = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    orderIds: string[];
    base: number;
  }>("orders:reorder");
  const reorderOrdersList = useCallback((list: Order[], sourceId: string, targetId: string) => {
    const sourceIndex = list.findIndex((entry) => entry._id === sourceId);
    const targetIndex = list.findIndex((entry) => entry._id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return list;
    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  }, []);

  const handleOrderDragStart = useCallback(
    (orderId: string) => (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", orderId);
      setDraggingOrderId(orderId);
      setDragOverOrderId(null);
    },
    [setDragOverOrderId, setDraggingOrderId],
  );

  const handleOrderDragEnd = useCallback(() => {
    setDraggingOrderId(null);
    setDragOverOrderId(null);
  }, [setDragOverOrderId, setDraggingOrderId]);

  const handleOrderDragOver = useCallback(
    (orderId: string) => (event: DragEvent<HTMLTableRowElement>) => {
      if (!draggingOrderId || draggingOrderId === orderId) return;
      event.preventDefault();
      setDragOverOrderId(orderId);
    },
    [draggingOrderId, setDragOverOrderId],
  );

  const handleOrderDragLeave = useCallback(
    (orderId: string) => () => {
      if (dragOverOrderId === orderId) {
        setDragOverOrderId(null);
      }
    },
    [dragOverOrderId, setDragOverOrderId],
  );

  const commitReorder = useCallback(
    async (sourceId: string, orderId: string) => {
      const nextOrders = reorderOrdersList(orders, sourceId, orderId);
      if (nextOrders === orders) {
        setDraggingOrderId(null);
        setDragOverOrderId(null);
        return;
      }
      const base = Date.now();
      const nextOrdersWithSort = nextOrders.map((item, index) => ({
        ...item,
        sortIndex: base - index,
      }));
      // Za rollback: redosled i sortIndex pre prevlačenja (ne ceo niz, da se ne izgube izmene stigle u međuvremenu).
      const previousSort = new Map(orders.map((item, index) => [item._id, { index, sortIndex: item.sortIndex }]));
      setOrders(nextOrdersWithSort);
      setDraggingOrderId(null);
      setDragOverOrderId(null);
      try {
        await reorderOrders({
          token: sessionToken,
          scope: orderScope,
          orderIds: nextOrders.map((item) => item._id),
          base,
        });
        toast.success("Redosled narudžbina je sačuvan.");
      } catch (error) {
        console.error(error);
        toast.error("Nije moguće sačuvati novi redosled.");
        setOrders((current) =>
          current
            .map((item) => {
              const before = previousSort.get(item._id);
              return before ? { ...item, sortIndex: before.sortIndex } : item;
            })
            .sort((a, b) => (previousSort.get(a._id)?.index ?? 0) - (previousSort.get(b._id)?.index ?? 0)),
        );
      }
    },
    [orderScope, orders, reorderOrders, reorderOrdersList, sessionToken, setDragOverOrderId, setDraggingOrderId, setOrders],
  );

  const handleOrderDrop = useCallback(
    (orderId: string) => async (event: DragEvent<HTMLTableRowElement>) => {
      event.preventDefault();
      const sourceId = draggingOrderId ?? event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === orderId) {
        setDraggingOrderId(null);
        setDragOverOrderId(null);
        return;
      }
      await commitReorder(sourceId, orderId);
    },
    [commitReorder, draggingOrderId, setDragOverOrderId, setDraggingOrderId],
  );

  /** Tastatura/meni: zameni mesto sa susedom (isto kao prevlačenje za jedno mesto). */
  const moveOrder = useCallback(
    (orderId: string, direction: -1 | 1) => {
      const index = orders.findIndex((item) => item._id === orderId);
      const neighbor = orders[index + direction];
      if (index < 0 || !neighbor) return;
      void commitReorder(orderId, neighbor._id);
    },
    [commitReorder, orders],
  );


  return { handleOrderDragStart, handleOrderDragEnd, handleOrderDragOver, handleOrderDragLeave, handleOrderDrop, moveOrder };
}

