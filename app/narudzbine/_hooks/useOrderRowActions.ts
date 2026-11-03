"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useConvexMutation } from "@/lib/convex";
import type { Order, OrderStage } from "@/types/order";
import { type QuickEditField, type QuickEditState, type ShipmentStageModalState } from "../_lib/types";
import { resolveShipmentNumber, resolveProfitPercent } from "../_lib/helpers";
import type { Dispatch, SetStateAction } from "react";

type UseOrderRowActionsParams = {
  orderScope: "default" | "kalaba";
  sessionToken: string;
  stageFilters: OrderStage[];
  showUnreturnedOnly: boolean;
  showReturnedOnly: boolean;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  updateOrder: ReturnType<typeof useConvexMutation>;
};

export function useOrderRowActions({ orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, updateOrder }: UseOrderRowActionsParams) {
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [isQuickEditSaving, setIsQuickEditSaving] = useState(false);
  const [shipmentStageModal, setShipmentStageModal] = useState<ShipmentStageModalState | null>(null);
  const [shipmentNumberDraft, setShipmentNumberDraft] = useState("");
  const [isShipmentStageSaving, setIsShipmentStageSaving] = useState(false);
  const [manualRefundSavingId, setManualRefundSavingId] = useState<string | null>(null);
  const [kasniSavingId, setKasniSavingId] = useState<string | null>(null);
  const setManualRefund100 = useConvexMutation<{
    token: string;
    id: string;
    scope: "default" | "kalaba";
    enabled: boolean;
  }, {
    enabled: boolean;
    changedAt: number | null;
  }>("orders:setManualRefund100");
  const copyText = useCallback(async (value: string, successMessage: string) => {
    const text = value.trim();
    if (!text) {
      toast.error("Nema vrednosti za kopiranje.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "true");
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  }, []);

  const openQuickEdit = useCallback((order: Order, field: QuickEditField) => {
    if (field === "contact") {
      setQuickEdit({
        field,
        order,
        customerName: order.customerName ?? "",
        phone: order.phone ?? "",
      });
      return;
    }
    if (field === "address") {
      setQuickEdit({
        field,
        order,
        address: order.address ?? "",
      });
      return;
    }
    if (field === "transport") {
      setQuickEdit({
        field,
        order,
        transportCost: order.transportCost !== undefined && order.transportCost !== null ? String(order.transportCost) : "",
      });
      return;
    }
    setQuickEdit({
      field,
      order,
      myProfitPercent: String(resolveProfitPercent(order.myProfitPercent)),
    });
  }, [resolveProfitPercent]);

  const buildOrderUpdatePayload = useCallback(
    (order: Order) => ({
      token: sessionToken,
      scope: orderScope,
      id: order._id,
      stage: order.stage,
      productId: order.productId,
      supplierId: order.supplierId,
      variantId: order.variantId,
      variantLabel: order.variantLabel,
      title: order.title,
      kolicina: order.kolicina,
      nabavnaCena: order.nabavnaCena,
      prodajnaCena: order.prodajnaCena,
      customerName: order.customerName,
      address: order.address,
      phone: order.phone,
      transportCost: order.transportCost,
      slanjeMode: order.slanjeMode,
      slanjeOwner: order.slanjeOwner,
      myProfitPercent: order.myProfitPercent,
      pickup: order.pickup,
      napomena: order.napomena,
      brojPosiljke: order.brojPosiljke,
      povratVracen: order.povratVracen,
      kasni: order.kasni,
      items: order.items,
    }),
    [orderScope, sessionToken],
  );

  const applyQuickUpdate = useCallback(
    async (order: Order, patch: Partial<Order>, successMessage?: string) => {
      const next = { ...order, ...patch };
      try {
        await updateOrder(buildOrderUpdatePayload(next));
        setOrders((prev) => prev.map((item) => (item._id === order._id ? { ...item, ...patch } : item)));
        toast.success(successMessage ?? "Sacuvano.");
        setQuickEdit(null);
      } catch (error) {
        console.error(error);
        toast.error("Cuvanje nije uspelo.");
      }
    },
    [buildOrderUpdatePayload, updateOrder, setOrders],
  );

  const closeQuickEdit = useCallback(() => {
    if (isQuickEditSaving) return;
    setQuickEdit(null);
  }, [isQuickEditSaving]);

  const handleQuickEditSave = async () => {
    if (!quickEdit || isQuickEditSaving) return;
    const parseNumber = (value: string) => Number(value.replace(",", "."));
    setIsQuickEditSaving(true);
    try {
      if (quickEdit.field === "transport") {
        const trimmed = quickEdit.transportCost.trim();
        let nextCost: number | undefined;
        if (trimmed.length > 0) {
          const parsed = parseNumber(trimmed);
          if (!Number.isFinite(parsed) || parsed < 0) {
            toast.error("Transport mora biti 0 ili vise.");
            return;
          }
          nextCost = parsed;
        }
        await applyQuickUpdate(quickEdit.order, { transportCost: nextCost }, "Sacuvano.");
        return;
      }

      if (quickEdit.field === "contact") {
        const name = quickEdit.customerName.trim();
        const phone = quickEdit.phone.trim();
        if (name.length < 2) {
          toast.error("Popuni ime i prezime.");
          return;
        }
        if (phone.length < 2) {
          toast.error("Popuni broj telefona.");
          return;
        }
        await applyQuickUpdate(quickEdit.order, { customerName: name, phone }, "Sacuvano.");
        return;
      }

      if (quickEdit.field === "address") {
        const address = quickEdit.address.trim();
        if (address.length < 2) {
          toast.error("Popuni adresu.");
          return;
        }
        await applyQuickUpdate(quickEdit.order, { address }, "Sacuvano.");
        return;
      }

      const trimmed = quickEdit.myProfitPercent.trim();
      if (!trimmed) {
        toast.error("Unesi procenat profita.");
        return;
      }
      const percent = parseNumber(trimmed);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error("Procenat mora biti izmedju 0 i 100.");
        return;
      }
      await applyQuickUpdate(quickEdit.order, { myProfitPercent: percent }, "Sacuvano.");
    } finally {
      setIsQuickEditSaving(false);
    }
  };

  const persistStageChange = useCallback(
    async (order: Order, nextStage: OrderStage, patch: Partial<Order> = {}) => {
      await updateOrder({ ...buildOrderUpdatePayload(order), stage: nextStage, ...patch });
      setOrders((prev) =>
        prev.flatMap((item) => {
          if (item._id !== order._id) return [item];
          if (stageFilters.length > 0 && !stageFilters.includes(nextStage)) return [];
          return [{ ...item, stage: nextStage, ...patch }];
        }),
      );
      toast.success("Status narudzbine promenjen.");
    },
    [buildOrderUpdatePayload, stageFilters, updateOrder, setOrders],
  );

  const closeShipmentStageModal = useCallback(() => {
    if (isShipmentStageSaving) return;
    setShipmentStageModal(null);
    setShipmentNumberDraft("");
  }, [isShipmentStageSaving]);

  const openShipmentStageModal = useCallback((order: Order, nextStage: OrderStage) => {
    setShipmentStageModal({ order, nextStage });
    setShipmentNumberDraft(resolveShipmentNumber(order));
  }, []);

  const handleShipmentStageSubmit = useCallback(async () => {
    if (!shipmentStageModal || isShipmentStageSaving) return;
    const shipmentNumber = shipmentNumberDraft.trim();
    if (!shipmentNumber) {
      toast.error("Unesi broj porudzbine.");
      return;
    }
    setIsShipmentStageSaving(true);
    try {
      await persistStageChange(shipmentStageModal.order, shipmentStageModal.nextStage, { brojPosiljke: shipmentNumber });
      setShipmentStageModal(null);
      setShipmentNumberDraft("");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce promeniti status.");
    } finally {
      setIsShipmentStageSaving(false);
    }
  }, [isShipmentStageSaving, persistStageChange, shipmentNumberDraft, shipmentStageModal]);

  const handleStageChange = async (order: Order, nextStage: OrderStage) => {
    if (nextStage === "poslato") {
      openShipmentStageModal(order, nextStage);
      return;
    }
    try {
      await persistStageChange(order, nextStage);
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce promeniti status.");
    }
  };

  const handlePovratToggle = async (order: Order, nextValue: boolean) => {
    try {
      await updateOrder({ ...buildOrderUpdatePayload(order), povratVracen: nextValue });
      setOrders((prev) =>
        prev.flatMap((item) => {
          if (item._id !== order._id) return [item];
          if (showUnreturnedOnly && nextValue) return [];
          if (showReturnedOnly && !nextValue) return [];
          return [{ ...item, povratVracen: nextValue }];
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati povrat.");
    }
  };

  const handleKasniToggle = async (order: Order, nextValue: boolean) => {
    if (kasniSavingId) return;
    setKasniSavingId(order._id);
    try {
      await updateOrder({ ...buildOrderUpdatePayload(order), kasni: nextValue });
      setOrders((prev) =>
        prev.map((item) =>
          item._id === order._id
            ? { ...item, kasni: nextValue, kasniAt: nextValue ? Date.now() : undefined }
            : item,
        ),
      );
      toast.success(nextValue ? "Označeno da kasni." : "Oznaka kašnjenja je uklonjena.");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati oznaku kašnjenja.");
    } finally {
      setKasniSavingId(null);
    }
  };

  const handleManualRefund100Toggle = async (order: Order, enabled: boolean) => {
    if (manualRefundSavingId) return;
    setManualRefundSavingId(order._id);
    try {
      const result = await setManualRefund100({
        token: sessionToken,
        id: order._id,
        scope: orderScope,
        enabled,
      });
      setOrders((previous) =>
        previous.map((item) =>
          item._id === order._id
            ? {
                ...item,
                manualRefund100: result.enabled,
                manualRefund100At: result.changedAt ?? undefined,
              }
            : item,
        ),
      );
      toast.success(enabled ? "Porudžbina je ručno dodata u povrat 100%." : "Ručna oznaka 100% je uklonjena.");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguće sačuvati ručni povrat 100%.");
    } finally {
      setManualRefundSavingId(null);
    }
  };


  return { quickEdit, setQuickEdit, isQuickEditSaving, shipmentStageModal, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, manualRefundSavingId, kasniSavingId, copyText, openQuickEdit, closeQuickEdit, handleQuickEditSave, closeShipmentStageModal, handleShipmentStageSubmit, handleStageChange, handlePovratToggle, handleKasniToggle, handleManualRefund100Toggle };
}

