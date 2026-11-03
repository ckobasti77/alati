"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvex } from "convex/react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, BadgePercent, Banknote, CalendarRange, Copy, Download, GripVertical, PhoneCall, Plus, Share2, Trash2, UserRound } from "lucide-react";
import { LoadingDots } from "@/components/LoadingDots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import { openTracking, resolveTrackingTarget } from "@/lib/tracking";
import { STAGES, STAGE_OPTIONS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/customer";
import type {
  Order,
  OrderStage,
  Product,
  ShippingOwnerOption,
  ShippingOwnerOptions,
} from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import {
  slanjeModes,
  slanjeSwitchModes,
  deleteConfirmPhrase,
  type OrderItemDraft,
  } from "./_lib/types";
import {
  requiresDeleteConfirmation,
  resolveOrderShippingMode,
  resolveShipmentNumber,
  normalizeOwnerLookupKey,
  generateId,
  getProductVariants,
  getProductDisplayName,
  composeVariantLabel,
  resolveSupplierOptions,
  pickBestSupplier,
  resolveVariantPurchasePrice,
  resolveProductImageUrl,
  formatRefundPeriodDate,
  } from "./_lib/helpers";
import { orderSchema, type OrderFormValues, defaultFormValues, orderFocusOrder, findFirstErrorPath } from "./_lib/orderForm";
import { RichTextSnippet } from "./_components/RichTextSnippet";
import { StageBadge } from "./_components/LegacyStageBadge";
import { useOrdersFeed } from "./_hooks/useOrdersFeed";
import { useRefundPeriod } from "./_hooks/useRefundPeriod";
import { useOrderCatalog } from "./_hooks/useOrderCatalog";
import { useRestock } from "./_hooks/useRestock";
import { useOrdersPdf } from "./_hooks/useOrdersPdf";
import { useOrderEntries } from "./_hooks/useOrderEntries";
import { useOrderSelection } from "./_hooks/useOrderSelection";
import { useOrderReorder } from "./_hooks/useOrderReorder";
import { useLongPress } from "./_hooks/useLongPress";
import { useOrderRowActions } from "./_hooks/useOrderRowActions";

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const basePath = "/narudzbine";
  const orderScope: "default" | "kalaba" = "default";
  const router = useRouter();
  const convex = useConvex();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const { token } = useAuth();
  const sessionToken = token as string;
  const { search, setSearch, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, setFilterMenuMode, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId, ordersPagination, ordersTotals, isLoadingMoreOrders, ordersLoaderRef, orderListQueryArgs, isOrdersLoading, hasMoreOrders, dateFilterActive, activeFilterCount, isFilterMenuOpen, resetOrdersFeed, handleStageFilterToggle, handleUnreturnedToggle, handleReturnedToggle, handlePickupToggle, handleShippingToggle, handleLateToggle, handleDateFromChange, handleDateToChange, handleClearDateFilter, handleFilterMenuEnter, handleFilterMenuLeave, handleFilterMenuToggle } = useOrdersFeed({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken });
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const editingOrderId = editingOrder?._id ?? null;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Order | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
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
  const { refundPeriodModalOpen, setRefundPeriodModalOpen, refundPeriodStart, setRefundPeriodStart, refundPeriodEnd, setRefundPeriodEnd, isRefundPeriodSaving, refundPeriodOverview, openRefundPeriodModal, handleSaveRefundPeriod, handleClearRefundPeriod } = useRefundPeriod({ orderScope, sessionToken, resetOrdersFeed });
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const previousSlanjeModeRef = useRef<(typeof slanjeModes)[number] | undefined>(undefined);
  const previousPickupValueRef = useRef<boolean | null>(null);
  const lastAutoSelectedOwnerRef = useRef<string | null>(null);
  const modalSnapshotRef = useRef<string>("");
  const wasModalOpenRef = useRef(false);
  const preselectHandledRef = useRef<string | null>(null);
  const didSyncCustomersRef = useRef(false);
  const preselectProductId = searchParams?.get("productId") ?? "";
  const deleteOrder = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>("orders:remove");
  const createOrder = useConvexMutation("orders:create");
  const updateOrder = useConvexMutation("orders:update");
  const upsertShippingAccount = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    value: string;
    startingAmount: number;
  }>("orders:upsertShippingAccount");
  const syncCustomers = useConvexMutation("customers:syncFromOrders");
  const { products, productMap, supplierMap, isProductsLoading } = useOrderCatalog({ sessionToken });
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
  const { restockModalOpen, setRestockModalOpen, restockDeleteOpen, restockDeleteCandidate, isDeletingRestock, setRestockProductId, restockProductInput, setRestockProductInput, setRestockProductSearch, restockProductMenuOpen, setRestockProductMenuOpen, restockVariantId, setRestockVariantId, restockName, setRestockName, restockPhone, setRestockPhone, isCreatingRestock, restockProductInputRef, restockEntries, isRestockLoading, restockFilteredProducts, restockSelectedProduct, restockSelectedVariants, openRestockDeleteModal, closeRestockDeleteModal, handleRestockDeleteOpenChange, handleRestockDelete, resetRestockForm, handleCreateRestockRequest } = useRestock({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, products, productMap });

  const { orderEntries, visibleOrderIds } = useOrderEntries({ orders, refundPeriodOverview });
  const { selectedOrderIds, bulkAction, selectedVisibleCount, allVisibleSelected, toggleOrderSelection, toggleAllVisibleOrders, handleBulkAction } = useOrderSelection({ orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, visibleOrderIds });
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
  const deleteRequiresConfirmation = deleteCandidate ? requiresDeleteConfirmation(deleteCandidate.stage) : false;
  const isDeletePhraseValid = deleteConfirmText.trim().toLowerCase() === deleteConfirmPhrase;
  const isDeleteDisabled = !deleteCandidate || isDeletingOrder || (deleteRequiresConfirmation && !isDeletePhraseValid);

  const { ordersPdfMode, isOrdersPdfBusy, handleOrdersPdf } = useOrdersPdf({ convex, search, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, orderListQueryArgs, dateFilterActive, refundPeriodOverview, productMap });
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
  const getOrderPreviewImages = useCallback(
    (order: Order) => {
      const items = order.items ?? [];
      const previews: { id: string; url?: string | null; alt: string }[] = [];
      items.forEach((item) => {
        const product = item.productId ? productMap.get(item.productId) : undefined;
        const url = resolveProductImageUrl(product, item.variantId);
        const alt = product ? getProductDisplayName(product) : item.title || "Proizvod";
        const qty = Math.max(Number(item.kolicina) || 1, 1);
        for (let index = 0; index < qty; index += 1) {
          previews.push({ id: `${item.id}-${index}`, url, alt });
        }
      });
      return previews;
    },
    [productMap],
  );

  const { consumeLongPressClick, createLongPressHandlers } = useLongPress();
  const { quickEdit, setQuickEdit, isQuickEditSaving, shipmentStageModal, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, manualRefundSavingId, kasniSavingId, copyText, openQuickEdit, closeQuickEdit, handleQuickEditSave, closeShipmentStageModal, handleShipmentStageSubmit, handleStageChange, handlePovratToggle, handleKasniToggle, handleManualRefund100Toggle } = useOrderRowActions({ orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, updateOrder });
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
    [form],
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
  }, [buildModalSnapshot, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      setCustomerMenuOpen(false);
    }
  }, [isModalOpen]);

  useEffect(() => {
    didSyncCustomersRef.current = false;
  }, [orderScope]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (didSyncCustomersRef.current) return;
    if (customerQuery.trim()) return;
    if (customers === undefined) return;
    if (customers.length > 0) return;
    didSyncCustomersRef.current = true;
    void syncCustomers({ token: sessionToken, scope: orderScope });
  }, [customerQuery, customers, isModalOpen, orderScope, sessionToken, syncCustomers]);

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
  }, [itemVariantId, selectedProduct, selectedVariants, setProductInput]);

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
  }, [itemSupplierId, supplierOptionsWithNames]);

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
    [resetOrderForm],
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
    [form],
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
  }, [preselectProductId, products, openCreateModalWithProduct, clearPreselectQuery]);

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

  const openDeleteModal = (order: Order) => {
    setDeleteCandidate(order);
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteCandidate(null);
    setDeleteConfirmText("");
  };

  const handleDeleteModalOpenChange = (open: boolean) => {
    if (open) {
      setDeleteModalOpen(true);
    } else {
      closeDeleteModal();
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeletingOrder) return;
    setIsDeletingOrder(true);
    try {
      await deleteOrder({ id, token: sessionToken, scope: orderScope });
      toast.success("Narudzbina je obrisana.");
      resetOrdersFeed();
      if (editingOrder?._id === id) {
        resetOrderForm({ closeModal: true });
      }
      closeDeleteModal();
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const { handleOrderDragStart, handleOrderDragEnd, handleOrderDragOver, handleOrderDragLeave, handleOrderDrop } = useOrderReorder({ orderScope, sessionToken, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId });
  const handleRowClick = (id: string) => {
    router.push(`${basePath}/${id}`);
  };

  return (
    <div className="relative mx-auto space-y-6">
      <Dialog open={refundPeriodModalOpen} onOpenChange={setRefundPeriodModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Period 100% povrata</DialogTitle>
            <DialogDescription>
              Sve nevraćene porudžbine kreirane u ovom rasponu računaju se po posebnom pravilu. Datumi su uključivi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Od</span>
                <Input
                  type="date"
                  value={refundPeriodStart}
                  onChange={(event) => setRefundPeriodStart(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                <span>Do</span>
                <Input
                  type="date"
                  value={refundPeriodEnd}
                  onChange={(event) => setRefundPeriodEnd(event.target.value)}
                />
              </label>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
              <p className="font-semibold">Poseban obračun</p>
              <p className="mt-1 text-emerald-800">Nabavna cena + 100% ukupnog profita − transport.</p>
              <p className="mt-2 text-xs text-emerald-700">
                Porudžbine kojima je povrat već označen kao vraćen ostaju vidljive, ali se ne računaju u iznos za vraćanje.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {refundPeriodOverview?.period ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => void handleClearRefundPeriod()}
                  disabled={isRefundPeriodSaving}
                >
                  Ukloni period
                </Button>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundPeriodModalOpen(false)}
                disabled={isRefundPeriodSaving}
              >
                Otkaži
              </Button>
              <Button
                type="button"
                className="bg-emerald-800 text-white hover:bg-emerald-900"
                onClick={() => void handleSaveRefundPeriod()}
                disabled={isRefundPeriodSaving}
              >
                {isRefundPeriodSaving ? "Čuvanje..." : "Sačuvaj period"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsModalOpen(true);
            return;
          }
          requestCloseOrderModal();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingOrder ? "Izmeni narudzbinu" : "Nova narudzbina"}</DialogTitle>
            {editingOrder ? (
              <p className="text-sm text-slate-500">
                Menjas narudzbinu za: <span className="font-medium text-slate-700">{editingOrder.title}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Popuni formu za narudzbinu. Proizvod mozes pretraziti, a tip izabrati nakon otvaranja liste.
              </p>
            )}
          </DialogHeader>
          <Form form={form} onSubmit={handleSubmitOrder} className="space-y-4">
            <FormField
              name="pickup"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="space-y-0.5">
                    <FormLabel htmlFor="pickup" className="m-0 cursor-pointer">
                      Licno preuzimanje
                    </FormLabel>
                    <p className="text-xs text-slate-500">Bez adrese i bez slanja.</p>
                  </div>
                  <input
                    id="pickup"
                    ref={field.ref}
                    name={field.name}
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    onBlur={field.onBlur}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </FormItem>
              )}
            />
            <FormField
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STAGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
                          field.value === option.value
                            ? `${option.tone} border-2`
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                        onClick={() => field.onChange(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <FormLabel className="text-base">Stavke narudzbine</FormLabel>
                  <p className="text-xs text-slate-500">Dodaj jedan ili vise proizvoda i tip.</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {draftItems.length} stavki
                </Badge>
              </div>
              <div className="relative">
                <Input
                  ref={productInputRef}
                  name="productSearch"
                  value={productInput}
                  placeholder={isProductsLoading ? "Ucitavanje..." : "Pretrazi proizvod"}
                  disabled={isProductsLoading || (products?.length ?? 0) === 0}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProductInput(value);
                    setProductSearch(value);
                    setProductMenuOpen(true);
                    if (!value) {
                      setItemProductId("");
                      setItemVariantId("");
                      setItemSupplierId("");
                    }
                  }}
                  onFocus={() => {
                    setProductMenuOpen(true);
                    setProductSearch("");
                  }}
                  onClick={() => {
                    setProductMenuOpen(true);
                    setProductSearch("");
                  }}
                  onBlur={() => {
                    setTimeout(() => setProductMenuOpen(false), 150);
                  }}
                />
                {productMenuOpen && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {isProductsLoading ? (
                      <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Ucitavanje...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Nema rezultata</div>
                    ) : (
                      filteredProducts.map((product, productIndex) => {
                        const variants = product.variants ?? [];
                        const hasVariants = variants.length > 0;
                        const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                        const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
                        return (
                          <div
                            key={product._id}
                            className={`border-b border-slate-100 last:border-b-0 dark:border-slate-800 ${
                              productIndex % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-900/70"
                            }`}
                          >
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setItemProductId(product._id);
                                setProductInput(getProductDisplayName(product));
                                setItemVariantId(defaultVariant?.id ?? "");
                                setItemSupplierId("");
                                setUseManualSalePrice(false);
                                setManualSalePrice("");
                                setItemQuantity(1);
                                setProductMenuOpen(false);
                              }}
                            >
                              {(() => {
                                const images = product.images ?? [];
                                const mainImage = images.find((image) => image.isMain) ?? images[0];
                                const displayName = getProductDisplayName(product);
                                if (mainImage?.url) {
                                  return (
                                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                                    </div>
                                  );
                                }
                                return <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700/70" />;
                              })()}
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-800 dark:text-slate-100">{getProductDisplayName(product)}</p>
                                  {hasVariants ? (
                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                                      Tipski
                                    </span>
                                  ) : null}
                                </div>
                                {hasVariants ? (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                                  </p>
                                ) : (
                                  <RichTextSnippet
                                    text={product.opisFbInsta || product.opisKp || product.opis}
                                    className="text-[11px] text-slate-500 dark:text-slate-400"
                                  />
                                )}
                              </div>
                              <div className="text-center">
                                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Cena</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                  {formatCurrency(displayPrice, "EUR")}
                                </p>
                              </div>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {selectedProduct ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const images = selectedProduct.images ?? [];
                      const mainImage = images.find((image) => image.isMain) ?? images[0];
                      const displayName = getProductDisplayName(selectedProduct);
                      if (mainImage?.url) {
                        return (
                          <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                          </div>
                        );
                      }
                      return (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] uppercase text-slate-400 dark:border-slate-600 dark:text-slate-300">
                          N/A
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getProductDisplayName(selectedProduct)}</p>
                      {selectedVariantForPreview ? <p className="text-xs text-slate-600 dark:text-slate-300">{selectedVariantForPreview.label}</p> : null}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Prodajna cena</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
                      {formatCurrency(selectedVariantForPreview?.prodajnaCena ?? selectedProduct.prodajnaCena, "EUR")}
                    </p>
                  </div>
                </div>
              ) : null}

              {selectedVariants.length > 0 ? (
                <div className="space-y-2">
                  <FormLabel>Tip / varijanta</FormLabel>
                  <p className="text-xs text-slate-500">
                    Odaberi tacno koji tip proizvoda dodajes. Podrazumevani tip se popunjava automatski, ali mozes da ga promenis.
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedVariants.map((variant) => {
                      const isActive = itemVariantId === variant.id;
                      const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
                      const purchasePrice = selectedProduct ? resolveVariantPurchasePrice(selectedProduct, variant) : variant.nabavnaCena;
                      return (
                        <label
                          key={variant.id}
                          className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                            isActive
                              ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10"
                              : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-500"
                          }`}
                        >
                          <input
                            type="radio"
                            name="variantId"
                            value={variant.id}
                            checked={isActive}
                            onChange={() => {
                              setItemVariantId(variant.id);
                              if (selectedProduct) {
                                setProductInput(composedLabel);
                              }
                              setProductMenuOpen(false);
                            }}
                            className="sr-only"
                          />
                          <span
                            className={`font-medium ${
                              isActive ? "text-blue-800 dark:text-blue-50" : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {composedLabel}
                          </span>
                          <span className={`text-xs ${isActive ? "text-blue-700 dark:text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>
                            Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
                          </span>
                          <RichTextSnippet
                            text={variant.opis || selectedProduct?.opisFbInsta || selectedProduct?.opisKp || selectedProduct?.opis}
                            className="text-[11px] text-slate-500 dark:text-slate-400"
                          />
                          {variant.isDefault ? (
                            <span
                              className={`text-[11px] font-semibold ${
                                isActive ? "text-emerald-600 dark:text-emerald-300" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              Podrazumevano
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {selectedProduct && supplierOptionsWithNames.length > 0 ? (
                <div>
                  <FormLabel>Dobavljac</FormLabel>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                    name="supplierId"
                    value={itemSupplierId}
                    onChange={(event) => setItemSupplierId(event.target.value)}
                  >
                    <option value="">
                      {bestSupplierOption
                        ? `Najpovoljniji (${formatCurrency(bestSupplierOption.price, "EUR")})`
                        : "Najpovoljniji"}
                    </option>
                    {supplierOptionsWithNames.map((option) => (
                      <option key={option.supplierId} value={option.supplierId}>
                        {(option.supplierName ?? "Dobavljac") + " - " + formatCurrency(option.price, "EUR")}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">Ako ne izaberes, racunamo najpovoljniju ponudu.</p>
                </div>
              ) : null}

              {selectedProduct ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3 md:items-end">
                    <div>
                      <FormLabel>Kolicina</FormLabel>
                      <Input
                        name="itemQuantity"
                        type="number"
                        min={1}
                        required
                        value={itemQuantity}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isNaN(next)) {
                            setItemQuantity(1);
                            return;
                          }
                          setItemQuantity(Math.max(Math.round(next), 1));
                        }}
                      />
                    </div>
                    <div>
                      <FormLabel className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useManualPurchasePrice}
                          onChange={(event) => {
                            setUseManualPurchasePrice(event.target.checked);
                            if (!event.target.checked) {
                              setManualPurchasePrice("");
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Rucno unosim nabavnu cenu
                      </FormLabel>
                      <Input
                        name="manualPurchasePrice"
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={!useManualPurchasePrice}
                        required={useManualPurchasePrice}
                        value={manualPurchasePrice}
                        onChange={(event) => setManualPurchasePrice(event.target.value)}
                        placeholder="npr. 80"
                        className={!useManualPurchasePrice ? "bg-slate-100" : undefined}
                      />
                    </div>
                    <div>
                      <FormLabel className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useManualSalePrice}
                          onChange={(event) => {
                            setUseManualSalePrice(event.target.checked);
                            if (!event.target.checked) {
                              setManualSalePrice("");
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        Rucno unosim prodajnu cenu
                      </FormLabel>
                      <Input
                        name="manualSalePrice"
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={!useManualSalePrice}
                        required={useManualSalePrice}
                        value={manualSalePrice}
                        onChange={(event) => setManualSalePrice(event.target.value)}
                        placeholder="npr. 120"
                        className={!useManualSalePrice ? "bg-slate-100" : undefined}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={handleAddItem} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Dodaj u narudzbinu
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setItemProductId("");
                        setItemVariantId("");
                        setItemSupplierId("");
                        setProductInput("");
                        setUseManualSalePrice(false);
                        setManualSalePrice("");
                        setUseManualPurchasePrice(false);
                        setManualPurchasePrice("");
                        setItemQuantity(1);
                      }}
                    >
                      Ponisti izbor
                    </Button>
                  </div>
                </div>
              ) : null}

              {draftItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Dodate stavke</p>
                    <div className="text-center text-xs text-slate-500">
                      <p>Prodajno: {formatCurrency(draftTotals.totalProdajno, "EUR")}</p>
                      <p>Nabavno: {formatCurrency(draftTotals.totalNabavno, "EUR")}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {draftItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          {item.variantLabel ? <p className="text-xs text-slate-500">{item.variantLabel}</p> : null}
                          <p className="text-xs text-slate-500">
                            Kolicina: {item.kolicina} / Nabavna {formatCurrency(item.nabavnaCena, "EUR")} / Prodajna {formatCurrency(item.prodajnaCena, "EUR")}
                          </p>
                          {item.manualNabavna || item.manualProdajna ? (
                            <div className="flex flex-wrap gap-1">
                              {item.manualNabavna ? (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                  Rucno uneta nabavna
                                </span>
                              ) : null}
                              {item.manualProdajna ? (
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                  Rucno uneta prodajna
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label="Ukloni stavku"
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="customerName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Ime i prezime porucioca{pickupValue ? " (neobavezno)" : ""}</FormLabel>
                    <div className="relative">
                      <Input
                        placeholder="npr. Marko Markovic"
                        required={!pickupValue}
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          setCustomerQuery(event.target.value);
                          setCustomerMenuOpen(true);
                        }}
                        onFocus={() => setCustomerMenuOpen(true)}
                        onBlur={(event) => {
                          field.onBlur();
                          setCustomerMenuOpen(false);
                        }}
                      />
                      {customerMenuOpen && (customers?.length ?? 0) > 0 ? (
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                          {customers?.map((customer) => (
                            <button
                              key={customer._id}
                              type="button"
                              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleCustomerSelect(customer);
                              }}
                            >
                              <span className="font-medium text-slate-900">{customer.name}</span>
                              <span className="text-xs text-slate-500">
                                {customer.phone}
                                {customer.address ? ` - ${customer.address}` : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Broj telefona</FormLabel>
                    <Input placeholder="npr. +381 6x xxx xxxx" required {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              {!pickupValue ? (
                <FormField
                  name="address"
                  render={({ field, fieldState }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Adresa</FormLabel>
                      <Input placeholder="Ulica, broj, mesto" required {...field} />
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="transportCost"
                render={({ field, fieldState }) => (
                  <FormItem>
                <FormLabel>Trosak transporta</FormLabel>
                <Input
                  ref={field.ref}
                  name={field.name}
                  type="text"
                  inputMode="decimal"
                  placeholder="npr. 15 ili 15.5"
                  required
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const normalized = event.target.value.replace(",", ".").trim();
                    if (normalized === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const parsed = Number(normalized);
                    if (Number.isNaN(parsed)) return;
                    field.onChange(parsed);
                  }}
                  onBlur={field.onBlur}
                />
                    <p className="text-xs text-slate-500">Unesi trosak transporta u EUR (prihvata decimale).</p>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              {showShippingFields ? (
                <>
                  <FormField
                    name="slanjeMode"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Slanje</FormLabel>
                        <div
                          className="grid grid-cols-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-1"
                          role="group"
                          aria-label="Slanje"
                        >
                          {slanjeSwitchModes.map((mode) => {
                            const isActive = field.value === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                                  isActive
                                    ? "bg-white text-blue-700 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900",
                                )}
                                onClick={() => field.onChange(mode)}
                              >
                                {mode}
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name="slanjeOwner"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>{slanjeOwnerLabel}</FormLabel>
                        <Input
                          className="disabled:cursor-not-allowed disabled:bg-slate-100"
                          ref={field.ref}
                          name={field.name}
                          value={field.value ?? ""}
                          placeholder={slanjeOwnerPlaceholder}
                          disabled={!slanjeModeValue}
                          list={slanjeModeValue ? `slanje-owner-list-${slanjeModeValue.toLowerCase()}` : undefined}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                        />
                        {slanjeModeValue ? (
                          <datalist id={`slanje-owner-list-${slanjeModeValue.toLowerCase()}`}>
                            {slanjeOwnerOptions.map((option) => (
                              <option key={option.value} value={option.value} />
                            ))}
                          </datalist>
                        ) : null}
                        {slanjeModeValue && slanjeOwnerQuickOptions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {slanjeOwnerQuickOptions.map((option) => {
                              const isActive = normalizedSlanjeOwnerValue === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                                    isActive
                                      ? "border-blue-500 bg-blue-50 text-blue-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200",
                                  )}
                                  onClick={() => field.onChange(option.value)}
                                >
                                  {option.value}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        {slanjeModeValue && slanjeOwnerOptions.length > slanjeOwnerQuickOptions.length ? (
                          <p className="text-[11px] text-slate-500">
                            Prikazano prvih {slanjeOwnerQuickOptions.length} od {slanjeOwnerOptions.length} sacuvanih.
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          {slanjeModeValue === "Posta"
                            ? slanjeOwnerOptions.length > 0
                              ? "Izaberi sacuvano ime ili unesi novo."
                              : "Unesi na ime kome posta isplacuje."
                            : slanjeModeValue
                              ? slanjeOwnerOptions.length > 0
                                ? "Izaberi sacuvan racun ili unesi novi."
                                : "Na ciji bankovni racun lezu pare preko Aksa."
                              : "Izaberi slanje da bi odabrao ime."}
                        </p>
                        {isAksBexMode && selectedAksBexAccount ? (
                          <p className="text-xs text-slate-500">
                            Pocetno stanje ovog racuna: {formatCurrency(selectedAksBexAccount.startingAmount ?? 0, "EUR")}
                          </p>
                        ) : null}
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  {shouldAskForNewAccountStartingAmount ? (
                    <FormField
                      name="slanjeOwnerStartingAmount"
                      render={({ field, fieldState }) => (
                        <FormItem>
                          <FormLabel>Pocetno stanje novog racuna</FormLabel>
                          <Input
                            ref={field.ref}
                            name={field.name}
                            type="text"
                            inputMode="decimal"
                            placeholder="npr. 1200"
                            value={field.value ?? ""}
                            onChange={(event) => {
                              const normalized = event.target.value.replace(",", ".").trim();
                              if (normalized === "") {
                                field.onChange(undefined);
                                return;
                              }
                              const parsed = Number(normalized);
                              if (Number.isNaN(parsed)) return;
                              field.onChange(parsed);
                            }}
                            onBlur={field.onBlur}
                          />
                          <p className="text-xs text-slate-500">
                            Koliko je vec leglo na ovaj novi racun pre prvih narudzbina u aplikaciji.
                          </p>
                          <FormMessage>{fieldState.error?.message}</FormMessage>
                        </FormItem>
                      )}
                    />
                  ) : null}
                </>
              ) : null}
              <FormField
                name="note"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Napomena (neobavezno)</FormLabel>
                    <Textarea rows={3} placeholder="Dodatne napomene" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={requestCloseOrderModal}>
                {editingOrder ? "Otkazi izmene" : "Ponisti"}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingOrder ? "Azuriraj" : "Sacuvaj"}
              </Button>
            </div>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Napusti formu?</DialogTitle>
            <DialogDescription>Imas nesacuvane izmene. Ako izadjes, izgubices uneto.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setExitConfirmOpen(false)}>
              Ostani
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setExitConfirmOpen(false);
                resetOrderForm({ closeModal: true });
              }}
            >
              Napusti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Obrisi narudzbinu?</DialogTitle>
            <DialogDescription>Brisanje je trajno i ne moze da se vrati.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Proveri pre brisanja.</p>
                <p className="text-xs text-rose-800">Ova akcija nepovratno uklanja narudzbinu.</p>
              </div>
            </div>
            {deleteCandidate ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{deleteCandidate.title}</p>
                <p className="text-xs text-slate-500">
                  {deleteCandidate.customerName} · Stage:{" "}
                  {STAGES[deleteCandidate.stage]?.label ?? deleteCandidate.stage}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Narudzbina nije izabrana.</p>
            )}
            {deleteRequiresConfirmation ? (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm font-semibold text-amber-900">Za nastavak unesi potvrdu.</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder={deleteConfirmPhrase}
                  autoComplete="off"
                />
                <p className="text-xs text-amber-900">
                  Upisi tacno: <span className="font-semibold">{deleteConfirmPhrase}</span>
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDeleteModal} disabled={isDeletingOrder}>
              Otkazi
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteCandidate && handleDelete(deleteCandidate._id)}
              disabled={isDeleteDisabled}
            >
              {isDeletingOrder ? "Brisanje..." : "Obrisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(quickEdit)}
        onOpenChange={(open) => {
          if (!open) {
            closeQuickEdit();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickEdit?.field === "contact"
                ? "Izmeni kontakt"
                : quickEdit?.field === "address"
                  ? "Izmeni adresu"
                  : quickEdit?.field === "transport"
                    ? "Izmeni transport"
                    : "Izmeni procenat profita"}
            </DialogTitle>
            {quickEdit ? (
              <DialogDescription>
                Narudzbina: <span className="font-medium text-slate-700">{quickEdit.order.title}</span>
              </DialogDescription>
            ) : null}
          </DialogHeader>
          {quickEdit?.field === "contact" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <FormLabel>Ime i prezime</FormLabel>
                <Input
                  autoFocus
                  value={quickEdit.customerName}
                  onChange={(event) =>
                    setQuickEdit((current) =>
                      current?.field === "contact" ? { ...current, customerName: event.target.value } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Telefon</FormLabel>
                <Input
                  value={quickEdit.phone}
                  onChange={(event) =>
                    setQuickEdit((current) =>
                      current?.field === "contact" ? { ...current, phone: event.target.value } : current,
                    )
                  }
                />
              </div>
            </div>
          ) : null}
          {quickEdit?.field === "address" ? (
            <div className="space-y-2">
              <FormLabel>Adresa</FormLabel>
              <Textarea
                autoFocus
                rows={3}
                value={quickEdit.address}
                onChange={(event) =>
                  setQuickEdit((current) =>
                    current?.field === "address" ? { ...current, address: event.target.value } : current,
                  )
                }
              />
            </div>
          ) : null}
          {quickEdit?.field === "transport" ? (
            <div className="space-y-2">
              <FormLabel>Trosak transporta</FormLabel>
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="npr. 15 ili 15.5"
                value={quickEdit.transportCost}
                onChange={(event) =>
                  setQuickEdit((current) =>
                    current?.field === "transport" ? { ...current, transportCost: event.target.value } : current,
                  )
                }
              />
            </div>
          ) : null}
          {quickEdit?.field === "profit" ? (
            <div className="space-y-2">
              <FormLabel>Procenat profita</FormLabel>
              <Input
                autoFocus
                inputMode="decimal"
                placeholder="npr. 50"
                value={quickEdit.myProfitPercent}
                onChange={(event) =>
                  setQuickEdit((current) =>
                    current?.field === "profit" ? { ...current, myProfitPercent: event.target.value } : current,
                  )
                }
              />
              <p className="text-xs text-slate-500">Unesi vrednost izmedju 0 i 100.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeQuickEdit} disabled={isQuickEditSaving}>
              Otkazi
            </Button>
            <Button type="button" onClick={handleQuickEditSave} disabled={isQuickEditSaving}>
              {isQuickEditSaving ? "Cuvanje..." : "Sacuvaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={restockModalOpen} onOpenChange={setRestockModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zahtevi za nedostupne proizvode</DialogTitle>
            <DialogDescription>Lista kupaca koje treba kontaktirati kada se proizvod vrati.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="restockProduct"
                  className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                >
                  Proizvod
                </label>
                <div className="relative">
                  <Input
                    ref={restockProductInputRef}
                    id="restockProduct"
                    name="restockProductSearch"
                    value={restockProductInput}
                    placeholder={isProductsLoading ? "Ucitavanje..." : "Pretrazi proizvod"}
                    disabled={isProductsLoading || (products?.length ?? 0) === 0}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRestockProductInput(value);
                      setRestockProductSearch(value);
                      setRestockProductMenuOpen(true);
                      if (!value) {
                        setRestockProductId("");
                        setRestockVariantId("");
                      }
                    }}
                    onFocus={() => {
                      setRestockProductMenuOpen(true);
                      setRestockProductSearch("");
                    }}
                    onClick={() => {
                      setRestockProductMenuOpen(true);
                      setRestockProductSearch("");
                    }}
                    onBlur={() => {
                      setTimeout(() => setRestockProductMenuOpen(false), 150);
                    }}
                  />
                  {restockProductMenuOpen && (
                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      {isProductsLoading ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Ucitavanje...</div>
                      ) : restockFilteredProducts.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">Nema rezultata</div>
                      ) : (
                        restockFilteredProducts.map((product, productIndex) => {
                          const variants = product.variants ?? [];
                          const hasVariants = variants.length > 0;
                          const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                          const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
                          return (
                            <div
                              key={product._id}
                              className={`border-b border-slate-100 last:border-b-0 dark:border-slate-800 ${
                                productIndex % 2 === 0
                                  ? "bg-white dark:bg-slate-900"
                                  : "bg-slate-50/50 dark:bg-slate-900/70"
                              }`}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  setRestockProductId(product._id);
                                  setRestockProductInput(getProductDisplayName(product));
                                  setRestockVariantId(defaultVariant?.id ?? "");
                                  setRestockProductMenuOpen(false);
                                }}
                              >
                                {(() => {
                                  const images = product.images ?? [];
                                  const mainImage = images.find((image) => image.isMain) ?? images[0];
                                  const displayName = getProductDisplayName(product);
                                  if (mainImage?.url) {
                                    return (
                                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                                      </div>
                                    );
                                  }
                                  return (
                                    <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700/70" />
                                  );
                                })()}
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-800 dark:text-slate-100">
                                      {getProductDisplayName(product)}
                                    </p>
                                    {hasVariants ? (
                                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200">
                                        Tipski
                                      </span>
                                    ) : null}
                                  </div>
                                  {hasVariants ? (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                                    </p>
                                  ) : (
                                    <RichTextSnippet
                                      text={product.opisFbInsta || product.opisKp || product.opis}
                                      className="text-[11px] text-slate-500 dark:text-slate-400"
                                    />
                                  )}
                                </div>
                                <div className="text-center">
                                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Cena</p>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                    {formatCurrency(displayPrice, "EUR")}
                                  </p>
                                </div>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              {restockSelectedVariants.length > 0 ? (
                <div className="space-y-2">
                  <FormLabel>Tip / varijanta</FormLabel>
                  <p className="text-xs text-slate-500">
                    Odaberi tacno koji tip proizvoda trazis. Podrazumevani tip je unapred izabran.
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {restockSelectedVariants.map((variant) => {
                      const isActive = restockVariantId === variant.id;
                      const composedLabel = restockSelectedProduct
                        ? composeVariantLabel(restockSelectedProduct, variant)
                        : variant.label;
                      const purchasePrice = restockSelectedProduct
                        ? resolveVariantPurchasePrice(restockSelectedProduct, variant)
                        : variant.nabavnaCena;
                      return (
                        <label
                          key={variant.id}
                          className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                            isActive
                              ? "border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-500/10"
                              : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-500"
                          }`}
                        >
                          <input
                            type="radio"
                            name="restockVariantId"
                            value={variant.id}
                            checked={isActive}
                            onChange={() => {
                              setRestockVariantId(variant.id);
                              if (restockSelectedProduct) {
                                setRestockProductInput(composedLabel);
                              }
                              setRestockProductMenuOpen(false);
                            }}
                            className="sr-only"
                          />
                          <span
                            className={`font-medium ${
                              isActive ? "text-blue-800 dark:text-blue-50" : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {composedLabel}
                          </span>
                          <span
                            className={`text-xs ${
                              isActive ? "text-blue-700 dark:text-blue-200" : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
                          </span>
                          <RichTextSnippet
                            text={variant.opis || restockSelectedProduct?.opisFbInsta || restockSelectedProduct?.opisKp || restockSelectedProduct?.opis}
                            className="text-[11px] text-slate-500 dark:text-slate-400"
                          />
                          {variant.isDefault ? (
                            <span
                              className={`text-[11px] font-semibold ${
                                isActive ? "text-emerald-600 dark:text-emerald-300" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              Podrazumevano
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="restockName"
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Ime
                  </label>
                  <Input
                    id="restockName"
                    value={restockName}
                    onChange={(event) => setRestockName(event.target.value)}
                    placeholder="Ime i prezime"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="restockPhone"
                    className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Telefon
                  </label>
                  <Input
                    id="restockPhone"
                    value={restockPhone}
                    onChange={(event) => setRestockPhone(event.target.value)}
                    placeholder="+381..."
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetRestockForm} disabled={isCreatingRestock}>
                Odbaci
              </Button>
              <Button
                type="button"
                onClick={handleCreateRestockRequest}
                disabled={isCreatingRestock || isProductsLoading}
              >
                {isCreatingRestock ? "Cuvanje..." : "Sacuvaj"}
              </Button>
            </div>
          </div>
          {isRestockLoading ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Ucitavanje...
            </div>
          ) : restockEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Trenutno nema zahteva.
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {restockEntries.map((entry) => {
                const product = entry.productId ? productMap.get(entry.productId) : undefined;
                const productTitle =
                  entry.productTitle || (product ? getProductDisplayName(product) : "Proizvod");
                const imageUrl = product ? resolveProductImageUrl(product) : null;
                return (
                  <div
                    key={entry._id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      {imageUrl ? (
                        <img src={imageUrl} alt={productTitle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                          N/A
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 px-2 text-center text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                        <div className="space-y-1">
                          <div>{productTitle}</div>
                          {entry.variantLabel ? (
                            <div className="text-[10px] font-medium text-slate-100">{entry.variantLabel}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <a
                      href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}
                      className="flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-blue-50"
                    >
                      <span className="truncate text-sm font-semibold text-slate-800">{entry.name}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <PhoneCall className="h-4 w-4 text-blue-500" />
                        {entry.phone}
                      </span>
                    </a>
                    <Button type="button" variant="destructive" size="sm" onClick={() => openRestockDeleteModal(entry)}>
                      Obrisi
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={restockDeleteOpen} onOpenChange={handleRestockDeleteOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Obrisi zahtev?</DialogTitle>
            <DialogDescription>Brisanje je trajno i ne moze da se vrati.</DialogDescription>
          </DialogHeader>
          {restockDeleteCandidate ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{restockDeleteCandidate.productTitle}</p>
              <p className="text-xs text-slate-500">
                {restockDeleteCandidate.name} - {restockDeleteCandidate.phone}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Zahtev nije izabran.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeRestockDeleteModal} disabled={isDeletingRestock}>
              Otkazi
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => restockDeleteCandidate && handleRestockDelete(restockDeleteCandidate._id)}
              disabled={!restockDeleteCandidate || isDeletingRestock}
            >
              {isDeletingRestock ? "Brisanje..." : "Obrisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(shipmentStageModal)}
        onOpenChange={(open) => {
          if (!open) {
            closeShipmentStageModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Broj porudzbine</DialogTitle>
            <DialogDescription>
              Unesi broj porudzbine pre promene statusa na "Poslato"
              {shipmentStageModal?.order ? ` (${resolveOrderShippingMode(shipmentStageModal.order) ?? "Slanje"})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="shipment-number-input">
              Broj porudzbine
            </label>
            <Input
              id="shipment-number-input"
              value={shipmentNumberDraft}
              placeholder="Unesi broj porudzbine"
              autoFocus
              onChange={(event) => setShipmentNumberDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleShipmentStageSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeShipmentStageModal} disabled={isShipmentStageSaving}>
              Otkazi
            </Button>
            <Button type="button" onClick={() => void handleShipmentStageSubmit()} disabled={isShipmentStageSaving}>
              {isShipmentStageSaving ? "Cuvanje..." : "Sacuvaj i oznaci kao poslato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Narudzbine</h1>
          <p className="text-sm text-slate-500">Tabela narudzbina, klik na red otvara detalje. Forma je u modalu.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {ordersPagination.total} narudzbina
          </div>
          <Button variant="outline" onClick={() => router.push("/narudzbine/uvoz")} className="hidden gap-2 md:inline-flex">
            <Share2 className="h-4 w-4" />
            Uvoz priznanica
          </Button>
          <Button variant="outline" onClick={() => router.push("/narudzbine/pare")} className="hidden gap-2 md:inline-flex">
            <Banknote className="h-4 w-4" />
            Legle pare
          </Button>
          <Button onClick={openCreateModal} className="hidden gap-2 md:inline-flex">
            <Plus className="h-4 w-4" />
            Nova narudzbina
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Lista narudzbina</CardTitle>
            <p className="text-sm text-slate-500">Klikni na red za pregled. Stage se moze menjati direktno iz tabele.</p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Pretraga (naslov, kupac, telefon...)"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetOrdersFeed();
                }}
                className="sm:w-72"
              />
              <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:items-center">
                <div className="relative" onMouseEnter={handleFilterMenuEnter} onMouseLeave={handleFilterMenuLeave}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 sm:w-auto"
                    onClick={handleFilterMenuToggle}
                    aria-expanded={isFilterMenuOpen}
                  >
                    Filteri
                    {activeFilterCount > 0 ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                  <div
                    className={cn(
                      "fixed inset-0 z-40 flex items-start justify-center bg-slate-900/30 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+5rem)] transition md:absolute md:inset-auto md:right-0 md:top-full md:z-30 md:block md:w-72 md:bg-transparent md:p-0 md:pt-2",
                      isFilterMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                    )}
                    onClick={() => setFilterMenuMode("closed")}
                  >
                    <div
                      className="max-h-[calc(100dvh-6rem)] w-[min(96vw,40rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:max-h-none md:w-72"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stage</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {STAGE_OPTIONS.map((option) => {
                              const isActive = stageFilters.includes(option.value);
                              return (
                                <label
                                  key={option.value}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                                    isActive
                                      ? option.tone
                                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => handleStageFilterToggle(option.value)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  {option.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Povrat</p>
                          <div className="flex flex-col gap-2">
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                                showUnreturnedOnly
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={showUnreturnedOnly}
                                onChange={(event) => handleUnreturnedToggle(event.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              Nepovraceni
                            </label>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                                showReturnedOnly
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={showReturnedOnly}
                                onChange={(event) => handleReturnedToggle(event.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              Povraceno
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preuzimanje</p>
                          <div className="flex flex-col gap-2">
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                                showPickupOnly
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={showPickupOnly}
                                onChange={(event) => handlePickupToggle(event.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              Samo licno preuzimanje
                            </label>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                                showShippingOnly
                                  ? "border-sky-200 bg-sky-50 text-sky-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={showShippingOnly}
                                onChange={(event) => handleShippingToggle(event.target.checked)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              Samo slanje
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Isporuka</p>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                              showLateOnly
                                ? "border-orange-300 bg-orange-100 text-orange-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={showLateOnly}
                              onChange={(event) => handleLateToggle(event.target.checked)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                            Samo oni koji kasne
                          </label>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Datum</p>
                          <div className="grid gap-2">
                            <label className="space-y-1 text-xs text-slate-600">
                              <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Od</span>
                              <Input
                                type="date"
                                value={dateFrom}
                                onChange={(event) => handleDateFromChange(event.target.value)}
                              />
                            </label>
                            <label className="space-y-1 text-xs text-slate-600">
                              <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Do</span>
                              <Input type="date" value={dateTo} onChange={(event) => handleDateToChange(event.target.value)} />
                            </label>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Prazno = od pocetka / do danas</span>
                              {dateFilterActive ? (
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-blue-700 hover:underline"
                                  onClick={handleClearDateFilter}
                                >
                                  Resetuj
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "col-span-2 w-full gap-2 sm:col-span-1 sm:w-auto",
                    refundPeriodOverview?.period
                      ? "border-0 bg-success-soft text-success ring-1 ring-inset ring-success/40 hover:bg-success-soft hover:brightness-105"
                      : "",
                  )}
                  onClick={openRefundPeriodModal}
                >
                  <CalendarRange className="h-4 w-4" />
                  {refundPeriodOverview?.period
                    ? `${formatRefundPeriodDate(refundPeriodOverview.period.startDate)} – ${formatRefundPeriodDate(refundPeriodOverview.period.endDate)}`
                    : "Period 100%"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => void handleOrdersPdf("download")}
                  disabled={isOrdersPdfBusy || isOrdersLoading}
                >
                  <Download className="h-4 w-4" />
                  {ordersPdfMode === "download" ? "Izvoz..." : "PDF"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-2 w-full gap-2 sm:w-auto"
                  onClick={() => void handleOrdersPdf("share")}
                  disabled={isOrdersPdfBusy || isOrdersLoading}
                >
                  <Share2 className="h-4 w-4" />
                  {ordersPdfMode === "share" ? "Deljenje..." : "Podeli PDF"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>
                {ordersPagination.total === 0
                  ? "Nema podataka"
                  : `Prikazano ${orders.length} od ${ordersPagination.total}`}
              </span>
              {hasMoreOrders ? (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                  Skroluj do dna za jos 10
                </span>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {refundPeriodOverview &&
          (refundPeriodOverview.period || refundPeriodOverview.manualCount > 0) ? (
            <div className="grid gap-3 rounded-2xl bg-success-soft p-4 ring-1 ring-inset ring-success/25 sm:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-success">
                  {refundPeriodOverview.period ? "Aktivan period 100% povrata" : "Ručno izabrani 100% povrati"}
                </p>
                <p className="mt-1 text-sm font-semibold text-text">
                  {refundPeriodOverview.period
                    ? `${formatRefundPeriodDate(refundPeriodOverview.period.startDate)} – ${formatRefundPeriodDate(
                        refundPeriodOverview.period.endDate,
                      )}`
                    : `${refundPeriodOverview.manualCount} ručno ${
                        refundPeriodOverview.manualCount === 1 ? "dodata porudžbina" : "dodatih porudžbina"
                      }`}
                </p>
                {refundPeriodOverview.period && refundPeriodOverview.manualCount > 0 ? (
                  <p className="mt-1 text-xs text-success">
                    + {refundPeriodOverview.manualCount} ručno dodatih
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-success">Za povrat</p>
                <p className="text-lg font-bold text-text">{refundPeriodOverview.pendingCount}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-success">Već vraćeno</p>
                <p className="text-lg font-bold text-text">{refundPeriodOverview.returnedCount}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-success">Preostali iznos</p>
                <p className="text-lg font-bold text-text">
                  {formatCurrency(refundPeriodOverview.pendingAmount, "EUR")}
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 rounded-2xl bg-accent-soft p-4 ring-1 ring-inset ring-accent/20 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisibleOrders}
                  disabled={visibleOrderIds.length === 0 || bulkAction !== null}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Označi sve prikazane
              </label>
              <span className="text-sm text-slate-600">Izabrano: {selectedVisibleCount}</span>
              {hasMoreOrders ? (
                <span className="text-xs text-slate-500">Učitane su samo trenutno prikazane porudžbine.</span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value=""
                disabled={selectedVisibleCount === 0 || bulkAction !== null}
                onChange={(event) => {
                  const stage = event.target.value as OrderStage;
                  if (stage) void handleBulkAction({ stage, message: `Status promenjen u ${STAGES[stage].label}` });
                }}
              >
                <option value="">Promeni status za izabrane...</option>
                {STAGE_OPTIONS
                  .filter((option) => option.value !== "poslato")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={selectedVisibleCount === 0 || bulkAction !== null}
                onClick={() => void handleBulkAction({ povratVracen: true, message: "Povrat označen" })}
              >
                Povrati sve
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={selectedVisibleCount === 0 || bulkAction !== null}
                onClick={() => void handleBulkAction({ povratVracen: false, message: "Povrat poništen" })}
              >
                Poništi povrat
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mini obracun za aktivne filtere
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Nabavno</p>
                <p className="text-base font-bold text-blue-700">{formatCurrency(ordersTotals.nabavno, "EUR")}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Transport</p>
                <p className="text-base font-bold text-red-700">{formatCurrency(ordersTotals.transport, "EUR")}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Prodajno</p>
                <p className="text-base font-bold text-slate-900">{formatCurrency(ordersTotals.prodajno, "EUR")}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Profit za povrat</p>
                <p className={cn("text-base font-bold", ordersTotals.profit < 0 ? "text-red-700" : "text-emerald-700")}>
                  {formatCurrency(ordersTotals.profit, "EUR")}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Povrat</p>
                <p className="text-base font-bold text-amber-700">{formatCurrency(ordersTotals.povrat, "EUR")}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 md:hidden">
            {isOrdersLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                Ucitavanje...
              </div>
            ) : orderEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                Jos nema narudzbina.
              </div>
            ) : (
              orderEntries.map(({
                order,
                prodajnoUkupno,
                nabavnoUkupno,
                transport,
                profitShare,
                povrat,
                calculatedPovrat,
                isInRefundPeriod,
                isManualRefund100,
                isFullRefund100,
                isExcludedBecauseReturned,
              }) => {
                  const previewImages = getOrderPreviewImages(order);
                  const itemNames = (order.items ?? [])
                    .map((item) => {
                      const product = item.productId ? productMap.get(item.productId) : undefined;
                      return product ? getProductDisplayName(product) : item.title;
                    })
                    .filter((name) => Boolean(name && name.trim().length > 0));
                  const primaryTitle = itemNames[0] ?? order.title;
                  const secondaryNames = itemNames.slice(1, 3);
                  const remainingCount = itemNames.length > 3 ? itemNames.length - 3 : 0;
                  const shipmentNumber = resolveShipmentNumber(order);
                  const showShipmentNumberInNote = shipmentNumber.length > 0;

                  return (
                    <div
                      key={order._id}
                      className={cn(
                        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition",
                        draggingOrderId === order._id ? "opacity-60" : "hover:border-blue-200",
                        isFullRefund100 && !isExcludedBecauseReturned
                          ? "refund-card refund-card--active"
                          : "",
                        isExcludedBecauseReturned
                          ? "refund-card refund-card--complete"
                          : "",
                      )}
                      onClick={() => handleRowClick(order._id)}
                      aria-label={
                        isFullRefund100
                          ? `${primaryTitle}, ${isExcludedBecauseReturned ? "povrat je već vraćen" : "obračun sa 100% profita"}`
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label
                          className="flex items-center gap-2 text-xs text-slate-500"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(order._id)}
                            onChange={(event) => toggleOrderSelection(order._id, event.target.checked)}
                            disabled={bulkAction !== null}
                            aria-label={`Označi porudžbinu ${order._id}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          {formatDate(order.kreiranoAt)}
                        </label>
                        <div className="flex flex-col items-end gap-1">
                          <StageBadge stage={order.stage} />
                          <p className="text-[10px] text-slate-500">
                            {order.stageChangedAt ? `Status: ${formatDate(order.stageChangedAt)}` : "Datum nije zabelezen"}
                          </p>
                          {isFullRefund100 ? (
                            <span
                              className={cn(
                                "refund-status-badge",
                                isExcludedBecauseReturned
                                  ? "refund-status-badge--complete"
                                  : "refund-status-badge--active",
                              )}
                            >
                              <BadgePercent aria-hidden="true" />
                              {isExcludedBecauseReturned
                                ? "Već vraćeno — ne računa se"
                                : isManualRefund100
                                  ? "Povrat 100% · ručno"
                                  : "Povrat 100%"}
                            </span>
                          ) : null}
                          {!isInRefundPeriod || isManualRefund100 ? (
                            <button
                              type="button"
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                isManualRefund100
                                  ? "border-slate-200 bg-white/80 text-slate-600 hover:border-red-200 hover:text-red-700"
                                  : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100",
                              )}
                              disabled={manualRefundSavingId === order._id}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleManualRefund100Toggle(order, !isManualRefund100);
                              }}
                            >
                              {manualRefundSavingId === order._id
                                ? "Čuvanje..."
                                : isManualRefund100
                                  ? "Ukloni ručno"
                                  : "+ Dodaj u 100%"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="flex flex-wrap gap-1">
                          {previewImages.length === 0 ? (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                              N/A
                            </div>
                          ) : (
                            previewImages.slice(0, 3).map((image) =>
                              image.url ? (
                                <div
                                  key={image.id}
                                  className="h-12 w-12 overflow-hidden rounded-md border-2 border-white shadow-sm"
                                >
                                  <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div
                                  key={image.id}
                                  className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400"
                                >
                                  N/A
                                </div>
                              ),
                            )
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1 text-sm font-semibold text-slate-900">
                            <span className="truncate">{primaryTitle}</span>
                            <ArrowUpRight className="h-4 w-4 text-slate-400" />
                          </div>
                          {secondaryNames.length > 0 ? (
                            <p className="text-xs text-slate-500">
                              {secondaryNames.join(" / ")}
                              {remainingCount > 0 ? ` +${remainingCount}` : ""}
                            </p>
                          ) : null}
                          {order.items && order.items.length > 1 ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {order.items.length} proizvoda
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className="mt-3 flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        {...createLongPressHandlers(() => openQuickEdit(order, "contact"))}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="truncate text-left font-medium text-slate-800 hover:text-blue-700"
                            onClick={(event) => {
                              if (consumeLongPressClick(event)) return;
                              event.stopPropagation();
                              void copyText(order.customerName, "Ime je kopirano.");
                            }}
                          >
                            {order.customerName}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyText(order._id, "Broj porudzbine je kopiran.");
                            }}
                            title={order._id}
                          >
                            ID
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <a
                            href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}
                            className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-blue-50"
                            onClick={(event) => {
                              if (consumeLongPressClick(event)) return;
                              event.stopPropagation();
                            }}
                          >
                            <PhoneCall className="h-4 w-4 text-blue-500" />
                            {order.phone}
                          </a>
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyText(order.phone, "Broj telefona je kopiran.");
                            }}
                            title="Kopiraj broj telefona"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {order.pickup ? (
                          <span className="inline-flex items-center gap-1 self-start rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                            <UserRound className="h-3.5 w-3.5" />
                            Licno
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Nabavno</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(nabavnoUkupno, "EUR")}
                          </p>
                        </div>
                        <div
                          className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1"
                          {...createLongPressHandlers(() => openQuickEdit(order, "transport"))}
                        >
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Transport</p>
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(transport, "EUR")}</p>
                        </div>
                        <div className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1">
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Prodajno</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(prodajnoUkupno, "EUR")}
                          </p>
                        </div>
                        <div
                          className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1"
                          {...createLongPressHandlers(() => openQuickEdit(order, "profit"))}
                        >
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Profit za povrat</p>
                          <p className={`text-sm font-semibold ${profitShare < 0 ? "text-red-600" : "text-slate-900"}`}>
                            {formatCurrency(profitShare, "EUR")}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2",
                          isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-card" : "",
                        )}
                      >
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Povrat</p>
                          <p
                            className={cn(
                              "text-sm font-semibold text-slate-900",
                              isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-value" : "",
                            )}
                          >
                            {formatCurrency(povrat, "EUR")}
                          </p>
                          {isExcludedBecauseReturned ? (
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              Obračunato {formatCurrency(calculatedPovrat, "EUR")}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <label className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(order.povratVracen)}
                              onChange={(event) => {
                                event.stopPropagation();
                                void handlePovratToggle(order, event.target.checked);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Vracen
                          </label>
                          {order.povratVracen ? (
                            <p className="mt-1 text-[10px] text-slate-500">
                              {order.povratVracenAt ? `Vracen: ${formatDate(order.povratVracenAt)}` : "Datum nije zabelezen"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div
                        className="mt-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs text-slate-500"
                        {...createLongPressHandlers(() => openQuickEdit(order, "address"))}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Adresa</p>
                        <p className="mt-1 line-clamp-2">{order.address || "-"}</p>
                      </div>
                      {showShipmentNumberInNote ? (
                        <button
                          type="button"
                          className="mt-3 flex w-full items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs text-blue-700"
                          title="Kopiraj + otvori pracenje"
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyText(shipmentNumber, "Broj posiljke je kopiran.");
                            const target = resolveTrackingTarget(shipmentNumber, resolveOrderShippingMode(order));
                            if (target) openTracking(target);
                          }}
                        >
                          <span className="font-semibold uppercase tracking-wide">Broj porudzbine</span>
                          <span className="font-mono text-sm">{shipmentNumber}</span>
                        </button>
                      ) : null}
                      <div
                        className="mt-3 flex flex-wrap items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          value={order.stage}
                          onChange={(event) => handleStageChange(order, event.target.value as OrderStage)}
                        >
                          {STAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteModal(order);
                          }}
                        >
                          Obrisi
                        </Button>
                      </div>
                    </div>
                  );
                },
              )
            )}
          </div>

          <div
            className="hidden md:block md:relative md:left-1/2 md:right-1/2 md:ml-[-50vw] md:mr-[-50vw] md:w-screen md:overflow-x-auto"
            style={{
              background: "var(--surface)",
              borderTop: "1px solid var(--card-border)",
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisibleOrders}
                    disabled={visibleOrderIds.length === 0 || bulkAction !== null}
                    aria-label="Označi sve prikazane porudžbine"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableHead>
                <TableHead className="text-center">Datum</TableHead>
                <TableHead className="text-center">Stage</TableHead>
                <TableHead className="text-center">Naslov</TableHead>
                <TableHead className="text-center">Kontakt</TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Nabavno</span>
                    <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.nabavno, "EUR")})</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Transport</span>
                    <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.transport, "EUR")})</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Prodajno</span>
                    <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.prodajno, "EUR")})</span>
                  </div>
                </TableHead>
                <TableHead className="text-center text-nowrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Profit za povrat</span>
                    <span className={cn("text-[11px]", ordersTotals.profit < 0 ? "text-red-600" : "text-slate-500")}>
                      ({formatCurrency(ordersTotals.profit, "EUR")})
                    </span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>Povrat</span>
                    <span className="text-[11px] text-slate-500">({formatCurrency(ordersTotals.povrat, "EUR")})</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">Broj porudzbine</TableHead>
                <TableHead className="text-center">Akcije</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {isOrdersLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-slate-500">
                    Ucitavanje...
                  </TableCell>
                </TableRow>
              ) : orderEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-slate-500">
                    Jos nema narudzbina.
                  </TableCell>
                </TableRow>
              ) : (
                orderEntries.map(
                  ({
                    order,
                    prodajnoUkupno,
                    nabavnoUkupno,
                    transport,
                    profitShare,
                    povrat,
                    calculatedPovrat,
                    isInRefundPeriod,
                    isManualRefund100,
                    isFullRefund100,
                    isExcludedBecauseReturned,
                  }) => {
                    const previewImages = getOrderPreviewImages(order);
                    const itemNames = (order.items ?? [])
                      .map((item) => {
                        const product = item.productId ? productMap.get(item.productId) : undefined;
                        return product ? getProductDisplayName(product) : item.title;
                      })
                      .filter((name) => Boolean(name && name.trim().length > 0));
                    const primaryTitle = itemNames[0] ?? order.title;
                    const secondaryNames = itemNames.slice(1, 3);
                    const remainingCount = itemNames.length > 3 ? itemNames.length - 3 : 0;
                    const shipmentNumber = resolveShipmentNumber(order);
                    const showShipmentNumberInNote = shipmentNumber.length > 0;
                    const isSent = order.stage === "poslato";
                    const isLate = isSent && Boolean(order.kasni);

                    return (
                      <TableRow
                        key={order._id}
                        className={cn(
                          "cursor-pointer transition",
                          draggingOrderId === order._id ? "opacity-60" : "hover:bg-slate-50",
                          dragOverOrderId === order._id && draggingOrderId !== order._id ? "bg-blue-50" : "",
                          isFullRefund100 && !isExcludedBecauseReturned
                            ? "refund-row refund-row--active"
                            : "",
                          isExcludedBecauseReturned
                            ? "refund-row refund-row--complete"
                            : "",
                          isLate ? "order-row--late" : "",
                        )}
                        aria-label={
                          isFullRefund100
                            ? `${primaryTitle}, ${isExcludedBecauseReturned ? "povrat je već vraćen" : "obračun sa 100% profita"}`
                            : undefined
                        }
                        onClick={() => handleRowClick(order._id)}
                        onDragOver={handleOrderDragOver(order._id)}
                        onDragLeave={handleOrderDragLeave(order._id)}
                        onDrop={handleOrderDrop(order._id)}
                      >
                        <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(order._id)}
                            onChange={(event) => toggleOrderSelection(order._id, event.target.checked)}
                            disabled={bulkAction !== null}
                            aria-label={`Označi porudžbinu ${order._id}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className="flex items-center gap-2 text-sm text-slate-600 cursor-grab active:cursor-grabbing"
                            draggable
                            onClick={(event) => event.stopPropagation()}
                            onDragStart={handleOrderDragStart(order._id)}
                            onDragEnd={handleOrderDragEnd}
                          >
                            <GripVertical className="h-4 w-4 text-slate-400" />
                            <span>{formatDate(order.kreiranoAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <StageBadge stage={order.stage} />
                            <p className="text-[10px] text-slate-500">
                              {order.stageChangedAt ? formatDate(order.stageChangedAt) : "Datum nije zabelezen"}
                            </p>
                            {isSent ? (
                              <label
                                className={cn(
                                  "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                  isLate
                                    ? "border-orange-300 bg-orange-100 text-orange-800"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700",
                                  kasniSavingId === order._id ? "opacity-60" : "",
                                )}
                                title="Označi da paket kasni sa isporukom"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(order.kasni)}
                                  disabled={kasniSavingId === order._id}
                                  onChange={(event) => {
                                    event.stopPropagation();
                                    void handleKasniToggle(order, event.target.checked);
                                  }}
                                  className="h-3 w-3 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                />
                                {isLate
                                  ? `Kasni${order.slanjeMode ? ` · zovi ${order.slanjeMode}` : ""}`
                                  : "Kasni"}
                              </label>
                            ) : null}
                            {isFullRefund100 ? (
                              <span
                                className={cn(
                                  "refund-status-badge",
                                  isExcludedBecauseReturned
                                    ? "refund-status-badge--complete"
                                    : "refund-status-badge--active",
                                )}
                              >
                                <BadgePercent aria-hidden="true" />
                                {isExcludedBecauseReturned
                                  ? "Već vraćeno — ne računa se"
                                  : isManualRefund100
                                    ? "Povrat 100% · ručno"
                                    : "Povrat 100%"}
                              </span>
                            ) : null}
                            {!isInRefundPeriod || isManualRefund100 ? (
                              <button
                                type="button"
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                                  isManualRefund100
                                    ? "border-slate-200 bg-white/80 text-slate-600 hover:border-red-200 hover:text-red-700"
                                    : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-100",
                                )}
                                disabled={manualRefundSavingId === order._id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleManualRefund100Toggle(order, !isManualRefund100);
                                }}
                              >
                                {manualRefundSavingId === order._id
                                  ? "Čuvanje..."
                                  : isManualRefund100
                                    ? "Ukloni ručno"
                                    : "+ Dodaj u 100%"}
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1">
                              {previewImages.length === 0 ? (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400">
                                  N/A
                                </div>
                              ) : (
                                previewImages.map((image) =>
                                  image.url ? (
                                    <div
                                      key={image.id}
                                      className="h-10 w-10 overflow-hidden rounded-md border-2 border-white shadow-sm"
                                    >
                                      <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                                    </div>
                                  ) : (
                                    <div
                                      key={image.id}
                                      className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase text-slate-400"
                                    >
                                      N/A
                                    </div>
                                  ),
                                )
                              )}
                            </div>
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1">
                                {primaryTitle}
                                <ArrowUpRight className="h-4 w-4 text-slate-400" />
                              </span>
                              {secondaryNames.length > 0 ? (
                                <p className="text-xs text-slate-500">
                                  {secondaryNames.join(" / ")}
                                  {remainingCount > 0 ? ` +${remainingCount}` : ""}
                                </p>
                              ) : null}
                              {order.items && order.items.length > 1 ? (
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                  {order.items.length} proizvoda
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1">
                              <button
                                type="button"
                                className="truncate text-left font-medium text-slate-800 hover:text-blue-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void copyText(order.customerName, "Ime je kopirano.");
                                }}
                                title={order.customerName}
                              >
                                {order.customerName}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void copyText(order._id, "Broj porudzbine je kopiran.");
                                }}
                                title={order._id}
                              >
                                ID
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-blue-50">
                              <a
                                href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}
                                className="flex min-w-0 items-center gap-1 text-xs text-slate-500"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <PhoneCall className="h-4 w-4 text-blue-500" />
                                <span className="truncate">{order.phone}</span>
                              </a>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void copyText(order.phone, "Broj telefona je kopiran.");
                                }}
                                title="Kopiraj broj telefona"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {order.pickup ? (
                              <span className="inline-flex items-center gap-1 self-start rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                                <UserRound className="h-3.5 w-3.5" />
                                Licno
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-transparent px-2 py-1 font-medium text-slate-900 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            onClick={(event) => {
                              event.stopPropagation();
                              openQuickEdit(order, "transport");
                            }}
                            title="Brza izmena transporta"
                          >
                            {formatCurrency(transport, "EUR")}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-center font-semibold">
                            <span className={profitShare < 0 ? "text-red-600" : ""}>
                              {formatCurrency(profitShare, "EUR")}
                            </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div
                            className={cn(
                              "flex flex-col items-end gap-1",
                              isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-card" : "",
                            )}
                          >
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={cn(
                                  isFullRefund100 && !isExcludedBecauseReturned ? "refund-amount-value" : "",
                                )}
                              >
                                {formatCurrency(povrat, "EUR")}
                              </span>
                              <input
                                type="checkbox"
                                checked={Boolean(order.povratVracen)}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  void handlePovratToggle(order, event.target.checked);
                                }}
                                onClick={(event) => event.stopPropagation()}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            {isExcludedBecauseReturned ? (
                              <p className="text-[10px] text-slate-500">
                                Obračunato {formatCurrency(calculatedPovrat, "EUR")}
                              </p>
                            ) : null}
                            {order.povratVracen ? (
                              <p className="text-[10px] text-slate-500">
                                {order.povratVracenAt ? formatDate(order.povratVracenAt) : "Datum nije zabelezen"}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-slate-500">
                          {showShipmentNumberInNote ? (
                            <button
                              type="button"
                              className="inline-flex max-w-full items-center gap-1 truncate font-mono text-blue-700 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void copyText(shipmentNumber, "Broj posiljke je kopiran.");
                                const target = resolveTrackingTarget(shipmentNumber, resolveOrderShippingMode(order));
                                if (target) openTracking(target);
                              }}
                              title={shipmentNumber}
                            >
                              {shipmentNumber}
                            </button>
                          ) : (
                            order.napomena || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-nowrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            <select
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                              value={order.stage}
                              onChange={(event) => handleStageChange(order, event.target.value as OrderStage)}
                            >
                              {STAGE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDeleteModal(order);
                              }}
                            >
                              Obrisi
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )
              )}
              </TableBody>
            </Table>
          </div>
          <div ref={ordersLoaderRef} className="flex justify-center">
            <LoadingDots show={isLoadingMoreOrders && hasMoreOrders} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
