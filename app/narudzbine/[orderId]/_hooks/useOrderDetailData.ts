"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { OrderRefundPeriodOverview, OrderWithProduct, Product, ShippingOwnerOptions, Supplier } from "@/types/order";

type UseOrderDetailDataParams = {
  orderId: string;
  orderScope: "default" | "kalaba";
};

export function useOrderDetailData({ orderId, orderScope }: UseOrderDetailDataParams) {
  const { token } = useAuth();
  const sessionToken = token as string;
  const updateOrder = useConvexMutation("orders:update");
  const setManualRefund100 = useConvexMutation<{
    token: string;
    id: string;
    scope: "default" | "kalaba";
    enabled: boolean;
  }, {
    enabled: boolean;
    changedAt: number | null;
  }>("orders:setManualRefund100");
  const deleteOrder = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>("orders:remove");
  const queryResult = useConvexQuery<OrderWithProduct | null>("orders:get", {
    token: sessionToken,
    id: orderId,
    scope: orderScope,
  });
  const refundPeriodOverview = useConvexQuery<OrderRefundPeriodOverview>("orders:refundPeriod", {
    token: sessionToken,
    scope: orderScope,
  });
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
  const shippingOwners = useConvexQuery<ShippingOwnerOptions>("orders:shippingOwners", {
    token: sessionToken,
    scope: orderScope,
  });

  const [order, setOrder] = useState<OrderWithProduct | null>(null);
  const isLoading = queryResult === undefined;
  useEffect(() => {
    if (queryResult !== undefined) {
      setOrder(queryResult);
    }
  }, [queryResult]);
  const copyText = useCallback(async (value: string, successMessage: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } else {
        throw new Error("Clipboard nije dostupan.");
      }
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
      return false;
    }
  }, []);

  return { sessionToken, updateOrder, setManualRefund100, deleteOrder, refundPeriodOverview, products, suppliers, shippingOwners, order, setOrder, isLoading, copyText };
}
