"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Loader2, PenLine, PhoneCall, Plus, Share2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/calc";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import type { OrderStage, OrderWithProduct, Product, ProductVariant, Supplier } from "@/types/order";

const stageOptions: { value: OrderStage; label: string; tone: string }[] = [
  { value: "poruceno", label: "Poruceno", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "na_stanju", label: "Na stanju", tone: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  { value: "poslato", label: "Poslato", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  { value: "stiglo", label: "Stiglo", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { value: "legle_pare", label: "Leglo", tone: "border-slate-200 bg-slate-100 text-slate-900" },
  { value: "vraceno", label: "Vraćeno", tone: "border-rose-200 bg-rose-50 text-rose-800" },
];
const transportModes = ["Kol", "Joe", "Smg"] as const;
const slanjeModes = ["Posta", "Aks", "Bex"] as const;
const shippingModes = ["Posta", "Aks", "Bex"] as const;
type ShippingMode = (typeof shippingModes)[number];
const deleteConfirmPhrase = "potvrdjujem da brisem";
const requiresDeleteConfirmation = (stage?: OrderStage) =>
  stage === "stiglo" || stage === "legle_pare" || stage === "vraceno";

const resolveOrderShippingMode = (
  order?: Pick<OrderWithProduct, "slanjeMode" | "transportMode"> | null,
): ShippingMode | undefined => {
  if (!order) return undefined;
  const mode = order.slanjeMode;
  if (mode && shippingModes.includes(mode as ShippingMode)) {
    return mode as ShippingMode;
  }
  const legacyMode = order.transportMode;
  if (legacyMode && shippingModes.includes(legacyMode as ShippingMode)) {
    return legacyMode as ShippingMode;
  }
  return undefined;
};

const resolveShipmentNumber = (order?: Pick<OrderWithProduct, "brojPosiljke"> | null) => order?.brojPosiljke?.trim() ?? "";

const stageLabels = stageOptions.reduce((acc, item) => {
  acc[item.value] = { label: item.label, tone: item.tone };
  return acc;
}, {} as Record<OrderStage, { label: string; tone: string }>);

const StageBadge = ({ stage }: { stage: OrderStage }) => {
  const meta = stageLabels[stage] ?? { label: stage, tone: "" };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
        meta.tone || "border-slate-200 bg-slate-100 text-slate-800"
      }`}
    >
      {meta.label}
    </span>
  );
};

const resolveProfitPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 100;

const formatPercent = (value: number) =>
  `${value.toLocaleString("sr-RS", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

const generateId = () => Math.random().toString(36).slice(2);

const getProductVariants = (product?: Product): ProductVariant[] => {
  if (!product) return [];
  return product.variants ?? [];
};

const getProductDisplayName = (product?: Product | null) => {
  if (!product) return "";
  return product.kpName ?? product.name;
};

const composeVariantLabel = (product: Product, variant?: ProductVariant) => {
  const displayName = getProductDisplayName(product);
  if (!variant) return displayName;
  return `${displayName} - ${variant.label}`;
};

const resolveSupplierOptions = (product?: Product, variantId?: string) => {
  if (!product) return [];
  const offers = product.supplierOffers ?? [];
  if (!offers.length) return [];
  const normalizedVariantId = variantId?.trim() || undefined;
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (normalizedVariantId ?? null));
  const fallback = normalizedVariantId ? [] : offers.filter((offer) => !offer.variantId);
  const pool = exact.length ? exact : fallback;
  const seen = new Set<string>();
  return pool
    .filter((offer) => {
      const key = String(offer.supplierId);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((offer) => ({ supplierId: String(offer.supplierId), price: offer.price }));
};

const pickBestSupplier = (options: { supplierId: string; price: number; supplierName?: string }[]) => {
  if (!options.length) return null;
  return options.reduce((best, option) => {
    if (!best || option.price < best.price) return option;
    return best;
  }, null as { supplierId: string; price: number; supplierName?: string } | null);
};

const resolveVariantPurchasePrice = (product: Product, variant: ProductVariant) => {
  const offers = product.supplierOffers ?? [];
  const bestVariantOffer = offers
    .filter((offer) => (offer.variantId ?? null) === variant.id)
    .reduce((best, offer) => (best === null || offer.price < best ? offer.price : best), null as number | null);
  return bestVariantOffer ?? variant.nabavnaCena;
};

type InlineFieldProps = {
  label: string;
  value?: string | number | null;
  multiline?: boolean;
  formatter?: (value?: string | number | null) => string;
  renderDisplay?: (valueAsString: string) => ReactNode;
  onSave: (nextValue: string) => Promise<void>;
};

function InlineField({ label, value, multiline = false, formatter, renderDisplay, onSave }: InlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<string>(value ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueAsString = value === null || value === undefined ? "" : String(value);

  useEffect(() => {
    if (isEditing) {
      const target = multiline ? textareaRef.current : inputRef.current;
      if (target) {
        requestAnimationFrame(() => {
          target.focus();
          try {
            target.setSelectionRange(0, target.value.length);
          } catch {
            // ignore
          }
        });
      }
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(valueAsString);
    }
  }, [isEditing, valueAsString]);

  const handleCopy = async () => {
    const copyValue = valueAsString || formatter?.(value) || "";
    if (!copyValue) {
      toast.info("Nema vrednosti za kopiranje.");
      return;
    }
    try {
      await navigator.clipboard.writeText(copyValue);
      toast.success("Kopirano.");
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch {
      // greska se vec javlja kroz toast
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = formatter ? formatter(value) : valueAsString || "-";
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleSave();
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex w-full items-start justify-between gap-3">
        <div className="w-full space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {isEditing ? (
            multiline ? (
              <Textarea
                ref={textareaRef}
                autoResize
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="w-full text-sm"
              />
            ) : (
              <Input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                className="text-sm"
              />
            )
          ) : (
            <div className="text-base font-semibold text-slate-900">
              {renderDisplay ? renderDisplay(displayValue) : displayValue}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-1 py-0.5 text-slate-500 shadow-sm opacity-100 transition md:absolute md:right-3 md:top-3 md:opacity-0 md:group-hover:opacity-100">
          {isEditing ? (
            <>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setDraft(valueAsString);
                  setIsEditing(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full bg-blue-50 p-1 text-blue-700 hover:bg-blue-100"
                onClick={handleSave}
                disabled={isSaving}
                title="Sacuvaj"
              >
                <Check className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setDraft(valueAsString);
                  setIsEditing(true);
                }}
                title="Izmeni"
              >
                <PenLine className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                onClick={handleCopy}
                title="Kopiraj vrednost"
              >
                <Copy className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <RequireAuth>
      <OrderDetailsContent />
    </RequireAuth>
  );
}

function OrderDetailsContent() {
  const params = useParams();
  const basePath = "/narudzbine";
  const backLabel = "Nazad na narudzbine";
  const orderScope = "default";
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(basePath);
  }, [basePath, router]);

  if (!orderId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Nije prosledjen ID narudzbine.</p>
        <Button onClick={handleBack}>{backLabel}</Button>
      </div>
    );
  }

  return <OrderDetails orderId={orderId} basePath={basePath} backLabel={backLabel} orderScope={orderScope} />;
}

function OrderDetails({
  orderId,
  basePath,
  backLabel,
  orderScope,
}: {
  orderId: string;
  basePath: string;
  backLabel: string;
  orderScope: "default" | "kalaba";
}) {
  const router = useRouter();
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(basePath);
  }, [basePath, router]);
  const { token } = useAuth();
  const sessionToken = token as string;
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const updateOrder = useConvexMutation("orders:update");
  const deleteOrder = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>("orders:remove");
  const queryResult = useConvexQuery<OrderWithProduct | null>("orders:get", {
    token: sessionToken,
    id: orderId,
    scope: orderScope,
  });
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });

  const [order, setOrder] = useState<OrderWithProduct | null>(null);
  const isLoading = queryResult === undefined;
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [itemProductId, setItemProductId] = useState("");
  const [itemVariantId, setItemVariantId] = useState("");
  const [itemSupplierId, setItemSupplierId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [useManualSalePrice, setUseManualSalePrice] = useState(false);
  const [manualSalePrice, setManualSalePrice] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shipmentStageModalOpen, setShipmentStageModalOpen] = useState(false);
  const [shipmentNumberDraft, setShipmentNumberDraft] = useState("");
  const [isShipmentStageSaving, setIsShipmentStageSaving] = useState(false);
  const productInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (queryResult !== undefined) {
      setOrder(queryResult);
    }
  }, [queryResult]);

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const resolveShareUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const handleCopyShareLink = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      toast.error("Link nije dostupan.");
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Link kopiran.");
      setShareOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  };

  const handleShareLink = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      toast.error("Link nije dostupan.");
      return;
    }
    if (!canShare || typeof navigator === "undefined") {
      toast.error("Share nije podrzan.");
      return;
    }
    setShareOpen(false);
    try {
      await navigator.share({
        title: order?.title ?? "Narudzbina",
        url: shareUrl,
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error(error);
      toast.error("Sharovanje nije uspelo.");
    }
  };

  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
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
  }, [itemVariantId, selectedProduct, selectedVariants]);

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
    transportMode: current.transportMode,
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
      | "transportMode"
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

    if (field === "transportMode") {
      const normalized = transportModes.find((mode) => mode.toLowerCase() === trimmed.toLowerCase());
      await applyOrderUpdate((current) => ({ ...current, transportMode: normalized }), "Sacuvano.");
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

  const resetItemDraft = () => {
    setItemProductId("");
    setItemVariantId("");
    setItemSupplierId("");
    setItemQuantity(1);
    setUseManualSalePrice(false);
    setManualSalePrice("");
    setProductInput("");
    setProductSearch("");
    setProductMenuOpen(false);
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
    const nabavnaCena = supplierPrice ?? variant?.nabavnaCena ?? selectedProduct.nabavnaCena;
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

  const totals = order ? orderTotals(order) : null;
  const prodajnoUkupno = totals?.totalProdajno ?? 0;
  const nabavnoUkupno = totals?.totalNabavno ?? 0;
  const transport = totals?.transport ?? 0;
  const prof = totals?.profit ?? 0;
  const slanjeOwnerLabel =
    order?.slanjeMode === "Posta"
      ? "Posta - na ime"
      : order?.slanjeMode
        ? "Aks/Bex - na ciji racun"
        : "Slanje - na ciji racun";
  const slanjeOwnerPlaceholder =
    order?.slanjeMode === "Posta"
      ? "Unesi na ime"
      : order?.slanjeMode
        ? "Unesi na ciji racun"
        : "Izaberi slanje prvo";
  const myProfitPercent = resolveProfitPercent(order?.myProfitPercent);
  const myProfit = prof * (myProfitPercent / 100);
  const profitShare = myProfit * 0.5;
  const profitSharePercent = myProfitPercent * 0.5;
  const povrat = nabavnoUkupno + transport + profitShare;
  const telHref = order ? `tel:${order.phone.replace(/[^+\d]/g, "")}` : "";

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
      await applyOrderUpdate(
        (current) => ({ ...current, stage: nextStage, brojPosiljke: undefined }),
        "Status narudzbine je azuriran.",
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteConfirmText("");
  };

  const handleDeleteModalOpenChange = (open: boolean) => {
    if (open) {
      setDeleteModalOpen(true);
    } else {
      closeDeleteModal();
    }
  };

  const handleDeleteOrder = async () => {
    if (!order || isDeletingOrder) return;
    setIsDeletingOrder(true);
    try {
      await deleteOrder({ id: order._id, token: sessionToken, scope: orderScope });
      toast.success("Narudzbina je obrisana.");
      closeDeleteModal();
      handleBack();
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    } finally {
      setIsDeletingOrder(false);
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

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          <span className="text-sm text-slate-600">Ucitavanje narudzbine...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Narudzbina nije pronadjena.</p>
        <p className="text-sm text-slate-500">Proveri link ili se vrati na listu narudzbina.</p>
        <Button onClick={handleBack}>{backLabel}</Button>
      </div>
    );
  }

  const deleteRequiresConfirmation = requiresDeleteConfirmation(order.stage);
  const isDeletePhraseValid = deleteConfirmText.trim().toLowerCase() === deleteConfirmPhrase;
  const isDeleteDisabled = isDeletingOrder || (deleteRequiresConfirmation && !isDeletePhraseValid);

  const mainImage = (() => {
    const images = order.product?.images ?? [];
    return images.find((image) => image.isMain) ?? images[0];
  })();

  return (
    <div className="mx-auto space-y-6">
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Podeli narudzbinu</DialogTitle>
            <DialogDescription>Prvo kopiraj link, pa podeli preko aplikacije.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button type="button" className="w-full justify-start gap-2" onClick={handleCopyShareLink}>
              <Copy className="h-4 w-4" />
              Kopiraj link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleShareLink}
              disabled={!canShare}
            >
              <Share2 className="h-4 w-4" />
              Podeli link
            </Button>
            {!canShare ? <p className="text-xs text-slate-500">Share nije podrzan na ovom uredjaju.</p> : null}
          </div>
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
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{order.title}</p>
              <p className="text-xs text-slate-500">
                {order.customerName} · Stage: {stageLabels[order.stage]?.label ?? order.stage}
              </p>
            </div>
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
            <Button type="button" variant="destructive" onClick={handleDeleteOrder} disabled={isDeleteDisabled}>
              {isDeletingOrder ? "Brisanje..." : "Obrisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={shipmentStageModalOpen}
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
              {order ? ` (${resolveOrderShippingMode(order) ?? "Slanje"})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="shipment-number-details">
              Broj porudzbine
            </label>
            <Input
              id="shipment-number-details"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Narudzbina</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{order.title}</h1>
              <StageBadge stage={order.stage} />
            </div>
            {order.variantLabel ? <p className="text-sm text-slate-500">{order.variantLabel}</p> : null}
            <p className="text-xs text-slate-500">Kreirano {formatDate(order.kreiranoAt)}</p>
          </div>
        </div>
        <div className="w-full -mx-2 overflow-x-auto pb-2 sm:mx-0 sm:pb-0">
            <div className="flex min-w-max gap-2 px-2 sm:px-0">
              {stageOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={order.stage === option.value ? "default" : "outline"}
                  className="min-w-[92px] whitespace-nowrap"
                  disabled={isUpdatingStage || order.stage === option.value}
                  onClick={() => handleStageChange(option.value)}
                >
                  {isUpdatingStage && order.stage !== option.value ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {option.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="destructive" onClick={openDeleteModal}>
                Obrisi
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
                Podeli
              </Button>
            </div>
          </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Stavke narudzbine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InlineField label="Naziv narudzbine" value={order.title} onSave={(val) => handleOrderFieldSave("title", val)} />
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item) => {
                const images = (item as any).product?.images ?? [];
                const mainImage = images.find((image: any) => image.isMain) ?? images[0];
                const isOnlyItem = (order.items?.length ?? 0) <= 1;
                const productMedia = mainImage?.url ? (
                  <div className="h-14 w-14 overflow-hidden rounded-md border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mainImage.url} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                    N/A
                  </div>
                );
                const itemInfo = (
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    {item.variantLabel ? <p className="text-xs text-slate-500">{item.variantLabel}</p> : null}
                    <p className="text-xs text-slate-500">Kolicina: {item.kolicina}</p>
                  </div>
                );
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    {item.productId ? (
                      <Link
                        href={`/proizvodi/${item.productId}`}
                        className="flex items-center gap-3 rounded-md p-1 -m-1 transition hover:bg-slate-50"
                      >
                        {productMedia}
                        {itemInfo}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        {productMedia}
                        {itemInfo}
                      </div>
                    )}
                    <div className="text-right text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Prodajna</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.prodajnaCena, "EUR")}</p>
                      <p className="text-xs text-slate-500">Nabavna {formatCurrency(item.nabavnaCena, "EUR")}</p>
                        {item.manualProdajna ? (
                          <span className="inline-flex justify-end text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                            Rucno uneta cena
                          </span>
                        ) : null}
                    </div>
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isOnlyItem}
                        aria-label="Obrisi stavku"
                      >
                        <Trash2 className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Narudzbina nema stavke.</p>
          )}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Dodaj jos proizvoda</p>
              <p className="text-xs text-slate-500">Odaberi proizvod, tip i kolicinu pa ga dodaj u narudzbinu.</p>
            </div>
            <div className="relative">
              <Input
                ref={productInputRef}
                name="productSearch"
                value={productInput}
                placeholder={products === undefined ? "Ucitavanje..." : "Pretrazi proizvod"}
                disabled={products === undefined || (products?.length ?? 0) === 0}
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
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {products === undefined ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                  ) : (
                    filteredProducts.map((product, productIndex) => {
                      const variants = product.variants ?? [];
                      const hasVariants = variants.length > 0;
                      const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                      const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
                      return (
                        <div
                          key={product._id}
                          className={`border-b border-slate-100 last:border-b-0 ${
                            productIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700"
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
                                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                                  </div>
                                );
                              }
                              return <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200" />;
                            })()}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">{getProductDisplayName(product)}</p>
                                {hasVariants ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                    Tipski
                                  </span>
                                ) : null}
                              </div>
                              {hasVariants ? (
                                <p className="text-[11px] text-slate-500">
                                  {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cena</p>
                              <p className="text-sm font-semibold text-slate-900">
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
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-3">
                  {(() => {
                    const images = selectedProduct.images ?? [];
                    const mainImage = images.find((image) => image.isMain) ?? images[0];
                    const displayName = getProductDisplayName(selectedProduct);
                    if (mainImage?.url) {
                      return (
                        <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                        </div>
                      );
                    }
                    return (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] uppercase text-slate-400">
                        N/A
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getProductDisplayName(selectedProduct)}</p>
                    {selectedVariantForPreview ? (
                      <p className="text-xs text-slate-600">{selectedVariantForPreview.label}</p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Prodajna cena</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrency(selectedVariantForPreview?.prodajnaCena ?? selectedProduct.prodajnaCena, "EUR")}
                  </p>
                </div>
              </div>
            ) : null}

            {selectedVariants.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Tip / varijanta</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {selectedVariants.map((variant) => {
                    const isActive = itemVariantId === variant.id;
                    const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
                    const purchasePrice = selectedProduct ? resolveVariantPurchasePrice(selectedProduct, variant) : variant.nabavnaCena;
                    return (
                      <label
                        key={variant.id}
                        className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                          isActive ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300"
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
                        <span className={`font-medium ${isActive ? "text-blue-800" : "text-slate-800"}`}>
                          {composedLabel}
                        </span>
                        <span className={`text-xs ${isActive ? "text-blue-700" : "text-slate-500"}`}>
                          Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna{" "}
                          {formatCurrency(variant.prodajnaCena, "EUR")}
                        </span>
                        {variant.isDefault ? (
                          <span className="text-[11px] font-semibold text-emerald-600">Podrazumevano</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedProduct && supplierOptionsWithNames.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-slate-700">Dobavljac</p>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
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
              <div className="grid gap-3 md:grid-cols-3 md:items-end">
                <div>
                  <p className="text-sm font-medium text-slate-700">Kolicina</p>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
                  </label>
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={handleAddItem} className="gap-2" disabled={isAddingItem}>
                    <Plus className="h-4 w-4" />
                    {isAddingItem ? "Dodavanje..." : "Dodaj u narudzbinu"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetItemDraft} disabled={isAddingItem}>
                    Ponisti izbor
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:hidden">
          <CardHeader>
            <CardTitle>Kupac i dostava</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <InlineField
                label="Ime"
                value={order.customerName}
                onSave={(val) => handleOrderFieldSave("customerName", val)}
              />
              <InlineField
                label="Telefon"
                value={order.phone}
                renderDisplay={(val) => (
                  <a
                    href={`tel:${val.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-2 text-blue-700 hover:underline"
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span className="text-slate-900">{val || "-"}</span>
                  </a>
                )}
                onSave={(val) => handleOrderFieldSave("phone", val)}
              />
              <InlineField
                label="Adresa"
                value={order.address}
                multiline
                onSave={(val) => handleOrderFieldSave("address", val)}
              />
              <InlineField
                label="Transport (EUR)"
                value={transport}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleOrderFieldSave("transportCost", val)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {transportModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                    order.transportMode === mode
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                  onClick={() => handleOrderFieldSave("transportMode", mode)}
                >
                  {mode}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-slate-300"
                onClick={() => handleOrderFieldSave("transportMode", "")}
              >
                Bez kurira
              </button>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slanje</p>
              <div className="flex flex-wrap items-center gap-2">
                {slanjeModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      order.slanjeMode === mode
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                    onClick={() => handleOrderFieldSave("slanjeMode", mode)}
                  >
                    {mode}
                  </button>
                ))}
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    !order.slanjeMode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  onClick={() => handleOrderFieldSave("slanjeMode", "")}
                >
                  Bez slanja
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{slanjeOwnerLabel}</p>
                <Input
                  className="disabled:cursor-not-allowed disabled:bg-slate-100"
                  value={order.slanjeOwner ?? ""}
                  placeholder={slanjeOwnerPlaceholder}
                  disabled={!order.slanjeMode}
                  onChange={(event) => handleOrderFieldSave("slanjeOwner", event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(order.pickup)}
                  onChange={(event) => handlePickupToggle(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Licno preuzimanje
              </label>
              <StageBadge stage={order.stage} />
            </div>
          </CardContent>
        </Card>
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Kupac i dostava</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField
                label="Kupac"
                value={order.customerName}
                onSave={(val) => handleOrderFieldSave("customerName", val)}
              />
              <InlineField
                label="Telefon"
                value={order.phone}
                renderDisplay={(val) => (
                  <a
                    href={`tel:${val.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-2 text-blue-700 hover:underline"
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span className="text-slate-900">{val || "-"}</span>
                  </a>
                )}
                onSave={(val) => handleOrderFieldSave("phone", val)}
              />
              <InlineField
                label="Adresa"
                value={order.address}
                multiline
                onSave={(val) => handleOrderFieldSave("address", val)}
              />
              <InlineField
                label="Transport (EUR)"
                value={transport}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleOrderFieldSave("transportCost", val)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {transportModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                    order.transportMode === mode
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                  onClick={() => handleOrderFieldSave("transportMode", mode)}
                >
                  {mode}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-slate-300"
                onClick={() => handleOrderFieldSave("transportMode", "")}
              >
                Bez kurira
              </button>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slanje</p>
              <div className="flex flex-wrap items-center gap-2">
                {slanjeModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      order.slanjeMode === mode
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                    onClick={() => handleOrderFieldSave("slanjeMode", mode)}
                  >
                    {mode}
                  </button>
                ))}
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    !order.slanjeMode
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                  onClick={() => handleOrderFieldSave("slanjeMode", "")}
                >
                  Bez slanja
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{slanjeOwnerLabel}</p>
                <Input
                  className="disabled:cursor-not-allowed disabled:bg-slate-100"
                  value={order.slanjeOwner ?? ""}
                  placeholder={slanjeOwnerPlaceholder}
                  disabled={!order.slanjeMode}
                  onChange={(event) => handleOrderFieldSave("slanjeOwner", event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(order.pickup)}
                  onChange={(event) => handlePickupToggle(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Lično preuzimanje
              </label>
              <StageBadge stage={order.stage} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finansije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ukupna kolicina</p>
                <p className="text-base font-semibold text-slate-900">{totals?.totalQty ?? order.kolicina}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Prodajno ukupno</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(prodajnoUkupno, "EUR")}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Nabavno ukupno</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(nabavnoUkupno, "EUR")}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Transport</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(transport, "EUR")}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField
                label="Moj procenat profita"
                value={myProfitPercent}
                formatter={(val) => formatPercent(Number(val ?? 0))}
                onSave={(val) => handleOrderFieldSave("myProfitPercent", val)}
              />
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Moj profit</p>
                <p className={`text-base font-semibold ${myProfit < 0 ? "text-red-600" : "text-slate-900"}`}>
                  {formatCurrency(myProfit, "EUR")}
                </p>
                <p className="text-xs text-slate-500">Ukupno {formatCurrency(prof, "EUR")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Povrat</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(povrat, "EUR")}</p>
                <p className="text-xs text-slate-500">
                  Profit (50%): {formatCurrency(profitShare, "EUR")} ({formatPercent(profitSharePercent)})
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(order.povratVracen)}
                  onChange={(event) => handlePovratToggle(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Povrat vracen
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Napomena</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InlineField
            label="Napomena"
            value={order.napomena ?? ""}
            multiline
            onSave={(val) => handleOrderFieldSave("napomena", val)}
          />
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <a href={telHref} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
              <PhoneCall className="h-3.5 w-3.5" />
              {order.phone}
            </a>
            <span className="text-slate-400">·</span>
            <span>Adresa: {order.address}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
