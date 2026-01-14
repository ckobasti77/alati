"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm, type DeepPartial, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, GripVertical, PhoneCall, Plus, Trash2, UserRound } from "lucide-react";
import { LoadingDots } from "@/components/LoadingDots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/calc";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { normalizeSearchText } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { Order, OrderListResponse, OrderStage, Product, ProductVariant, Supplier } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { sendOrderEmailWithTo } from "./actions";

const stageOptions: { value: OrderStage; label: string; tone: string }[] = [
  { value: "poruceno", label: "Poruceno", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "na_stanju", label: "Na stanju", tone: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  { value: "poslato", label: "Poslato", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  { value: "stiglo", label: "Stiglo", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { value: "legle_pare", label: "Leglo", tone: "border-slate-200 bg-slate-100 text-slate-900" },
];
const transportModes = ["Kol", "Joe", "Posta", "Bex", "Aks"] as const;
const deleteConfirmPhrase = "potvrdjujem da brisem";
const requiresDeleteConfirmation = (stage?: OrderStage) => stage === "stiglo" || stage === "legle_pare";

const stageLabels = stageOptions.reduce((acc, item) => {
  acc[item.value] = { label: item.label, tone: item.tone };
  return acc;
}, {} as Record<OrderStage, { label: string; tone: string }>);

const orderSchema = z.object({
  stage: z.enum(["poruceno", "na_stanju", "poslato", "stiglo", "legle_pare"]),
  customerName: z.string().min(3, "Ime i prezime porucioca je obavezno."),
  address: z.string().min(5, "Adresa je obavezna."),
  phone: z.string().min(5, "Broj telefona je obavezan."),
  transportCost: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      const normalized = typeof value === "string" ? value.replace(",", ".") : value;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    z.number().min(0, "Transport je obavezan i mora biti 0 ili vise."),
  ),
  transportMode: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      return typeof value === "string" ? value : undefined;
    },
    z.enum(transportModes, { errorMap: () => ({ message: "Izaberi nacin transporta." }) }),
  ),
  myProfitPercent: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      const normalized = typeof value === "string" ? value.replace(",", ".") : value;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    z
      .number()
      .min(0, "Procenat profita mora biti izmedju 0 i 100.")
      .max(100, "Procenat profita mora biti izmedju 0 i 100."),
  ),
  pickup: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  note: z.string().trim().min(1, "Napomena je obavezna."),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const defaultFormValues: DeepPartial<OrderFormValues> = {
  stage: "poruceno",
  customerName: "",
  address: "",
  phone: "",
  transportCost: undefined,
  transportMode: undefined,
  myProfitPercent: 100,
  pickup: false,
  sendEmail: true,
  note: "",
};

const orderFocusOrder: (keyof OrderFormValues)[] = [
  "customerName",
  "address",
  "phone",
  "transportCost",
  "transportMode",
  "myProfitPercent",
  "note",
];

const collectErrorPaths = (node: unknown, prefix = ""): string[] => {
  if (!node) return [];
  const paths: string[] = [];
  const entries = Array.isArray(node) ? Array.from(node.entries()) : Object.entries(node as Record<string, unknown>);
  for (const [rawKey, value] of entries) {
    if (!value) continue;
    const key = String(rawKey);
    if (key === "ref" || key === "types") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const hasMessage = "message" in (value as Record<string, unknown>) || "type" in (value as Record<string, unknown>);
      const nested = collectErrorPaths(value, path);
      if (hasMessage || nested.length === 0) {
        paths.push(path);
      }
      paths.push(...nested);
    } else {
      paths.push(path);
    }
  }
  return paths;
};

const findFirstErrorPath = (errors: FieldErrors | undefined, priority: string[] = []) => {
  if (!errors) return null;
  const paths = collectErrorPaths(errors);
  if (paths.length === 0) return null;
  const preferred = priority
    .map((prefix) => paths.find((path) => path === prefix || path.startsWith(`${prefix}.`)))
    .find((path): path is string => Boolean(path));
  return preferred ?? paths[0];
};

const generateId = () => Math.random().toString(36).slice(2);

type OrderItemDraft = {
  id: string;
  product: Product;
  variant?: ProductVariant;
  supplierId?: string;
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
  manualProdajna?: boolean;
  variantLabel?: string;
  title: string;
};

