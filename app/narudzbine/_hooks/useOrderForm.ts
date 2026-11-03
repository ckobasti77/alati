"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexQuery } from "@/lib/convex";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import type { Customer } from "@/types/customer";
import type { Order, ShippingOwnerOption, ShippingOwnerOptions } from "@/types/order";
import { slanjeModes, type OrderItemDraft } from "../_lib/types";
import { normalizeOwnerLookupKey, getProductVariants, getProductDisplayName, resolveSupplierOptions, pickBestSupplier } from "../_lib/helpers";
import { orderSchema, type OrderFormValues, defaultFormValues } from "../_lib/orderForm";
import type { useSearchParams } from "next/navigation";
import type { Product, Supplier } from "@/types/order";

type UseOrderFormParams = {
  orderScope: "default" | "kalaba";
  searchParams: ReturnType<typeof useSearchParams>;
  sessionToken: string;
  products: Product[] | undefined;
  supplierMap: Map<string, Supplier>;
};

export function useOrderForm({ orderScope, searchParams, sessionToken, products, supplierMap }: UseOrderFormParams) {
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const editingOrderId = editingOrder?._id ?? null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [draftItems, setDraftItems] = useState<OrderItemDraft[]>([]);
  const [itemProductId, setItemProductId] = useState("");
  const [itemVariantId, setItemVariantId] = useState("");
  const [itemSupplierId, setItemSupplierId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [useManualSalePrice, setUseManualSalePrice] = useState(false);
  const [manualSalePrice, setManualSalePrice] = useState("");
  const [useManualPurchasePrice, setUseManualPurchasePrice] = useState(false);
  const [manualPurchasePrice, setManualPurchasePrice] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const previousSlanjeModeRef = useRef<(typeof slanjeModes)[number] | undefined>(undefined);
  const previousPickupValueRef = useRef<boolean | null>(null);
  const lastAutoSelectedOwnerRef = useRef<string | null>(null);
  const modalSnapshotRef = useRef<string>("");
  const wasModalOpenRef = useRef(false);
  const preselectHandledRef = useRef<string | null>(null);
  const didSyncCustomersRef = useRef(false);
  const preselectProductId = searchParams?.get("productId") ?? "";
  const customers = useConvexQuery<Customer[]>("customers:list", {
    token: sessionToken,
    scope: orderScope,
    search: customerQuery.trim() ? customerQuery.trim() : undefined,
    limit: customerQuery.trim() ? 8 : 5,
  });
  const shippingOwners = useConvexQuery<ShippingOwnerOptions>("orders:shippingOwners", {
    token: sessionToken,
    scope: orderScope,
  });
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const searchTokens = toSearchTokens(productSearch.trim());
    if (!searchTokens.length) return list;
    return list.filter((product) => {
      const variantsText = (product.variants ?? [])
        .map((variant) => `${variant.label ?? ""} ${variant.opis ?? ""}`)
        .join(" ");
      const searchableText = normalizeSearchText(
        `${getProductDisplayName(product)} ${product.opisFbInsta ?? product.opis ?? ""} ${product.opisKp ?? ""} ${variantsText}`,
      );
      return matchesAllTokensInNormalizedText(searchableText, searchTokens);
    });
  }, [products, productSearch]);
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });
  const pickupValue = Boolean(form.watch("pickup"));
  const slanjeModeValue = form.watch("slanjeMode");
  const slanjeOwnerValue = form.watch("slanjeOwner");
  const slanjeOwnerStartingAmountValue = form.watch("slanjeOwnerStartingAmount");
  const showShippingFields = !pickupValue;
  const slanjeOwnerLabel =
    slanjeModeValue === "Posta"
      ? "Posta - na ime"
      : slanjeModeValue
        ? "Aks - na ciji racun"
        : "Slanje - na ciji racun";
  const slanjeOwnerPlaceholder =
    slanjeModeValue === "Posta"
      ? "Unesi na ime"
      : slanjeModeValue
        ? "Unesi na ciji racun"
        : "Izaberi slanje prvo";
  const slanjeOwnerOptions = useMemo<ShippingOwnerOption[]>(() => {
    if (pickupValue) return [];
    if (!slanjeModeValue) return [];
    if (slanjeModeValue === "Posta") {
      return shippingOwners?.postaNames ?? [];
    }
    return shippingOwners?.aksBexAccounts ?? [];
  }, [pickupValue, shippingOwners, slanjeModeValue]);
  const slanjeOwnerQuickOptions = useMemo(
    () => slanjeOwnerOptions.slice(0, 12),
    [slanjeOwnerOptions],
  );
  const normalizedSlanjeOwnerValue = (slanjeOwnerValue ?? "").trim();
  const normalizedSlanjeOwnerLookupKey = normalizeOwnerLookupKey(slanjeOwnerValue);
  const isAksBexMode = !pickupValue && (slanjeModeValue === "Aks" || slanjeModeValue === "Bex");
  const selectedAksBexAccount = useMemo(() => {
    if (!isAksBexMode) return undefined;
    if (!normalizedSlanjeOwnerLookupKey) return undefined;
    const accounts = shippingOwners?.aksBexAccounts ?? [];
    return accounts.find((option) => normalizeOwnerLookupKey(option.value) === normalizedSlanjeOwnerLookupKey);
  }, [isAksBexMode, normalizedSlanjeOwnerLookupKey, shippingOwners?.aksBexAccounts]);
  const shouldAskForNewAccountStartingAmount =
    isAksBexMode &&
    shippingOwners !== undefined &&
    normalizedSlanjeOwnerLookupKey.length > 0 &&
    !selectedAksBexAccount;
  const lastAksBexOwnerValue = shippingOwners?.aksBexAccounts?.[0]?.value;
  useEffect(() => {
    if (!isModalOpen) {
      previousPickupValueRef.current = null;
      return;
    }
    const previousPickup = previousPickupValueRef.current;
    previousPickupValueRef.current = pickupValue;
    if (previousPickup === null || previousPickup === pickupValue) return;

    if (pickupValue) {
      if (form.getValues("address")) {
        form.setValue("address", "", { shouldDirty: true, shouldTouch: true });
      }
      form.setValue("slanjeMode", undefined, { shouldDirty: true, shouldTouch: true });
      form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
      form.setValue("slanjeOwnerStartingAmount", undefined, { shouldDirty: true, shouldTouch: true });
    } else {
      form.setValue("slanjeMode", "Aks", { shouldDirty: true, shouldTouch: true });
      form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
      form.setValue("slanjeOwnerStartingAmount", undefined, { shouldDirty: true, shouldTouch: true });
    }
    previousSlanjeModeRef.current = undefined;
    lastAutoSelectedOwnerRef.current = null;
  }, [form, isModalOpen, pickupValue]);
  useEffect(() => {
    const previousMode = previousSlanjeModeRef.current;
    const modeChanged = previousMode !== slanjeModeValue;
    previousSlanjeModeRef.current = slanjeModeValue;
    if (!slanjeModeValue || pickupValue) {
      previousSlanjeModeRef.current = undefined;
      if (form.getValues("slanjeOwner") !== undefined) {
        form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
      }
      lastAutoSelectedOwnerRef.current = null;
      return;
    }

    const isAccountMode = slanjeModeValue === "Aks" || slanjeModeValue === "Bex";
    if (!isAccountMode) {
      if (modeChanged && form.getValues("slanjeOwner") !== undefined) {
        form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
      }
      lastAutoSelectedOwnerRef.current = null;
      return;
    }

    if (!lastAksBexOwnerValue) {
      if (modeChanged && form.getValues("slanjeOwner") !== undefined) {
        form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
      }
      lastAutoSelectedOwnerRef.current = null;
      return;
    }

    const currentOwner = form.getValues("slanjeOwner")?.trim();
    const autoSelectionKey = `${slanjeModeValue}:${lastAksBexOwnerValue}`;
    if ((modeChanged || !currentOwner) && lastAutoSelectedOwnerRef.current !== autoSelectionKey) {
      lastAutoSelectedOwnerRef.current = autoSelectionKey;
      form.setValue("slanjeOwner", lastAksBexOwnerValue, { shouldDirty: true, shouldTouch: true });
    }
  }, [form, lastAksBexOwnerValue, pickupValue, slanjeModeValue]);
  useEffect(() => {
    if (shouldAskForNewAccountStartingAmount) return;
    if (slanjeOwnerStartingAmountValue === undefined) return;
    form.setValue("slanjeOwnerStartingAmount", undefined, { shouldDirty: true, shouldTouch: true });
  }, [form, shouldAskForNewAccountStartingAmount, slanjeOwnerStartingAmountValue]);
  const selectedProduct = useMemo(
    () => (products ?? []).find((item) => item._id === itemProductId),
    [products, itemProductId],
  );
  const selectedVariants = useMemo(() => getProductVariants(selectedProduct), [selectedProduct]);
  const selectedVariantForPreview = useMemo(() => {
    if (!selectedProduct) return undefined;
    const variants = selectedProduct.variants ?? [];
    if (variants.length === 0) return undefined;
    if (itemVariantId) {
      const match = variants.find((variant) => variant.id === itemVariantId);
      if (match) return match;
    }
    return variants.find((variant) => variant.isDefault) ?? variants[0];
  }, [selectedProduct, itemVariantId]);
  const supplierOptions = useMemo(
    () => resolveSupplierOptions(selectedProduct, itemVariantId || undefined),
    [selectedProduct, itemVariantId],
  );
  const supplierOptionsWithNames = useMemo(
    () =>
      supplierOptions.map((option) => ({
        ...option,
        supplierName: supplierMap.get(option.supplierId)?.name,
      })),
    [supplierMap, supplierOptions],
  );
  const bestSupplierOption = useMemo(() => pickBestSupplier(supplierOptionsWithNames), [supplierOptionsWithNames]);

  return { productInput, setProductInput, productSearch, setProductSearch, productMenuOpen, setProductMenuOpen, editingOrder, setEditingOrder, editingOrderId, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, draftItems, setDraftItems, itemProductId, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, customerQuery, setCustomerQuery, customerMenuOpen, setCustomerMenuOpen, productInputRef, previousSlanjeModeRef, previousPickupValueRef, lastAutoSelectedOwnerRef, modalSnapshotRef, wasModalOpenRef, preselectHandledRef, didSyncCustomersRef, preselectProductId, customers, shippingOwners, filteredProducts, form, pickupValue, slanjeModeValue, showShippingFields, slanjeOwnerLabel, slanjeOwnerPlaceholder, slanjeOwnerOptions, slanjeOwnerQuickOptions, normalizedSlanjeOwnerValue, isAksBexMode, selectedAksBexAccount, shouldAskForNewAccountStartingAmount, selectedProduct, selectedVariants, selectedVariantForPreview, supplierOptionsWithNames, bestSupplierOption };
}

