"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useConvexMutation } from "@/lib/convex";
import type { Dispatch, SetStateAction } from "react";
import type { Order, OrderStage } from "@/types/order";

type UseOrderSelectionParams = {
  orderScope: "default" | "kalaba";
  sessionToken: string;
  stageFilters: OrderStage[];
  showUnreturnedOnly: boolean;
  showReturnedOnly: boolean;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  visibleOrderIds: string[];
};

export function useOrderSelection({ orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, visibleOrderIds }: UseOrderSelectionParams) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"stage" | "povrat" | null>(null);
  const bulkUpdateOrders = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    orderIds: string[];
    stage?: OrderStage;
    povratVracen?: boolean;
  }>("orders:bulkUpdate");
  const selectedVisibleCount = visibleOrderIds.filter((id) => selectedOrderIds.has(id)).length;
  const allVisibleSelected = visibleOrderIds.length > 0 && selectedVisibleCount === visibleOrderIds.length;
  const toggleOrderSelection = useCallback((orderId: string, checked: boolean) => {
    setSelectedOrderIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  }, []);

  const toggleAllVisibleOrders = useCallback(() => {
    setSelectedOrderIds((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleOrderIds.forEach((id) => next.delete(id));
      else visibleOrderIds.forEach((id) => next.add(id));
      return next;
    });
  }, [allVisibleSelected, visibleOrderIds]);

  const handleBulkAction = useCallback(
    async (action: { stage?: OrderStage; povratVracen?: boolean; message: string }) => {
      const orderIds = visibleOrderIds.filter((id) => selectedOrderIds.has(id));
      if (orderIds.length === 0 || bulkAction) return;
      setBulkAction(action.stage ? "stage" : "povrat");
      try {
        await bulkUpdateOrders({
          token: sessionToken,
          scope: orderScope,
          orderIds,
          stage: action.stage,
          povratVracen: action.povratVracen,
        });
        setOrders((previous) =>
          previous.flatMap((order) => {
            if (!orderIds.includes(order._id)) return [order];
            const next = {
              ...order,
              ...(action.stage ? { stage: action.stage, stageChangedAt: Date.now() } : {}),
              ...(action.povratVracen !== undefined
                ? { povratVracen: action.povratVracen, povratVracenAt: action.povratVracen ? Date.now() : undefined }
                : {}),
            };
            if (stageFilters.length > 0 && action.stage && !stageFilters.includes(action.stage)) return [];
            if (showUnreturnedOnly && action.povratVracen) return [];
            if (showReturnedOnly && action.povratVracen === false) return [];
            return [next];
          }),
        );
        setSelectedOrderIds((previous) => {
          const next = new Set(previous);
          orderIds.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`${action.message} (${orderIds.length}).`);
      } catch (error) {
        console.error(error);
        toast.error("Grupna akcija nije uspela.");
      } finally {
        setBulkAction(null);
      }
    },
    [
      bulkAction,
      bulkUpdateOrders,
      orderScope,
      sessionToken,
      selectedOrderIds,
      showReturnedOnly,
      showUnreturnedOnly,
      stageFilters,
      visibleOrderIds,
      setOrders,
    ],
  );


  return { selectedOrderIds, bulkAction, selectedVisibleCount, allVisibleSelected, toggleOrderSelection, toggleAllVisibleOrders, handleBulkAction };
}

