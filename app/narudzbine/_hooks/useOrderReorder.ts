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

  const handleOrderDrop = useCallback(
    (orderId: string) => async (event: DragEvent<HTMLTableRowElement>) => {
      event.preventDefault();
      const sourceId = draggingOrderId ?? event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === orderId) {
        setDraggingOrderId(null);
        setDragOverOrderId(null);
        return;
      }
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
        toast.success("Redosled narudzbina sacuvan.");
      } catch (error) {
        console.error(error);
        toast.error("Nije moguce sacuvati novi redosled.");
        setOrders(orders);
      }
    },
    [draggingOrderId, orderScope, orders, reorderOrders, reorderOrdersList, sessionToken, setDragOverOrderId, setDraggingOrderId, setOrders],
  );


  return { handleOrderDragStart, handleOrderDragEnd, handleOrderDragOver, handleOrderDragLeave, handleOrderDrop };
}

