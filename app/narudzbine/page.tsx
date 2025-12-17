"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type DeepPartial, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, PhoneCall, Plus, Trash2 } from "lucide-react";
import { LoadingDots } from "@/components/LoadingDots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/calc";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { cn } from "@/lib/utils";
import type { Order, OrderListResponse, OrderStage, Product, ProductVariant, Supplier } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";

const stageOptions: { value: OrderStage; label: string; tone: string }[] = [
  { value: "poruceno", label: "Poruceno", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "na_stanju", label: "Na stanju", tone: "border-indigo-200 bg-indigo-50 text-indigo-800" },
  { value: "poslato", label: "Poslato", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  { value: "stiglo", label: "Stiglo", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { value: "legle_pare", label: "Leglo", tone: "border-slate-200 bg-slate-100 text-slate-900" },
];
const transportModes = ["Kol", "Joe", "Posta", "Bex", "Aks"] as const;

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
  pickup: z.boolean().optional(),
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
  pickup: false,
  note: "",
};

const orderFocusOrder: (keyof OrderFormValues)[] = [
  "customerName",
  "address",
  "phone",
  "transportCost",
  "transportMode",
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

const composeVariantLabel = (product: Product, variant?: ProductVariant) => {
  if (!variant) return product.name;
  return `${product.name} - ${variant.label}`;
};

const resolveSupplierOptions = (product?: Product, variantId?: string) => {
  if (!product) return [];
  const offers = product.supplierOffers ?? [];
  if (!offers.length) return [];
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
  const fallback = offers.filter((offer) => !offer.variantId);
  const pool = exact.length ? exact : fallback.length ? fallback : [];
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

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const router = useRouter();
  const { token } = useAuth();
  const sessionToken = token as string;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
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

  const list = useConvexQuery<OrderListResponse>("orders:list", {
    token: sessionToken,
    search: search.trim() ? search.trim() : undefined,
    page,
    pageSize: 10,
  });
  const deleteOrder = useConvexMutation<{ id: string; token: string }>("orders:remove");
  const createOrder = useConvexMutation("orders:create");
  const updateOrder = useConvexMutation("orders:update");
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });

  const orderEntries = useMemo(
    () =>
      orders.map((order) => {
        const totals = orderTotals(order);
        return {
          order,
          totalQty: totals.totalQty,
          prodajnoUkupno: totals.totalProdajno,
          nabavnoUkupno: totals.totalNabavno,
          transport: totals.transport,
          prof: totals.profit,
        };
      }),
    [orders],
  );
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((product) => {
      if (product.name.toLowerCase().includes(needle)) return true;
      const opisPrimary = product.opisFbInsta?.toLowerCase() ?? product.opis?.toLowerCase() ?? "";
      const opisKp = product.opisKp?.toLowerCase() ?? "";
      if (opisPrimary.includes(needle) || opisKp.includes(needle)) return true;
      return (product.variants ?? []).some((variant) => {
        if (variant.label.toLowerCase().includes(needle)) return true;
        const variantOpis = variant.opis?.toLowerCase() ?? "";
        return variantOpis.includes(needle);
      });
    });
  }, [products, productSearch]);
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const isProductsLoading = products === undefined;
  const isOrdersLoading = list === undefined && orders.length === 0;
  const hasMoreOrders = ordersPagination.totalPages > page;

  const resetOrdersFeed = useCallback(() => {
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
      loadMoreOrdersTimerRef.current = null;
    }
    setOrders([]);
    setPage(1);
    setOrdersPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setIsLoadingMoreOrders(false);
  }, []);

  useEffect(() => {
    resetOrdersFeed();
  }, [resetOrdersFeed, sessionToken]);

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
        return Array.from(map.values()).sort((a, b) => b.kreiranoAt - a.kreiranoAt);
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
    const title = variantLabel ?? selectedProduct.name;
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

  const handleSubmitOrder = async (values: OrderFormValues) => {
    if (draftItems.length === 0) {
      toast.error("Dodaj bar jedan proizvod u narudzbinu.");
      focusOrderField("productSearch");
      return;
    }

    try {
      const pickup = Boolean(values.pickup);
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
        customerName: values.customerName.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        pickup,
        napomena: values.note?.trim() || undefined,
        items: payloadItems,
        token: sessionToken,
      };

      if (editingOrder) {
        await updateOrder({ id: editingOrder._id, ...payload });
        toast.success("Narudzbina je azurirana.");
      } else {
        await createOrder(payload);
        toast.success("Narudzbina je dodata.");
      }
      resetOrdersFeed();
      resetOrderForm({ closeModal: true });
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati narudzbinu.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOrder({ id, token: sessionToken });
      toast.success("Narudzbina je obrisana.");
      resetOrdersFeed();
      if (editingOrder?._id === id) {
        resetOrderForm({ closeModal: true });
      }
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    }
  };

  const handleStartOrderEdit = (order: Order) => {
    router.push(`/narudzbine/${order._id}`);
  };

  const handleStageChange = async (order: Order, nextStage: OrderStage) => {
    try {
      await updateOrder({
        token: sessionToken,
        id: order._id,
        stage: nextStage,
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
        pickup: order.pickup,
        napomena: order.napomena,
        items: order.items,
      });
      setOrders((prev) => prev.map((item) => (item._id === order._id ? { ...item, stage: nextStage } : item)));
      toast.success("Status narudzbine promenjen.");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce promeniti status.");
    }
  };

  const handleRowClick = (id: string) => {
    router.push(`/narudzbine/${id}`);
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
                                setProductInput(product.name);
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
                                if (mainImage?.url) {
                                  return (
                                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={mainImage.url} alt={product.name} className="h-full w-full object-cover" />
                                    </div>
                                  );
                                }
                                return <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700/70" />;
                              })()}
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-800 dark:text-slate-100">{product.name}</p>
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
                      if (mainImage?.url) {
                        return (
                          <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mainImage.url} alt={selectedProduct.name} className="h-full w-full object-cover" />
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
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedProduct.name}</p>
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
                            Nabavna {formatCurrency(variant.nabavnaCena, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
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
                    <p className="text-xs text-slate-500">
                      Podrazumevano se uzima cena proizvoda. U retkim slucajevima ukljuci ovu opciju i unesi prodajnu cenu.
                    </p>
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
                name="note"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Napomena</FormLabel>
                    <Textarea rows={3} placeholder="Dodatne napomene" required {...field} />
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
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Narudzbine</h1>
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
                <TableHead>Kolicina</TableHead>
                <TableHead className="text-right">Nabavno (EUR)</TableHead>
                <TableHead className="text-right">Transport (EUR)</TableHead>
                <TableHead className="text-right">Prodajno (EUR)</TableHead>
                <TableHead className="text-right">Profit (EUR)</TableHead>
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
                orderEntries.map(({ order, totalQty, prodajnoUkupno, nabavnoUkupno, transport, prof }) => (
                  <TableRow
                    key={order._id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => handleRowClick(order._id)}
                  >
                    <TableCell>{formatDate(order.kreiranoAt)}</TableCell>
                    <TableCell>
                      <StageBadge stage={order.stage} />
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1">
                          {order.title}
                          <ArrowUpRight className="h-4 w-4 text-slate-400" />
                        </span>
                        {order.items && order.items.length > 0 ? (
                          <p className="text-xs text-slate-500">
                            {order.items
                              .slice(0, 2)
                              .map((item) => `${item.title}${item.kolicina > 1 ? ` x${item.kolicina}` : ""}`)
                              .join(" · ")}
                            {order.items.length > 2 ? ` +${order.items.length - 2}` : ""}
                          </p>
                        ) : null}
                        {order.items && order.items.length > 1 ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {order.items.length} proizvoda
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
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
                    </TableCell>
                    <TableCell>{totalQty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transport, "EUR")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={prof < 0 ? "text-red-600" : ""}>{formatCurrency(prof, "EUR")}</span>
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
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStartOrderEdit(order);
                          }}
                        >
                          Izmeni
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(order._id);
                          }}
                        >
                          Obrisi
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
