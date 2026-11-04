"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { OrderStage, OrderWithProduct } from "@/types/order";
import { resolveShipmentNumber } from "../_lib/detailHelpers";
import { slanjeModes } from "../../_lib/types";
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
  itemVariantId: ReturnType<typeof useOrderItemDraft>["itemVariantId"];
  itemSupplierId: ReturnType<typeof useOrderItemDraft>["itemSupplierId"];
  itemQuantity: ReturnType<typeof useOrderItemDraft>["itemQuantity"];
  useManualPurchasePrice: ReturnType<typeof useOrderItemDraft>["useManualPurchasePrice"];
  manualPurchasePrice: ReturnType<typeof useOrderItemDraft>["manualPurchasePrice"];
  useManualSalePrice: ReturnType<typeof useOrderItemDraft>["useManualSalePrice"];
  manualSalePrice: ReturnType<typeof useOrderItemDraft>["manualSalePrice"];
  productInputRef: ReturnType<typeof useOrderItemDraft>["productInputRef"];
  supplierMap: ReturnType<typeof useOrderItemDraft>["supplierMap"];
  selectedProduct: ReturnType<typeof useOrderItemDraft>["selectedProduct"];
  resetItemDraft: ReturnType<typeof useOrderItemDraft>["resetItemDraft"];
};

