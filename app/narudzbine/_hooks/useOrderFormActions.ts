"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useEffectEvent, useMemo } from "react";
import { toast } from "sonner";
import { useConvexMutation } from "@/lib/convex";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/order";
import { type OrderItemDraft } from "../_lib/types";
import { normalizeOwnerLookupKey, generateId, getProductDisplayName, composeVariantLabel, resolveSupplierOptions, pickBestSupplier } from "../_lib/helpers";
import { type OrderFormValues, defaultFormValues, orderFocusOrder, findFirstErrorPath } from "../_lib/orderForm";
import type { useRouter, useSearchParams } from "next/navigation";
import type { Supplier } from "@/types/order";
import type { useOrderForm } from "./useOrderForm";

type UseOrderFormActionsParams = {
  basePath: string;
  orderScope: "default" | "kalaba";
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  searchParamsString: string;
  sessionToken: string;
  resetOrdersFeed: () => void;
  updateOrder: ReturnType<typeof useConvexMutation>;
  products: Product[] | undefined;
  supplierMap: Map<string, Supplier>;
  orderForm: ReturnType<typeof useOrderForm>;
};

export function useOrderFormActions({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, resetOrdersFeed, updateOrder, products, supplierMap, orderForm }: UseOrderFormActionsParams) {
  const { productInput, setProductInput, setProductSearch, setProductMenuOpen, editingOrder, setEditingOrder, editingOrderId, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, draftItems, setDraftItems, itemProductId, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, customerQuery, setCustomerQuery, setCustomerMenuOpen, productInputRef, previousSlanjeModeRef, previousPickupValueRef, lastAutoSelectedOwnerRef, modalSnapshotRef, wasModalOpenRef, preselectHandledRef, didSyncCustomersRef, preselectProductId, customers, shippingOwners, form, selectedProduct, selectedVariants, supplierOptionsWithNames } = orderForm;
  const createOrder = useConvexMutation("orders:create");
  const upsertShippingAccount = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    value: string;
    startingAmount: number;
  }>("orders:upsertShippingAccount");
  const syncCustomers = useConvexMutation("customers:syncFromOrders");
  const focusOrderField = useCallback(
    (fieldName: keyof OrderFormValues | string) => {
      const targetName = String(fieldName);
      requestAnimationFrame(() => {
        try {
          form.setFocus(targetName as any, { shouldSelect: true });
          return;
        } catch {
          // fall through to DOM query
        }
        const fromRef = productInputRef.current && productInputRef.current.name === targetName ? productInputRef.current : null;
        const node =
          fromRef ??
          document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${targetName}"]`) ??
          document.querySelector<HTMLElement>(`[data-focus-target="${targetName}"]`);
        if (node) {
          node.focus();
          if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
            node.select();
          }
        }
      });
    },
    [form, productInputRef],
  );

  const getOrderErrorTarget = useCallback(() => {
    return findFirstErrorPath(form.formState.errors, orderFocusOrder);
  }, [form.formState.errors]);

  const buildModalSnapshot = useCallback(() => {
    const values = form.getValues();
    return JSON.stringify({
      editingOrderId,
      form: {
        stage: values.stage ?? "poruceno",
        customerName: values.customerName?.trim() ?? "",
        address: values.address?.trim() ?? "",
        phone: values.phone?.trim() ?? "",
        transportCost: values.transportCost ?? null,
        slanjeMode: values.slanjeMode ?? null,
        slanjeOwner: values.slanjeOwner ?? null,
        slanjeOwnerStartingAmount:
          typeof values.slanjeOwnerStartingAmount === "number" ? values.slanjeOwnerStartingAmount : null,
        myProfitPercent: typeof values.myProfitPercent === "number" ? values.myProfitPercent : 100,
        pickup: Boolean(values.pickup),
        note: values.note?.trim() ?? "",
      },
      draftItems: draftItems.map((item) => ({
        id: item.id,
        productId: item.product?._id ?? "",
        variantId: item.variant?.id ?? "",
        supplierId: item.supplierId ?? "",
        kolicina: Number(item.kolicina ?? 0),
        nabavnaCena: Number(item.nabavnaCena ?? 0),
        prodajnaCena: Number(item.prodajnaCena ?? 0),
        manualProdajna: Boolean(item.manualProdajna),
        manualNabavna: Boolean(item.manualNabavna),
        variantLabel: item.variantLabel ?? "",
        title: item.title ?? "",
      })),
      productInput: productInput ?? "",
      itemProductId: itemProductId ?? "",
      itemVariantId: itemVariantId ?? "",
      itemSupplierId: itemSupplierId ?? "",
      itemQuantity: Number(itemQuantity ?? 0),
      useManualSalePrice: Boolean(useManualSalePrice),
      manualSalePrice: manualSalePrice ?? "",
      useManualPurchasePrice: Boolean(useManualPurchasePrice),
      manualPurchasePrice: manualPurchasePrice ?? "",
    });
  }, [
    draftItems,
    editingOrderId,
    form,
    itemProductId,
    itemQuantity,
    itemSupplierId,
    itemVariantId,
    manualPurchasePrice,
    manualSalePrice,
    productInput,
    useManualPurchasePrice,
    useManualSalePrice,
  ]);

  useEffect(() => {
    if (isModalOpen && !wasModalOpenRef.current) {
      modalSnapshotRef.current = buildModalSnapshot();
      setExitConfirmOpen(false);
    }
    if (!isModalOpen && wasModalOpenRef.current) {
      modalSnapshotRef.current = "";
    }
    wasModalOpenRef.current = isModalOpen;
  }, [buildModalSnapshot, isModalOpen, modalSnapshotRef, setExitConfirmOpen, wasModalOpenRef]);

  useEffect(() => {
    if (!isModalOpen) {
      setCustomerMenuOpen(false);
    }
  }, [isModalOpen, setCustomerMenuOpen]);

  useEffect(() => {
    didSyncCustomersRef.current = false;
  }, [orderScope, didSyncCustomersRef]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (didSyncCustomersRef.current) return;
    if (customerQuery.trim()) return;
    if (customers === undefined) return;
    if (customers.length > 0) return;
    didSyncCustomersRef.current = true;
    void syncCustomers({ token: sessionToken, scope: orderScope });
  }, [customerQuery, customers, isModalOpen, orderScope, sessionToken, syncCustomers, didSyncCustomersRef]);

  useEffect(() => {
    if (!selectedProduct || selectedVariants.length === 0) {
      if (itemVariantId) {
        setItemVariantId("");
      }
      return;
    }
    const selectedExists = selectedVariants.some((variant) => variant.id === itemVariantId);
    if (!selectedExists) {
      const fallbackVariant = selectedVariants.find((variant) => variant.isDefault) ?? selectedVariants[0];
      if (fallbackVariant) {
        setItemVariantId(fallbackVariant.id);
        setProductInput(composeVariantLabel(selectedProduct, fallbackVariant));
      }
    }
  }, [itemVariantId, selectedProduct, selectedVariants, setProductInput, setItemVariantId]);

  useEffect(() => {
    if (supplierOptionsWithNames.length === 0) {
      setItemSupplierId("");
      return;
    }
    if (supplierOptionsWithNames.length === 1) {
      setItemSupplierId(supplierOptionsWithNames[0].supplierId);
      return;
    }
    const hasCurrent = supplierOptionsWithNames.some((option) => option.supplierId === itemSupplierId);
    if (!hasCurrent) {
      setItemSupplierId("");
    }
  }, [itemSupplierId, supplierOptionsWithNames, setItemSupplierId]);

  useEffect(() => {
    if (!isModalOpen) return;
    const timer = window.setTimeout(() => focusOrderField("productSearch"), 0);
    return () => window.clearTimeout(timer);
  }, [focusOrderField, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (form.formState.submitCount === 0 && Object.keys(form.formState.errors).length === 0) return;
    const target = getOrderErrorTarget();
    if (!target) return;
    const timer = window.setTimeout(() => focusOrderField(target), 0);
    return () => window.clearTimeout(timer);
  }, [focusOrderField, form.formState.errors, form.formState.submitCount, getOrderErrorTarget, isModalOpen]);

  const resetOrderForm = (options?: { closeModal?: boolean }) => {
    form.reset(defaultFormValues);
    setProductInput("");
    setProductSearch("");
    setProductMenuOpen(false);
    setEditingOrder(null);
    setDraftItems([]);
    setItemProductId("");
    setItemVariantId("");
    setItemSupplierId("");
    setItemQuantity(1);
    setUseManualSalePrice(false);
    setManualSalePrice("");
    setUseManualPurchasePrice(false);
    setManualPurchasePrice("");
    setCustomerQuery("");
    setCustomerMenuOpen(false);
    setExitConfirmOpen(false);
    previousSlanjeModeRef.current = undefined;
    previousPickupValueRef.current = null;
    lastAutoSelectedOwnerRef.current = null;
    if (options?.closeModal) {
      modalSnapshotRef.current = "";
      setIsModalOpen(false);
    }
  };

  const requestCloseOrderModal = () => {
    if (!isModalOpen || exitConfirmOpen) return;
    const snapshot = modalSnapshotRef.current;
    const hasChanges = Boolean(snapshot) && snapshot !== buildModalSnapshot();
    if (hasChanges) {
      setExitConfirmOpen(true);
      return;
    }
    resetOrderForm({ closeModal: true });
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast.error("Izaberi proizvod koji dodajes u narudzbinu.");
      focusOrderField("productSearch");
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
    const draft: OrderItemDraft = {
      id: generateId(),
      product: selectedProduct,
      variant,
      supplierId: supplierId || undefined,
      kolicina: qty,
      nabavnaCena,
      prodajnaCena,
      manualProdajna: useManualSalePrice,
      manualNabavna: useManualPurchasePrice,
      variantLabel,
      title,
    };
    setDraftItems((prev) => [...prev, draft]);
    setItemProductId("");
    setItemVariantId("");
    setItemSupplierId("");
    setItemQuantity(1);
    setUseManualSalePrice(false);
    setManualSalePrice("");
    setUseManualPurchasePrice(false);
    setManualPurchasePrice("");
    setProductInput("");
    setProductMenuOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const draftTotals = useMemo(
    () =>
      draftItems.reduce(
        (acc, item) => {
          acc.totalQty += item.kolicina;
          acc.totalProdajno += item.prodajnaCena * item.kolicina;
          acc.totalNabavno += item.nabavnaCena * item.kolicina;
          return acc;
        },
        { totalQty: 0, totalProdajno: 0, totalNabavno: 0 },
      ),
    [draftItems],
  );

  const openCreateModal = () => {
    resetOrderForm();
    setIsModalOpen(true);
  };

  const openCreateModalWithProduct = useCallback(
    (product: Product) => {
      resetOrderForm();
      setIsModalOpen(true);
      const variants = product.variants ?? [];
      const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
      setItemProductId(product._id);
      setItemVariantId(defaultVariant?.id ?? "");
      setItemSupplierId("");
      setItemQuantity(1);
      setUseManualSalePrice(false);
      setManualSalePrice("");
      setUseManualPurchasePrice(false);
      setManualPurchasePrice("");
      setProductSearch("");
      setProductMenuOpen(false);
      if (defaultVariant) {
        setProductInput(composeVariantLabel(product, defaultVariant));
      } else {
        setProductInput(getProductDisplayName(product));
      }
    },
    [resetOrderForm, setIsModalOpen, setItemProductId, setItemQuantity, setItemSupplierId, setItemVariantId, setManualPurchasePrice, setManualSalePrice, setProductInput, setProductMenuOpen, setProductSearch, setUseManualPurchasePrice, setUseManualSalePrice],
  );

  const handleCustomerSelect = useCallback(
    (customer: Customer) => {
      const nextPickup = typeof customer.pickup === "boolean" ? customer.pickup : Boolean(form.getValues("pickup"));
      form.setValue("customerName", customer.name, { shouldDirty: true, shouldTouch: true });
      form.setValue("phone", customer.phone, { shouldDirty: true, shouldTouch: true });
      form.setValue("address", nextPickup ? "" : customer.address, { shouldDirty: true, shouldTouch: true });
      if (typeof customer.pickup === "boolean") {
        form.setValue("pickup", nextPickup, { shouldDirty: true, shouldTouch: true });
      }
      setCustomerQuery(customer.name);
      setCustomerMenuOpen(false);
    },
    [form, setCustomerMenuOpen, setCustomerQuery],
  );

  const clearPreselectQuery = useCallback(() => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("productId");
    params.delete("orderModal");
    const next = params.toString();
    router.replace(next ? `${basePath}?${next}` : basePath);
  }, [searchParams, router, basePath]);

  useEffect(() => {
    if (!preselectProductId) return;
    if (!products || products.length === 0) return;
    if (preselectHandledRef.current === preselectProductId) return;
    const selected = products.find((product) => product._id === preselectProductId);
    preselectHandledRef.current = preselectProductId;
    if (!selected) {
      clearPreselectQuery();
      return;
    }
    openCreateModalWithProduct(selected);
    clearPreselectQuery();
  }, [preselectProductId, products, openCreateModalWithProduct, clearPreselectQuery, preselectHandledRef]);

  // [+] iz donje navigacije / headera vodi na ?nova=1: otvori formu pa očisti parametar.
  const isNewOrderRequested = searchParams?.get("nova") === "1";
  const handleNewOrderRequest = useEffectEvent(() => {
    // Već otvorena forma se ne briše (npr. + dok je unos u toku).
    if (!isModalOpen) openCreateModal();
    const params = new URLSearchParams(searchParamsString);
    params.delete("nova");
    const next = params.toString();
    router.replace(next ? `${basePath}?${next}` : basePath, { scroll: false });
  });

  useEffect(() => {
    if (isNewOrderRequested) handleNewOrderRequest();
  }, [isNewOrderRequested]);

  const handleSubmitOrder = async (values: OrderFormValues) => {
    if (draftItems.length === 0) {
      toast.error("Dodaj bar jedan proizvod u narudzbinu.");
      focusOrderField("productSearch");
      return;
    }

    try {
      const pickup = Boolean(values.pickup);
      const customerName = values.customerName?.trim() ?? "";
      const address = pickup ? "" : values.address?.trim() ?? "";
      const slanjeMode = pickup ? undefined : values.slanjeMode;
      const ownerInput = pickup ? undefined : values.slanjeOwner?.trim();
      const ownerLookupKey = normalizeOwnerLookupKey(ownerInput);
      const isAksBexAccount = slanjeMode === "Aks" || slanjeMode === "Bex";
      const existingAksBexAccount =
        isAksBexAccount && ownerLookupKey
          ? (shippingOwners?.aksBexAccounts ?? []).find(
              (option) => normalizeOwnerLookupKey(option.value) === ownerLookupKey,
            )
          : undefined;
      const shouldCreateAksBexAccount =
        isAksBexAccount &&
        shippingOwners !== undefined &&
        ownerLookupKey.length > 0 &&
        !existingAksBexAccount;
      if (shouldCreateAksBexAccount) {
        if (values.slanjeOwnerStartingAmount === undefined) {
          toast.error("Unesi pocetni iznos za novi racun.");
          focusOrderField("slanjeOwnerStartingAmount");
          return;
        }
        await upsertShippingAccount({
          token: sessionToken,
          scope: orderScope,
          value: ownerInput ?? "",
          startingAmount: values.slanjeOwnerStartingAmount,
        });
      }
      const payloadItems = draftItems.map((item) => ({
        id: item.id,
        productId: item.product._id,
        supplierId: item.supplierId || undefined,
        variantId: item.variant?.id,
        variantLabel: item.variant ? composeVariantLabel(item.product, item.variant) : undefined,
        title: item.title,
        kolicina: item.kolicina,
        nabavnaCena: item.nabavnaCena,
        prodajnaCena: item.prodajnaCena,
        manualProdajna: Boolean(item.manualProdajna),
        manualNabavna: Boolean(item.manualNabavna),
      }));
      const payload = {
        stage: values.stage,
        title: payloadItems[0]?.title ?? "Narudzbina",
        transportCost: values.transportCost,
        slanjeMode,
        slanjeOwner: ownerInput,
        brojPosiljke: editingOrder?.brojPosiljke,
        myProfitPercent: values.myProfitPercent ?? 100,
        customerName,
        address,
        phone: values.phone.trim(),
        pickup,
        napomena: values.note?.trim() || undefined,
        items: payloadItems,
        token: sessionToken,
        scope: orderScope,
      };

      if (editingOrder) {
        await updateOrder({ id: editingOrder._id, ...payload });
        toast.success("Narudzbina je azurirana.");
        resetOrdersFeed();
      } else {
        await createOrder(payload);
        toast.success("Narudzbina je dodata.");
      }
      resetOrderForm({ closeModal: true });
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati narudzbinu.");
    }
  };

  return { resetOrderForm, requestCloseOrderModal, handleAddItem, handleRemoveItem, draftTotals, openCreateModal, handleCustomerSelect, handleSubmitOrder };
}

