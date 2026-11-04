"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { OrderRefundPeriodOverview } from "@/types/order";

type UseRefundPeriodParams = {
  orderScope: "default" | "kalaba";
  sessionToken: string;
  resetOrdersFeed: () => void;
};

export function useRefundPeriod({ orderScope, sessionToken, resetOrdersFeed }: UseRefundPeriodParams) {
  const [refundPeriodModalOpen, setRefundPeriodModalOpen] = useState(false);
  const [refundPeriodStart, setRefundPeriodStart] = useState("");
  const [refundPeriodEnd, setRefundPeriodEnd] = useState("");
  const [isRefundPeriodSaving, setIsRefundPeriodSaving] = useState(false);
  const refundPeriodOverview = useConvexQuery<OrderRefundPeriodOverview>("orders:refundPeriod", {
    token: sessionToken,
    scope: orderScope,
  });
  const setRefundPeriod = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    startDate: string;
    endDate: string;
  }>("orders:setRefundPeriod");
  const clearRefundPeriod = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
  }>("orders:clearRefundPeriod");
  // "U toku" preko ref-a (dvoklik na Sačuvaj/Ukloni).
  const savingRef = useRef(false);
  const openRefundPeriodModal = useCallback(() => {
    setRefundPeriodStart(refundPeriodOverview?.period?.startDate ?? "");
    setRefundPeriodEnd(refundPeriodOverview?.period?.endDate ?? "");
    setRefundPeriodModalOpen(true);
  }, [refundPeriodOverview?.period]);

  const handleSaveRefundPeriod = useCallback(async () => {
    if (!refundPeriodStart || !refundPeriodEnd) {
      toast.error("Izaberi oba datuma: „Od“ i „Do“.");
      return;
    }
    if (refundPeriodStart > refundPeriodEnd) {
      toast.error("Datum „Od“ ne može biti posle datuma „Do“.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setIsRefundPeriodSaving(true);
    try {
      await setRefundPeriod({
        token: sessionToken,
        scope: orderScope,
        startDate: refundPeriodStart,
        endDate: refundPeriodEnd,
      });
      resetOrdersFeed();
      setRefundPeriodModalOpen(false);
      toast.success("Period 100% povrata je sačuvan.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Period nije sačuvan.");
    } finally {
      savingRef.current = false;
      setIsRefundPeriodSaving(false);
    }
  }, [
    orderScope,
    refundPeriodEnd,
    refundPeriodStart,
    resetOrdersFeed,
    sessionToken,
    setRefundPeriod,
  ]);

  const handleClearRefundPeriod = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsRefundPeriodSaving(true);
    try {
      await clearRefundPeriod({ token: sessionToken, scope: orderScope });
      resetOrdersFeed();
      setRefundPeriodStart("");
      setRefundPeriodEnd("");
      setRefundPeriodModalOpen(false);
      toast.success("Period 100% povrata je uklonjen.");
    } catch (error) {
      console.error(error);
      toast.error("Period nije uklonjen.");
    } finally {
      savingRef.current = false;
      setIsRefundPeriodSaving(false);
    }
  }, [clearRefundPeriod, orderScope, resetOrdersFeed, sessionToken]);


  return { refundPeriodModalOpen, setRefundPeriodModalOpen, refundPeriodStart, setRefundPeriodStart, refundPeriodEnd, setRefundPeriodEnd, isRefundPeriodSaving, refundPeriodOverview, openRefundPeriodModal, handleSaveRefundPeriod, handleClearRefundPeriod };
}