export function useOrderDetailUpdates({ orderScope, sessionToken, updateOrder, setManualRefund100, order, setOrder, itemVariantId, itemSupplierId, itemQuantity, useManualPurchasePrice, manualPurchasePrice, useManualSalePrice, manualSalePrice, productInputRef, supplierMap, selectedProduct, resetItemDraft }: UseOrderDetailUpdatesParams) {
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isManualRefundSaving, setIsManualRefundSaving] = useState(false);
  const [shipmentStageModalOpen, setShipmentStageModalOpen] = useState(false);
  const [shipmentNumberDraft, setShipmentNumberDraft] = useState("");
  const [isShipmentStageSaving, setIsShipmentStageSaving] = useState(false);
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
    pickup: current.pickup ?? false,
    items: current.items?.map((item) => {
      const { product, ...rest } = item as any;
      return rest;
    }),
  });

  const applyOrderUpdate = async (
    updater: (current: OrderWithProduct) => OrderWithProduct,
    successMessage?: string,
  ) => {
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
      toast.error("Cuvanje nije uspelo.");
      throw error;
    }
  };

  const handleOrderFieldSave = async (
    field:
      | "title"
      | "variantLabel"
      | "kolicina"
      | "nabavnaCena"
      | "prodajnaCena"
      | "transportCost"
      | "slanjeMode"
      | "slanjeOwner"
      | "myProfitPercent"
      | "customerName"
      | "address"
      | "phone"
      | "napomena",
    value: string,
  ) => {
    if (!order) return;
    const trimmed = value.trim();

    const parseNumber = (input: string) => Number(input.replace(",", "."));

    if (field === "kolicina") {
      const qty = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error("Kolicina mora biti 1 ili vise.");
        throw new Error("Invalid quantity");
      }
      await applyOrderUpdate((current) => ({ ...current, kolicina: qty }), "Sacuvano.");
      return;
    }

    if (field === "nabavnaCena" || field === "prodajnaCena") {
      const price = parseNumber(trimmed);
      if (!Number.isFinite(price) || price < 0) {
        toast.error("Cena mora biti 0 ili vise.");
        throw new Error("Invalid price");
      }
      await applyOrderUpdate((current) => ({ ...current, [field]: price }), "Sacuvano.");
      return;
    }

    if (field === "transportCost") {
      if (!trimmed) {
        await applyOrderUpdate((current) => ({ ...current, transportCost: undefined }), "Sacuvano.");
        return;
      }
      const cost = parseNumber(trimmed);
      if (!Number.isFinite(cost) || cost < 0) {
        toast.error("Transport mora biti 0 ili vise.");
        throw new Error("Invalid transport");
      }
      await applyOrderUpdate((current) => ({ ...current, transportCost: cost }), "Sacuvano.");
      return;
    }

    if (field === "myProfitPercent") {
      if (!trimmed) {
        toast.error("Unesi procenat profita.");
        throw new Error("Invalid percent");
      }
      const percent = parseNumber(trimmed);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error("Procenat mora biti izmedju 0 i 100.");
        throw new Error("Invalid percent");
      }
      await applyOrderUpdate((current) => ({ ...current, myProfitPercent: percent }), "Sacuvano.");
      return;
    }

    if (field === "slanjeMode") {
      const normalized = slanjeModes.find((mode) => mode.toLowerCase() === trimmed.toLowerCase());
      await applyOrderUpdate(
        (current) => ({
          ...current,
          slanjeMode: normalized,
          slanjeOwner: normalized ? current.slanjeOwner : undefined,
        }),
        "Sacuvano.",
      );
      return;
    }

    if (field === "slanjeOwner") {
      if (!order.slanjeMode) {
        toast.error("Prvo izaberi slanje.");
        throw new Error("Missing slanje");
      }
      if (!trimmed) {
        await applyOrderUpdate((current) => ({ ...current, slanjeOwner: undefined }), "Sacuvano.");
        return;
      }
      await applyOrderUpdate((current) => ({ ...current, slanjeOwner: trimmed }), "Sacuvano.");
      return;
    }

    if (field === "napomena") {
      await applyOrderUpdate(
        (current) => ({
          ...current,
          napomena: trimmed.length === 0 ? undefined : trimmed,
        }),
        "Sacuvano.",
      );
      return;
    }

    if (field === "variantLabel") {
      await applyOrderUpdate((current) => ({ ...current, variantLabel: trimmed || undefined }), "Sacuvano.");
      return;
    }

    if (field === "title" || field === "customerName" || field === "address" || field === "phone") {
      if (trimmed.length < 2) {
        toast.error("Popuni polje.");
        throw new Error("Invalid field");
      }
      await applyOrderUpdate((current) => ({ ...current, [field]: trimmed }), "Sacuvano.");
    }
  };

  const handlePickupToggle = async (value: boolean) => {
    await applyOrderUpdate(
      (current) => ({
        ...current,
        pickup: value,
      }),
      "Sacuvano.",
    );
  };

  const handleAddItem = async () => {
    if (!order) return;
    if (isAddingItem) return;
    if (!selectedProduct) {
      toast.error("Izaberi proizvod koji dodajes u narudzbinu.");
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
    const supplierPrice =
      supplierId
        ? supplierOptionsWithNamesLocal.find((option) => option.supplierId === supplierId)?.price ?? bestSupplierLocal?.price
        : bestSupplierLocal?.price;
    let nabavnaCena = supplierPrice ?? variant?.nabavnaCena ?? selectedProduct.nabavnaCena;
    if (useManualPurchasePrice) {
      const manualInput = manualPurchasePrice.trim();
      if (manualInput.length === 0) {
        toast.error("Unesi rucnu nabavnu cenu (0 ili vise).");
        return;
      }
      const parsed = Number(manualInput.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Unesi rucnu nabavnu cenu (0 ili vise).");
        return;
      }
      nabavnaCena = parsed;
    }
    let prodajnaCena = variant?.prodajnaCena ?? selectedProduct.prodajnaCena;
    if (useManualSalePrice) {
      const manualInput = manualSalePrice.trim();
      if (manualInput.length === 0) {
        toast.error("Unesi rucnu prodajnu cenu (0 ili vise).");
        return;
      }
      const parsed = Number(manualInput.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Unesi rucnu prodajnu cenu (0 ili vise).");
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

    setIsAddingItem(true);
    try {
      await applyOrderUpdate(
        (current) => ({
          ...current,
          items: [...(current.items ?? []), newItem],
        }),
        "Stavka je dodata.",
      );
      resetItemDraft();
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!order) return;
    const currentItems = order.items ?? [];
    if (currentItems.length <= 1) {
      toast.error("Ne mozes obrisati jedini proizvod u narudzbini.");
      return;
    }
    const nextItems = currentItems.filter((item) => item.id !== itemId);
    if (nextItems.length === currentItems.length) return;
    await applyOrderUpdate((current) => ({ ...current, items: nextItems }), "Stavka je obrisana.");
  };

  const closeShipmentStageModal = useCallback(() => {
    if (isShipmentStageSaving) return;
    setShipmentStageModalOpen(false);
    setShipmentNumberDraft("");
  }, [isShipmentStageSaving]);

  const handleShipmentStageSubmit = useCallback(async () => {
    if (!order || isShipmentStageSaving) return;
    const shipmentNumber = shipmentNumberDraft.trim();
    if (!shipmentNumber) {
      toast.error("Unesi broj porudzbine.");
      return;
    }
    setIsShipmentStageSaving(true);
    setIsUpdatingStage(true);
    try {
      await applyOrderUpdate(
        (current) => ({ ...current, stage: "poslato", brojPosiljke: shipmentNumber }),
        "Status narudzbine je azuriran.",
      );
      setShipmentStageModalOpen(false);
      setShipmentNumberDraft("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsShipmentStageSaving(false);
      setIsUpdatingStage(false);
    }
  }, [applyOrderUpdate, isShipmentStageSaving, order, shipmentNumberDraft]);

  const handleStageChange = async (nextStage: OrderStage) => {
    if (!order) return;
    if (nextStage === "poslato") {
      setShipmentStageModalOpen(true);
      setShipmentNumberDraft(resolveShipmentNumber(order));
      return;
    }
    setIsUpdatingStage(true);
    try {
      await applyOrderUpdate((current) => ({ ...current, stage: nextStage }), "Status narudzbine je azuriran.");
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handlePovratToggle = async (nextValue: boolean) => {
    if (!order) return;
    try {
      await applyOrderUpdate((current) => ({ ...current, povratVracen: nextValue }), "Povrat je sacuvan.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleManualRefund100Toggle = async (enabled: boolean) => {
    if (!order || isManualRefundSaving) return;
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
      toast.success(enabled ? "Porudžbina je ručno dodata u povrat 100%." : "Ručna oznaka 100% je uklonjena.");
    } catch (error) {
      console.error(error);
      setOrder(previous);
      toast.error("Nije moguće sačuvati ručni povrat 100%.");
    } finally {
      setIsManualRefundSaving(false);
    }
  };


  return { isUpdatingStage, isAddingItem, isManualRefundSaving, shipmentStageModalOpen, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, handleOrderFieldSave, handlePickupToggle, handleAddItem, handleRemoveItem, closeShipmentStageModal, handleShipmentStageSubmit, handleStageChange, handlePovratToggle, handleManualRefund100Toggle };
}