function RichTextSnippet({ text, className }: { text?: string | null; className?: string }) {
  if (!text || text.trim().length === 0) return null;
  const html = formatRichTextToHtml(text);
  if (!html) return null;
  return (
    <div
      className={cn(
        richTextOutputClassNames,
        "max-h-16 overflow-hidden text-xs text-slate-500 [&_p]:mb-0 [&_ul]:mb-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

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

const resolveProductImageUrl = (product?: Product, variantId?: string) => {
  if (!product) return null;
  const variantImages = variantId
    ? product.variants?.find((variant) => variant.id === variantId)?.images
    : undefined;
  const images = (variantImages && variantImages.length > 0 ? variantImages : product.images) ?? [];
  const mainImage = images.find((image) => image.isMain) ?? images[0];
  return mainImage?.url ?? null;
};

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

const resolveOrderSortValue = (order: Order) => order.sortIndex ?? order.kreiranoAt;

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const pathname = usePathname();
  const isKalaba = pathname?.startsWith("/kalaba");
  const basePath = isKalaba ? "/kalaba" : "/narudzbine";
  const emailToEnvKey = isKalaba ? "CONTACT_EMAIL_TO_2" : "CONTACT_EMAIL_TO";
  const orderScope = isKalaba ? "kalaba" : "default";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const sessionToken = token as string;
  const [search, setSearch] = useState("");
  const [stageFilters, setStageFilters] = useState<OrderStage[]>([]);
  const [showUnreturnedOnly, setShowUnreturnedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);
  const [ordersPagination, setOrdersPagination] = useState<OrderListResponse["pagination"]>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const ordersLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadMoreOrdersTimerRef = useRef<number | null>(null);
  const preselectHandledRef = useRef<string | null>(null);
  const preselectProductId = searchParams?.get("productId") ?? "";

  const list = useConvexQuery<OrderListResponse>("orders:list", {
    token: sessionToken,
    search: search.trim() ? search.trim() : undefined,
    page,
    pageSize: 10,
    stages: stageFilters,
    unreturnedOnly: showUnreturnedOnly,
    scope: orderScope,
  });
  const deleteOrder = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>("orders:remove");
  const createOrder = useConvexMutation("orders:create");
  const updateOrder = useConvexMutation("orders:update");
  const reorderOrders = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    orderIds: string[];
    base: number;
  }>("orders:reorder");
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });

  const orderEntries = useMemo(
    () =>
      orders.map((order) => {
        const totals = orderTotals(order);
        const myProfitPercent = resolveProfitPercent(order.myProfitPercent);
        const myProfit = totals.profit * (myProfitPercent / 100);
        const profitShare = myProfit * 0.5;
        const profitSharePercent = myProfitPercent * 0.5;
        const povrat = totals.totalNabavno + totals.transport + profitShare;
        return {
          order,
          prodajnoUkupno: totals.totalProdajno,
          nabavnoUkupno: totals.totalNabavno,
          transport: totals.transport,
          myProfit,
          myProfitPercent,
          profitShare,
          profitSharePercent,
          povrat,
        };
      }),
    [orders],
  );
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const needle = normalizeSearchText(productSearch.trim());
    if (!needle) return list;
    return list.filter((product) => {
      if (normalizeSearchText(getProductDisplayName(product)).includes(needle)) return true;
      const opisPrimary = normalizeSearchText(product.opisFbInsta ?? product.opis ?? "");
      const opisKp = normalizeSearchText(product.opisKp ?? "");
      if (opisPrimary.includes(needle) || opisKp.includes(needle)) return true;
      return (product.variants ?? []).some((variant) => {
        if (normalizeSearchText(variant.label).includes(needle)) return true;
        const variantOpis = normalizeSearchText(variant.opis ?? "");
        return variantOpis.includes(needle);
      });
    });
  }, [products, productSearch]);
  const productMap = useMemo(
    () => new Map((products ?? []).map((product) => [product._id, product])),
    [products],
  );
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const isProductsLoading = products === undefined;
  const isOrdersLoading = list === undefined && orders.length === 0;
  const hasMoreOrders = ordersPagination.totalPages > page;
  const deleteRequiresConfirmation = deleteCandidate ? requiresDeleteConfirmation(deleteCandidate.stage) : false;
  const isDeletePhraseValid = deleteConfirmText.trim().toLowerCase() === deleteConfirmPhrase;
  const isDeleteDisabled = !deleteCandidate || isDeletingOrder || (deleteRequiresConfirmation && !isDeletePhraseValid);

  const resetOrdersFeed = useCallback(() => {
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
      loadMoreOrdersTimerRef.current = null;
    }
    setOrders([]);
    setDraggingOrderId(null);
    setDragOverOrderId(null);
    setPage(1);
    setOrdersPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setIsLoadingMoreOrders(false);
  }, []);

  const handleStageFilterToggle = useCallback(
    (stage: OrderStage) => {
      setStageFilters((prev) => (prev.includes(stage) ? prev.filter((item) => item !== stage) : [...prev, stage]));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleUnreturnedToggle = useCallback(
    (checked: boolean) => {
      setShowUnreturnedOnly(checked);
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  useEffect(() => {
    resetOrdersFeed();
  }, [resetOrdersFeed, sessionToken, orderScope]);

  useEffect(() => {
    if (!list) return;
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
      loadMoreOrdersTimerRef.current = null;
    }
    if (list.pagination) {
      setOrdersPagination(list.pagination);
    }
    if (list.items) {
      setOrders((prev) => {
        const map = new Map(prev.map((entry) => [String(entry._id), entry]));
        list.items.forEach((entry) => {
          map.set(String(entry._id), entry);
        });
        return Array.from(map.values()).sort(
          (a, b) => resolveOrderSortValue(b) - resolveOrderSortValue(a) || b.kreiranoAt - a.kreiranoAt,
        );
      });
    }
    setIsLoadingMoreOrders(false);
  }, [list]);

  useEffect(() => {
    return () => {
      if (loadMoreOrdersTimerRef.current !== null) {
        window.clearTimeout(loadMoreOrdersTimerRef.current);
      }
    };
  }, []);

  const handleLoadMoreOrders = useCallback(() => {
    if (isLoadingMoreOrders) return;
    if (!hasMoreOrders) return;
    setIsLoadingMoreOrders(true);
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
    }
    loadMoreOrdersTimerRef.current = window.setTimeout(() => {
      setPage((prev) => prev + 1);
    }, 850);
  }, [hasMoreOrders, isLoadingMoreOrders]);

  useEffect(() => {
    const target = ordersLoaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          handleLoadMoreOrders();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMoreOrders]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });
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
    if (options?.closeModal) {
      setIsModalOpen(false);
    }
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
    const draft: OrderItemDraft = {
      id: generateId(),
      product: selectedProduct,
      variant,
      supplierId: supplierId || undefined,
      kolicina: qty,
      nabavnaCena,
      prodajnaCena,
      manualProdajna: useManualSalePrice,
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

  const handleSubmitOrder = async (values: OrderFormValues) => {
    if (draftItems.length === 0) {
      toast.error("Dodaj bar jedan proizvod u narudzbinu.");
      focusOrderField("productSearch");
      return;
    }

    try {
      const pickup = Boolean(values.pickup);
      const shouldSendEmail = values.sendEmail ?? true;
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
      }));
      const payload = {
        stage: values.stage,
        title: payloadItems[0]?.title ?? "Narudzbina",
        transportCost: values.transportCost,
        transportMode: values.transportMode,
        myProfitPercent: values.myProfitPercent,
        customerName: values.customerName.trim(),
        address: values.address.trim(),
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
      } else {
        await createOrder(payload);
        let emailError: string | null = null;
        if (shouldSendEmail) {
          try {
            const emailPayload = {
              customerName: payload.customerName,
              phone: payload.phone,
              address: payload.address,
              pickup: payload.pickup,
              note: payload.napomena,
              items: draftItems.map((item) => ({
                productName: getProductDisplayName(item.product),
                variantName: item.variant?.label,
                quantity: item.kolicina,
                nabavnaCena: item.nabavnaCena,
                prodajnaCena: item.prodajnaCena,
                supplierName: item.supplierId ? supplierMap.get(item.supplierId)?.name : undefined,
              })),
            };
            const emailResult = await sendOrderEmailWithTo(emailPayload, { toEnvKey: emailToEnvKey });
            if (!emailResult.ok) {
              emailError = emailResult.error;
            }
          } catch (error) {
            emailError = error instanceof Error ? error.message : "Email slanje nije uspelo.";
          }
        }
        toast.success("Narudzbina je dodata.");
        if (emailError) {
          console.warn("Email slanje nije uspelo:", emailError);
          toast.error("Narudzbina je sacuvana, ali email nije poslat.");
        }
      }
      resetOrdersFeed();
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
      transportMode: order.transportMode,
      myProfitPercent: order.myProfitPercent,
      pickup: order.pickup,
      napomena: order.napomena,
      povratVracen: order.povratVracen,
      items: order.items,
    }),
    [orderScope, sessionToken],
  );

  const handleStageChange = async (order: Order, nextStage: OrderStage) => {
    try {
      await updateOrder({ ...buildOrderUpdatePayload(order), stage: nextStage });
      setOrders((prev) =>
        prev.flatMap((item) => {
          if (item._id !== order._id) return [item];
          if (stageFilters.length > 0 && !stageFilters.includes(nextStage)) return [];
          return [{ ...item, stage: nextStage }];
        }),
      );
      toast.success("Status narudzbine promenjen.");
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
          return [{ ...item, povratVracen: nextValue }];
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati povrat.");
    }
  };

  const reorderOrdersList = useCallback((list: Order[], sourceId: string, targetId: string) => {
    const sourceIndex = list.findIndex((entry) => entry._id === sourceId);
    const targetIndex = list.findIndex((entry) => entry._id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return list;
    const next = [...list];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  }, []);

  const handleOrderDragStart = useCallback(
    (orderId: string) => (event: DragEvent<HTMLDivElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", orderId);
      setDraggingOrderId(orderId);
      setDragOverOrderId(null);
    },
    [],
  );

  const handleOrderDragEnd = useCallback(() => {
    setDraggingOrderId(null);
    setDragOverOrderId(null);
  }, []);

  const handleOrderDragOver = useCallback(
    (orderId: string) => (event: DragEvent<HTMLTableRowElement>) => {
      if (!draggingOrderId || draggingOrderId === orderId) return;
      event.preventDefault();
      setDragOverOrderId(orderId);
    },
    [draggingOrderId],
  );

  const handleOrderDragLeave = useCallback(
    (orderId: string) => () => {
      if (dragOverOrderId === orderId) {
        setDragOverOrderId(null);
      }
    },
    [dragOverOrderId],
  );

  const handleOrderDrop = useCallback(
    (orderId: string) => async (event: DragEvent<HTMLTableRowElement>) => {
      event.preventDefault();
      const sourceId = draggingOrderId ?? event.dataTransfer.getData("text/plain");
      if (!sourceId || sourceId === orderId) {
        setDraggingOrderId(null);
        setDragOverOrderId(null);
        return;
      }
      const nextOrders = reorderOrdersList(orders, sourceId, orderId);
      if (nextOrders === orders) {
        setDraggingOrderId(null);
        setDragOverOrderId(null);
        return;
      }
      const base = Date.now();
      const nextOrdersWithSort = nextOrders.map((item, index) => ({
        ...item,
        sortIndex: base - index,
      }));
      setOrders(nextOrdersWithSort);
      setDraggingOrderId(null);
      setDragOverOrderId(null);
      try {
        await reorderOrders({
          token: sessionToken,
          scope: orderScope,
          orderIds: nextOrders.map((item) => item._id),
          base,
        });
        toast.success("Redosled narudzbina sacuvan.");
      } catch (error) {
        console.error(error);
        toast.error("Nije moguce sacuvati novi redosled.");
        setOrders(orders);
      }
    },
    [draggingOrderId, orderScope, orders, reorderOrders, reorderOrdersList, sessionToken],
  );

  const handleRowClick = (id: string) => {
    router.push(`${basePath}/${id}`);
  };

  return (
    <div className="relative mx-auto space-y-6">
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            resetOrderForm();
          }
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
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {stageOptions.map((option) => (
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
                              <div className="text-right">
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
                  <div className="text-right">
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
                  <div className="md:col-span-1 flex flex-wrap items-center gap-2">
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
                    <div className="text-right text-xs text-slate-500">
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
                          {item.manualProdajna ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Rucno uneta cena
                            </span>
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
                    <FormLabel>Ime i prezime porucioca</FormLabel>
                    <Input placeholder="npr. Marko Markovic" required {...field} />
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
              <FormField
                name="transportMode"
                render={({ field, fieldState }) => (
                  <FormItem>
                <FormLabel>Nacin transporta</FormLabel>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                  ref={field.ref}
                  name={field.name}
                  required
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value || undefined)}
                  onBlur={field.onBlur}
                >
                      <option value="">Izaberi</option>
                      {transportModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">Odaberi kurira ili dostavu.</p>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="myProfitPercent"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Moj procenat profita (%)</FormLabel>
                    <Input
                      ref={field.ref}
                      name={field.name}
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 50"
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
                    <p className="text-xs text-slate-500">Procenat profita koji pripada tebi (0-100).</p>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="pickup"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 md:col-span-2">
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
                    <div className="space-y-0.5 flex flex-col items-center">
                      <FormLabel htmlFor="pickup" className="m-0 cursor-pointer">
                        Licno preuzimanje
                      </FormLabel>
                      <p className=" text-xs text-slate-500">Oznaci ako kupac preuzima bez kurira.</p>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 md:col-span-2">
                    <input
                      id="sendEmail"
                      ref={field.ref}
                      name={field.name}
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(event) => field.onChange(event.target.checked)}
                      onBlur={field.onBlur}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="space-y-0.5 flex flex-col items-center">
                      <FormLabel htmlFor="sendEmail" className="m-0 cursor-pointer">
                        Posalji narudzbinu na email
                      </FormLabel>
                      <p className="text-xs text-slate-500">Odstikliraj ako ne zelis slanje mejla.</p>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                name="note"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Napomena</FormLabel>
                    <Textarea rows={3} placeholder="Dodatne napomene" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => resetOrderForm({ closeModal: true })}>
                {editingOrder ? "Otkazi izmene" : "Ponisti"}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingOrder ? "Azuriraj" : "Sacuvaj"}
              </Button>
            </div>
          </Form>
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
                  {stageLabels[deleteCandidate.stage]?.label ?? deleteCandidate.stage}
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
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{isKalaba ? "Kalaba" : "Narudzbine"}</h1>
          <p className="text-sm text-slate-500">Tabela narudzbina, klik na red otvara detalje. Forma je u modalu.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {ordersPagination.total} narudzbina
          </div>
          <Button onClick={openCreateModal} className="gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Pretraga (naslov, kupac, telefon...)"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetOrdersFeed();
                }}
                className="sm:w-72"
              />
              <div className="flex flex-wrap items-center gap-2">
                {stageOptions.map((option) => {
                  const isActive = stageFilters.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold transition",
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
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold transition",
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Naslov</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead className="text-right">Nabavno</TableHead>
                <TableHead className="text-right">Transport</TableHead>
                <TableHead className="text-right">Prodajno</TableHead>
                <TableHead className="text-right">Profit (50%)</TableHead>
                <TableHead className="text-right">Povrat</TableHead>
                <TableHead>Napomena</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-sm text-slate-500">
                    Ucitavanje...
                  </TableCell>
                </TableRow>
              ) : orderEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-sm text-slate-500">
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
                    profitSharePercent,
                    povrat,
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

                    return (
                      <TableRow
                        key={order._id}
                        className={cn(
                          "cursor-pointer transition",
                          draggingOrderId === order._id ? "opacity-60" : "hover:bg-slate-50",
                          dragOverOrderId === order._id && draggingOrderId !== order._id ? "bg-blue-50" : "",
                        )}
                        onClick={() => handleRowClick(order._id)}
                        onDragOver={handleOrderDragOver(order._id)}
                        onDragLeave={handleOrderDragLeave(order._id)}
                        onDrop={handleOrderDrop(order._id)}
                      >
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
                          <StageBadge stage={order.stage} />
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
                            <a
                              href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}
                              className="flex flex-col gap-1 rounded-md border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-blue-50"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <span className="font-medium text-slate-800">{order.customerName}</span>
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <PhoneCall className="h-4 w-4 text-blue-500" />
                                {order.phone}
                              </span>
                            </a>
                            {order.pickup ? (
                              <span className="inline-flex items-center gap-1 self-start rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                                <UserRound className="h-3.5 w-3.5" />
                                Licno
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(transport, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <div className="flex flex-col items-end">
                            <span className={profitShare < 0 ? "text-red-600" : ""}>
                              {formatCurrency(profitShare, "EUR")}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {formatPercent(profitSharePercent)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{formatCurrency(povrat, "EUR")}</span>
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
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-slate-500">
                          {order.napomena || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            <select
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                              value={order.stage}
                              onChange={(event) => handleStageChange(order, event.target.value as OrderStage)}
                            >
                              {stageOptions.map((option) => (
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
          <div ref={ordersLoaderRef} className="flex justify-center">
            <LoadingDots show={isLoadingMoreOrders && hasMoreOrders} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


