"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { OrderItem, OrderStage, OrderWithProduct } from "@/types/order";
import { resolveShipmentNumber } from "../_lib/detailHelpers";
import { composeVariantLabel, generateId, getProductDisplayName, pickBestSupplier, resolveSupplierOptions } from "../../_lib/helpers";
import type { useOrderDetailData } from "./useOrderDetailData";
import type { useOrderItemDraft } from "./useOrderItemDraft";

type UseOrderDetailUpdatesParams = {
  orderScope: "default" | "kalaba";
  sessionToken: ReturnType<typeof useOrderDetailData>["sessionToken"];
  updateOrder: ReturnType<typeof useOrderDetailData>["updateOrder"];
  setManualRefund100: ReturnType<typeof useOrderDetailData>["setManualRefund100"];
  order: ReturnType<typeof useOrderDetailData>["order"];
  setOrder: ReturnType<typeof useOrderDetailData>["setOrder"];
  draft: ReturnType<typeof useOrderItemDraft>;
};

/**
 * Sve izmene narudžbine na detalju. Svaka ide kroz `applyOrderUpdate`: optimistički lokalni red, pun
 * `orders:update` payload iz lokalne kopije, rollback na grešku (isto kao ranije). Ručni 100% ima svoju mutaciju.
 */
export function useOrderDetailUpdates({ orderScope, sessionToken, updateOrder, setManualRefund100, order, setOrder, draft }: UseOrderDetailUpdatesParams) {
  const { itemVariantId, itemSupplierId, itemQuantity, useManualPurchasePrice, manualPurchasePrice, useManualSalePrice, manualSalePrice, productInputRef, supplierMap, selectedProduct, resetItemDraft } = draft;
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isManualRefundSaving, setIsManualRefundSaving] = useState(false);
  const [isKasniSaving, setIsKasniSaving] = useState(false);
  const [shipmentStageModalOpen, setShipmentStageModalOpen] = useState(false);
  const [shipmentNumberDraft, setShipmentNumberDraft] = useState("");
  const [isShipmentStageSaving, setIsShipmentStageSaving] = useState(false);
  // "U toku" preko ref-a: dvoklik ne šalje dve izmene (state stiže tek u sledećem renderu).
  const inFlightRef = useRef(new Set<string>());

  const runGuarded = async (key: string, task: () => Promise<void>) => {
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    try {
      await task();
    } finally {
      inFlightRef.current.delete(key);
    }
  };

  const buildOrderUpdatePayload = (current: OrderWithProduct) => ({
    token: sessionToken,
    id: current._id,
    scope: orderScope,
    stage: current.stage,
    productId: current.productId,
    supplierId: current.supplierId,
    variantId: current.variantId,
    variantLabel: current.variantLabel,
    title: current.title,
    kolicina: Math.max(current.kolicina ?? 1, 1),
    nabavnaCena: current.nabavnaCena,
    prodajnaCena: current.prodajnaCena,
    napomena: current.napomena,
    brojPosiljke: current.brojPosiljke,
    transportCost: current.transportCost,
    slanjeMode: current.slanjeMode,
    slanjeOwner: current.slanjeOwner,
    myProfitPercent: current.myProfitPercent,
    customerName: current.customerName,
    address: current.address,
    phone: current.phone,
    povratVracen: current.povratVracen,
    // Isto kao lista (updateFromFresh): server ga i inače čuva, a ovako može i da se menja sa detalja.
    kasni: current.kasni,
    pickup: current.pickup ?? false,
    items: current.items?.map((item): OrderItem => {
      const rest: OrderItem & { product?: unknown } = { ...item };
      delete rest.product;
      return rest;
    }),
  });

  const applyOrderUpdate = async (updater: (current: OrderWithProduct) => OrderWithProduct, successMessage?: string) => {
    if (!order) return;
    const previous = order;
    const next = updater(previous);
    setOrder(next);
    try {
      await updateOrder(buildOrderUpdatePayload(next));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      console.error(error);
      setOrder(previous);
      toast.error("Čuvanje nije uspelo.");
      throw error;
    }
  };

  const handleAddItem = async () => {
    if (!order) return;
    if (isAddingItem || inFlightRef.current.has("item")) return;
    if (!selectedProduct) {
      toast.error("Izaberi proizvod koji dodaješ u narudžbinu.");
      productInputRef.current?.focus();
      return;
    }
    const variantsList = selectedProduct.variants ?? [];
    let variant = variantsList.find((item) => item.id === itemVariantId);
    if (variantsList.length > 0 && !variant) {
      variant = variantsList.find((item) => item.isDefault) ?? variantsList[0];
    }
    const supplierOptionsLocal = resolveSupplierOptions(selectedProduct, variant?.id);
    const supplierOptionsWithNamesLocal = supplierOptionsLocal.map((option) => ({
      ...option,
      supplierName: supplierMap.get(option.supplierId)?.name,
    }));
    const bestSupplierLocal = pickBestSupplier(supplierOptionsWithNamesLocal);
    const supplierId =
      itemSupplierId || (supplierOptionsWithNamesLocal.length === 1 ? supplierOptionsWithNamesLocal[0].supplierId : undefined);
    const supplierPrice = supplierId
      ? (supplierOptionsWithNamesLocal.find((option) => option.supplierId === supplierId)?.price ?? bestSupplierLocal?.price)
      : bestSupplierLocal?.price;
    let nabavnaCena = supplierPrice ?? variant?.nabavnaCena ?? selectedProduct.nabavnaCena;
    if (useManualPurchasePrice) {
      const manualInput = manualPurchasePrice.trim();
      const parsed = Number(manualInput.replace(",", "."));
      if (manualInput.length === 0 || !Number.isFinite(parsed) || parsed < 0) {
        toast.error("Unesi ručnu nabavnu cenu (0 ili više).");
        return;
      }
      nabavnaCena = parsed;
    }
    let prodajnaCena = variant?.prodajnaCena ?? selectedProduct.prodajnaCena;
    if (useManualSalePrice) {
      const manualInput = manualSalePrice.trim();
      const parsed = Number(manualInput.replace(",", "."));
      if (manualInput.length === 0 || !Number.isFinite(parsed) || parsed < 0) {
        toast.error("Unesi ručnu prodajnu cenu (0 ili više).");
        return;
      }
      prodajnaCena = parsed;
    }
    const variantLabel = variant ? composeVariantLabel(selectedProduct, variant) : undefined;
    const title = variantLabel ?? getProductDisplayName(selectedProduct);
    const qty = Math.max(itemQuantity, 1);
    const newItem = {
      id: generateId(),
      productId: selectedProduct._id,
      supplierId: supplierId || undefined,
      variantId: variant?.id,
      variantLabel,
      title,
      kolicina: qty,
      nabavnaCena,
      prodajnaCena,
      manualProdajna: useManualSalePrice,
      manualNabavna: useManualPurchasePrice,
      product: selectedProduct,
    };

    let added = false;
    await runGuarded("item", async () => {
      setIsAddingItem(true);
      try {
        await applyOrderUpdate((current) => ({ ...current, items: [...(current.items ?? []), newItem] }), "Stavka je dodata.");
        resetItemDraft();
        added = true;
      } catch (error) {
        console.error(error);
      } finally {
        setIsAddingItem(false);
      }
    });
    return added;
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!order) return;
    const currentItems = order.items ?? [];
    if (currentItems.length <= 1) {
      toast.error("Ne možeš obrisati jedini proizvod u narudžbini.");
      return;
    }
    const nextItems = currentItems.filter((item) => item.id !== itemId);
    if (nextItems.length === currentItems.length) return;
    await runGuarded("item", async () => {
      await applyOrderUpdate((current) => ({ ...current, items: nextItems }), "Stavka je obrisana.");
    });
  };

  const closeShipmentStageModal = () => {
    if (isShipmentStageSaving) return;
    setShipmentStageModalOpen(false);
    setShipmentNumberDraft("");
  };

  const handleShipmentStageSubmit = async () => {
    if (!order || isShipmentStageSaving) return;
    const shipmentNumber = shipmentNumberDraft.trim();
    if (!shipmentNumber) {
      toast.error("Unesi broj pošiljke.");
      return;
    }
    await runGuarded("stage", async () => {
      setIsShipmentStageSaving(true);
      setIsUpdatingStage(true);
      try {
        await applyOrderUpdate((current) => ({ ...current, stage: "poslato", brojPosiljke: shipmentNumber }), "Status narudžbine je ažuriran.");
        setShipmentStageModalOpen(false);
        setShipmentNumberDraft("");
      } catch (error) {
        console.error(error);
      } finally {
        setIsShipmentStageSaving(false);
        setIsUpdatingStage(false);
      }
    });
  };

  const handleStageChange = async (nextStage: OrderStage) => {
    if (!order) return;
    if (nextStage === "poslato") {
      setShipmentStageModalOpen(true);
      setShipmentNumberDraft(resolveShipmentNumber(order));
      return;
    }
    if (nextStage === order.stage) return;
    await runGuarded("stage", async () => {
      setIsUpdatingStage(true);
      try {
        await applyOrderUpdate((current) => ({ ...current, stage: nextStage }), "Status narudžbine je ažuriran.");
      } catch (error) {
        console.error(error);
      } finally {
        setIsUpdatingStage(false);
      }
    });
  };

  const handlePovratToggle = async (nextValue: boolean) => {
    if (!order) return;
    await runGuarded("povrat", async () => {
      try {
        await applyOrderUpdate((current) => ({ ...current, povratVracen: nextValue }), "Povrat je sačuvan.");
      } catch (error) {
        console.error(error);
      }
    });
  };

  const handleKasniToggle = async (nextValue: boolean) => {
    if (!order) return;
    await runGuarded("kasni", async () => {
      setIsKasniSaving(true);
      try {
        await applyOrderUpdate(
          (current) => ({ ...current, kasni: nextValue, kasniAt: nextValue ? Date.now() : undefined }),
          nextValue ? "Označeno da kasni." : "Oznaka kašnjenja je uklonjena.",
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsKasniSaving(false);
      }
    });
  };

  const handleManualRefund100Toggle = async (enabled: boolean) => {
    if (!order || isManualRefundSaving) return;
    await runGuarded("manual100", async () => {
      const previous = order;
      setIsManualRefundSaving(true);
      setOrder({
        ...order,
        manualRefund100: enabled,
        manualRefund100At: enabled ? Date.now() : undefined,
      });
      try {
        const result = await setManualRefund100({
          token: sessionToken,
          id: order._id,
          scope: orderScope,
          enabled,
        });
        setOrder((current) =>
          current
            ? {
                ...current,
                manualRefund100: result.enabled,
                manualRefund100At: result.changedAt ?? undefined,
              }
            : current,
        );
        toast.success(enabled ? "Narudžbina je ručno dodata u 100% povrat." : "Ručna oznaka 100% je uklonjena.");
      } catch (error) {
        console.error(error);
        setOrder(previous);
        toast.error("Nije moguće sačuvati ručni 100% povrat.");
      } finally {
        setIsManualRefundSaving(false);
      }
    });
  };

  return {
    isUpdatingStage,
    isAddingItem,
    isManualRefundSaving,
    isKasniSaving,
    shipmentStageModalOpen,
    shipmentNumberDraft,
    setShipmentNumberDraft,
    isShipmentStageSaving,
    applyOrderUpdate,
    handleAddItem,
    handleRemoveItem,
    closeShipmentStageModal,
    handleShipmentStageSubmit,
    handleStageChange,
    handlePovratToggle,
    handleKasniToggle,
    handleManualRefund100Toggle,
  };
}
