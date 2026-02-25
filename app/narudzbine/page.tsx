"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type TouchEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type DeepPartial, type FieldErrors, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, Bell, Copy, GripVertical, PhoneCall, Plus, Trash2, UserRound } from "lucide-react";
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
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import { clearListState, readListState, writeListState } from "@/lib/listState";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/customer";
import type {
  Order,
  OrderListResponse,
  OrderStage,
  Product,
  ProductVariant,
  ShippingOwnerOption,
  ShippingOwnerOptions,
  Supplier,
} from "@/types/order";
import type { RestockRequest } from "@/types/restockRequest";
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
  { value: "vraceno", label: "Vraćeno", tone: "border-rose-200 bg-rose-50 text-rose-800" },
];
const transportModes = ["Kol", "Joe", "Smg"] as const;
const pickupTransportModes = ["Kol", "Joe"] as const;
const slanjeModes = ["Posta", "Aks", "Bex"] as const;
const shippingModes = ["Posta", "Aks", "Bex"] as const;
type ShippingMode = (typeof shippingModes)[number];
const deleteConfirmPhrase = "potvrdjujem da brisem";
const requiresDeleteConfirmation = (stage?: OrderStage) =>
  stage === "stiglo" || stage === "legle_pare" || stage === "vraceno";
const emptyOrderListTotals: OrderListResponse["totals"] = {
  nabavno: 0,
  transport: 0,
  prodajno: 0,
  profit: 0,
  povrat: 0,
};

const resolveOrderShippingMode = (order: Pick<Order, "slanjeMode" | "transportMode">): ShippingMode | undefined => {
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

const resolveShipmentNumber = (order: Pick<Order, "brojPosiljke">) => order.brojPosiljke?.trim() ?? "";

const stageLabels = stageOptions.reduce((acc, item) => {
  acc[item.value] = { label: item.label, tone: item.tone };
  return acc;
}, {} as Record<OrderStage, { label: string; tone: string }>);

const normalizeStageFilters = (values: string[]) => {
  if (!values.length) return [] as OrderStage[];
  const allowed = new Set(stageOptions.map((option) => option.value));
  const unique = new Set<string>();
  values.forEach((value) => {
    if (allowed.has(value as OrderStage)) {
      unique.add(value);
    }
  });
  return stageOptions.map((option) => option.value).filter((value) => unique.has(value));
};

const areArraysEqual = <T,>(left: T[], right: T[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const normalizeDateInput = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "";
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";
  return trimmed;
};

const resolveDateTimestamp = (value: string, boundary: "start" | "end") => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  if (boundary === "start") {
    return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
  }
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
};

const resolveTodayEndTimestamp = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
};

const normalizeOwnerLookupKey = (value?: string) => normalizeSearchText(value?.trim() ?? "");

const orderSchema = z
  .object({
    stage: z.enum(["poruceno", "na_stanju", "poslato", "stiglo", "legle_pare", "vraceno"]),
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
      z.enum(transportModes, { message: "Izaberi nacin transporta." }),
    ),
    slanjeMode: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        return typeof value === "string" ? value : undefined;
      },
      z.enum(slanjeModes).optional(),
    ),
    slanjeOwner: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        return typeof value === "string" ? value.trim() : undefined;
      },
      z.string().min(2, "Unesi podatak za isplatu.").optional(),
    ),
    slanjeOwnerStartingAmount: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        const normalized = typeof value === "string" ? value.replace(",", ".") : value;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
      },
      z.number().min(0, "Pocetni iznos mora biti 0 ili vise.").optional(),
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
  })
  .superRefine((values, ctx) => {
    if (values.pickup) {
      if (values.transportMode === "Smg") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["transportMode"],
          message: "Za licno preuzimanje izaberi Kol ili Joe.",
        });
      }
      return;
    }
    if (values.slanjeMode && !values.slanjeOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeOwner"],
        message: "Izaberi na cije ime lezu pare.",
      });
      return;
    }
    if (values.slanjeOwner && !values.slanjeMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeMode"],
        message: "Izaberi nacin slanja.",
      });
      return;
    }
    if (values.slanjeMode === "Posta" && (!values.slanjeOwner || values.slanjeOwner.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeOwner"],
        message: "Unesi na ime.",
      });
    }
    if (
      (values.slanjeMode === "Aks" || values.slanjeMode === "Bex") &&
      (!values.slanjeOwner || values.slanjeOwner.trim().length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeOwner"],
        message: "Unesi na ciji racun lezu pare.",
      });
    }
  });

type OrderFormValues = z.infer<typeof orderSchema>;

const defaultFormValues: DeepPartial<OrderFormValues> = {
  stage: "poruceno",
  customerName: "",
  address: "",
  phone: "",
  transportCost: undefined,
  transportMode: undefined,
  slanjeMode: undefined,
  slanjeOwner: undefined,
  slanjeOwnerStartingAmount: undefined,
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
  "slanjeMode",
  "slanjeOwner",
  "slanjeOwnerStartingAmount",
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

type QuickEditField = "address" | "contact" | "profit" | "transport";

type QuickEditState =
  | {
      field: "address";
      order: Order;
      address: string;
    }
  | {
      field: "contact";
      order: Order;
      customerName: string;
      phone: string;
    }
  | {
      field: "profit";
      order: Order;
      myProfitPercent: string;
    }
  | {
      field: "transport";
      order: Order;
      transportCost: string;
      transportMode: string;
    };

type ShipmentStageModalState = {
  order: Order;
  nextStage: OrderStage;
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
  const basePath = "/narudzbine";
  const emailToEnvKey = "CONTACT_EMAIL_TO";
  const orderScope = "default";
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const searchQuery = useMemo(() => searchParams?.get("q") ?? "", [searchParamsString, searchParams]);
  const dateFromQuery = useMemo(
    () => normalizeDateInput(searchParams?.get("from")),
    [searchParamsString, searchParams],
  );
  const dateToQuery = useMemo(
    () => normalizeDateInput(searchParams?.get("to")),
    [searchParamsString, searchParams],
  );
  const stageQuery = useMemo(
    () => normalizeStageFilters(searchParams ? searchParams.getAll("stage") : []),
    [searchParamsString, searchParams],
  );
  const unreturnedQuery = useMemo(() => searchParams?.get("unreturned") === "1", [searchParamsString, searchParams]);
  const returnedQuery = useMemo(() => searchParams?.get("returned") === "1", [searchParamsString, searchParams]);
  const pickupQuery = useMemo(() => searchParams?.get("pickup") === "1", [searchParamsString, searchParams]);
  const effectiveUnreturnedQuery = unreturnedQuery && !returnedQuery;
  const effectiveReturnedQuery = returnedQuery;
  const { token } = useAuth();
  const sessionToken = token as string;
  const [search, setSearch] = useState(searchQuery);
  const [dateFrom, setDateFrom] = useState(dateFromQuery);
  const [dateTo, setDateTo] = useState(dateToQuery);
  const [stageFilters, setStageFilters] = useState<OrderStage[]>(stageQuery);
  const [showUnreturnedOnly, setShowUnreturnedOnly] = useState(effectiveUnreturnedQuery);
  const [showReturnedOnly, setShowReturnedOnly] = useState(effectiveReturnedQuery);
  const [showPickupOnly, setShowPickupOnly] = useState(pickupQuery);
  const [filterMenuMode, setFilterMenuMode] = useState<"closed" | "hover" | "pinned">("closed");
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
  const [ordersTotals, setOrdersTotals] = useState<OrderListResponse["totals"]>(emptyOrderListTotals);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
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
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockDeleteOpen, setRestockDeleteOpen] = useState(false);
  const [restockDeleteCandidate, setRestockDeleteCandidate] = useState<RestockRequest | null>(null);
  const [isDeletingRestock, setIsDeletingRestock] = useState(false);
  const [restockProductId, setRestockProductId] = useState("");
  const [restockProductInput, setRestockProductInput] = useState("");
  const [restockProductSearch, setRestockProductSearch] = useState("");
  const [restockProductMenuOpen, setRestockProductMenuOpen] = useState(false);
  const [restockVariantId, setRestockVariantId] = useState("");
  const [restockName, setRestockName] = useState("");
  const [restockPhone, setRestockPhone] = useState("");
  const [isCreatingRestock, setIsCreatingRestock] = useState(false);
  const [draftItems, setDraftItems] = useState<OrderItemDraft[]>([]);
  const [itemProductId, setItemProductId] = useState("");
  const [itemVariantId, setItemVariantId] = useState("");
  const [itemSupplierId, setItemSupplierId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [useManualSalePrice, setUseManualSalePrice] = useState(false);
  const [manualSalePrice, setManualSalePrice] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [isQuickEditSaving, setIsQuickEditSaving] = useState(false);
  const [shipmentStageModal, setShipmentStageModal] = useState<ShipmentStageModalState | null>(null);
  const [shipmentNumberDraft, setShipmentNumberDraft] = useState("");
  const [isShipmentStageSaving, setIsShipmentStageSaving] = useState(false);
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const restockProductInputRef = useRef<HTMLInputElement | null>(null);
  const previousSlanjeModeRef = useRef<(typeof slanjeModes)[number] | undefined>(undefined);
  const ordersLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadMoreOrdersTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const modalSnapshotRef = useRef<string>("");
  const wasModalOpenRef = useRef(false);
  const preselectHandledRef = useRef<string | null>(null);
  const scrollYRef = useRef(0);
  const skipUrlSyncRef = useRef(false);
  const skipInitialResetRef = useRef(false);
  const didRestoreRef = useRef(false);
  const didSyncCustomersRef = useRef(false);
  const listStateRef = useRef<{
    orders: Order[];
    page: number;
    pagination: OrderListResponse["pagination"];
    search: string;
    stageFilters: OrderStage[];
    showUnreturnedOnly: boolean;
    showReturnedOnly: boolean;
    showPickupOnly: boolean;
    dateFrom: string;
    dateTo: string;
  }>({
    orders: [],
    page: 1,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    search: "",
    stageFilters: [],
    showUnreturnedOnly: false,
    showReturnedOnly: false,
    showPickupOnly: false,
    dateFrom: "",
    dateTo: "",
  });
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);
  const preselectProductId = searchParams?.get("productId") ?? "";
  const listStateKey = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    params.delete("productId");
    params.delete("orderModal");
    const suffix = params.toString();
    return `listState:${basePath}${suffix ? `?${suffix}` : ""}`;
  }, [basePath, searchParamsString]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (restockModalOpen) return;
    setRestockProductId("");
    setRestockProductInput("");
    setRestockProductSearch("");
    setRestockProductMenuOpen(false);
    setRestockVariantId("");
    setRestockName("");
    setRestockPhone("");
  }, [restockModalOpen]);

  const dateFromTimestamp = useMemo(() => resolveDateTimestamp(dateFrom, "start"), [dateFrom]);
  const dateToTimestamp = useMemo(() => {
    if (dateTo) return resolveDateTimestamp(dateTo, "end");
    if (dateFrom) return resolveTodayEndTimestamp();
    return undefined;
  }, [dateFrom, dateTo]);

  const list = useConvexQuery<OrderListResponse>("orders:list", {
    token: sessionToken,
    search: search.trim() ? search.trim() : undefined,
    page,
    pageSize: 10,
    stages: stageFilters,
    unreturnedOnly: showUnreturnedOnly,
    returnedOnly: showReturnedOnly,
    pickupOnly: showPickupOnly,
    dateFrom: dateFromTimestamp,
    dateTo: dateToTimestamp,
    scope: orderScope,
  });
  const deleteOrder = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>("orders:remove");
  const createOrder = useConvexMutation("orders:create");
  const updateOrder = useConvexMutation("orders:update");
  const upsertShippingAccount = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    value: string;
    startingAmount: number;
  }>("orders:upsertShippingAccount");
  const reorderOrders = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    orderIds: string[];
    base: number;
  }>("orders:reorder");
  const syncCustomers = useConvexMutation("customers:syncFromOrders");
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
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
  const restockRequests = useConvexQuery<RestockRequest[]>("restockRequests:list", {
    token: sessionToken,
    scope: orderScope,
  });
  const createRestockRequest = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    name: string;
    phone: string;
    productId?: string;
    productTitle: string;
    variantLabel?: string;
  }>("restockRequests:create");
  const deleteRestockRequest = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>(
    "restockRequests:remove",
  );

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
  const dateFilterActive = Boolean(dateFrom || dateTo);
  const activeFilterCount =
    stageFilters.length +
    (showUnreturnedOnly ? 1 : 0) +
    (showReturnedOnly ? 1 : 0) +
    (showPickupOnly ? 1 : 0) +
    (dateFilterActive ? 1 : 0);
  const isFilterMenuOpen = filterMenuMode !== "closed";
  const restockEntries = restockRequests ?? [];
  const isRestockLoading = restockRequests === undefined;
  const restockFilteredProducts = useMemo(() => {
    const list = products ?? [];
    const searchTokens = toSearchTokens(restockProductSearch.trim());
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
  }, [products, restockProductSearch]);
  const restockSelectedProduct = restockProductId ? productMap.get(restockProductId) : undefined;
  const restockSelectedVariants = restockSelectedProduct?.variants ?? [];

  useEffect(() => {
    listStateRef.current = {
      orders,
      page,
      pagination: ordersPagination,
      search,
      stageFilters,
      showUnreturnedOnly,
      showReturnedOnly,
      showPickupOnly,
      dateFrom,
      dateTo,
    };
  }, [orders, ordersPagination, page, search, showUnreturnedOnly, showReturnedOnly, showPickupOnly, stageFilters, dateFrom, dateTo]);

  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const stored = readListState<Order, OrderListResponse["pagination"]>(listStateKey);
    if (!stored) return;
    const storedSearch = typeof stored.extra?.search === "string" ? stored.extra.search : "";
    const storedStagesRaw = Array.isArray(stored.extra?.stageFilters) ? (stored.extra.stageFilters as string[]) : [];
    const storedStages = normalizeStageFilters(storedStagesRaw);
    const storedUnreturned = stored.extra?.showUnreturnedOnly === true;
    const storedReturned = stored.extra?.showReturnedOnly === true;
    const storedPickup = stored.extra?.showPickupOnly === true;
    const storedDateFrom = normalizeDateInput(
      typeof stored.extra?.dateFrom === "string" ? stored.extra.dateFrom : "",
    );
    const storedDateTo = normalizeDateInput(
      typeof stored.extra?.dateTo === "string" ? stored.extra.dateTo : "",
    );
    if (
      storedSearch !== searchQuery ||
      !areArraysEqual(storedStages, stageQuery) ||
      storedUnreturned !== effectiveUnreturnedQuery ||
      storedReturned !== effectiveReturnedQuery ||
      storedPickup !== pickupQuery ||
      storedDateFrom !== dateFromQuery ||
      storedDateTo !== dateToQuery
    ) {
      return;
    }
    skipInitialResetRef.current = true;
    skipUrlSyncRef.current = true;
    setOrders(stored.items ?? []);
    setPage(stored.page ?? 1);
    if (stored.pagination) {
      setOrdersPagination(stored.pagination);
    }
    setSearch(searchQuery);
    setDateFrom(dateFromQuery);
    setDateTo(dateToQuery);
    setStageFilters(stageQuery);
    setShowUnreturnedOnly(effectiveUnreturnedQuery);
    setShowReturnedOnly(effectiveReturnedQuery);
    setShowPickupOnly(pickupQuery);
    setPendingScrollY(typeof stored.scrollY === "number" ? stored.scrollY : null);
    clearListState(listStateKey);
  }, [
    listStateKey,
    searchQuery,
    stageQuery,
    effectiveUnreturnedQuery,
    effectiveReturnedQuery,
    pickupQuery,
    dateFromQuery,
    dateToQuery,
  ]);

  useEffect(() => {
    if (pendingScrollY === null) return;
    const target = pendingScrollY;
    setPendingScrollY(null);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.scrollTo({ top: target, behavior: "auto" });
      });
    }
  }, [pendingScrollY]);

  useEffect(() => {
    return () => {
      const snapshot = listStateRef.current;
      if (!snapshot) return;
      writeListState<Order, OrderListResponse["pagination"]>(listStateKey, {
        items: snapshot.orders,
        page: snapshot.page,
        pagination: snapshot.pagination,
        scrollY: scrollYRef.current,
        savedAt: Date.now(),
        extra: {
          search: snapshot.search,
          stageFilters: snapshot.stageFilters,
          showUnreturnedOnly: snapshot.showUnreturnedOnly,
          showReturnedOnly: snapshot.showReturnedOnly,
          showPickupOnly: snapshot.showPickupOnly,
          dateFrom: snapshot.dateFrom,
          dateTo: snapshot.dateTo,
        },
      });
    };
  }, [listStateKey]);

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
    setOrdersTotals(emptyOrderListTotals);
    setIsLoadingMoreOrders(false);
  }, []);

  useEffect(() => {
    const current = listStateRef.current;
    const normalizedStageFilters = normalizeStageFilters(current.stageFilters);
    const searchChanged = current.search !== searchQuery;
    const dateFromChanged = current.dateFrom !== dateFromQuery;
    const dateToChanged = current.dateTo !== dateToQuery;
    const stagesChanged = !areArraysEqual(normalizedStageFilters, stageQuery);
    const unreturnedChanged = current.showUnreturnedOnly !== effectiveUnreturnedQuery;
    const returnedChanged = current.showReturnedOnly !== effectiveReturnedQuery;
    const pickupChanged = current.showPickupOnly !== pickupQuery;
    if (!searchChanged && !dateFromChanged && !dateToChanged && !stagesChanged && !unreturnedChanged && !returnedChanged && !pickupChanged) {
      skipUrlSyncRef.current = false;
      return;
    }
    if (searchChanged) {
      setSearch(searchQuery);
    }
    if (dateFromChanged) {
      setDateFrom(dateFromQuery);
    }
    if (dateToChanged) {
      setDateTo(dateToQuery);
    }
    if (stagesChanged) {
      setStageFilters(stageQuery);
    }
    if (unreturnedChanged) {
      setShowUnreturnedOnly(effectiveUnreturnedQuery);
    }
    if (returnedChanged) {
      setShowReturnedOnly(effectiveReturnedQuery);
    }
    if (pickupChanged) {
      setShowPickupOnly(pickupQuery);
    }
    if (!skipUrlSyncRef.current) {
      resetOrdersFeed();
    }
    skipUrlSyncRef.current = false;
  }, [
    resetOrdersFeed,
    searchQuery,
    stageQuery,
    effectiveUnreturnedQuery,
    effectiveReturnedQuery,
    pickupQuery,
    dateFromQuery,
    dateToQuery,
  ]);

  useEffect(() => {
    if (!searchParams) return;
    const normalizedStages = normalizeStageFilters(stageFilters);
    const nextSearch = search.trim();
    const needsUpdate =
      nextSearch !== searchQuery ||
      dateFrom !== dateFromQuery ||
      dateTo !== dateToQuery ||
      !areArraysEqual(normalizedStages, stageQuery) ||
      showUnreturnedOnly !== effectiveUnreturnedQuery ||
      showReturnedOnly !== effectiveReturnedQuery ||
      showPickupOnly !== pickupQuery;
    if (!needsUpdate) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }
    if (dateFrom) {
      params.set("from", dateFrom);
    } else {
      params.delete("from");
    }
    if (dateTo) {
      params.set("to", dateTo);
    } else {
      params.delete("to");
    }
    params.delete("stage");
    normalizedStages.forEach((stage) => params.append("stage", stage));
    if (showUnreturnedOnly) {
      params.set("unreturned", "1");
    } else {
      params.delete("unreturned");
    }
    if (showReturnedOnly) {
      params.set("returned", "1");
    } else {
      params.delete("returned");
    }
    if (showPickupOnly) {
      params.set("pickup", "1");
    } else {
      params.delete("pickup");
    }
    const next = params.toString();
    router.replace(next ? `${basePath}?${next}` : basePath, { scroll: false });
  }, [
    basePath,
    router,
    search,
    searchParams,
    searchQuery,
    showUnreturnedOnly,
    showReturnedOnly,
    showPickupOnly,
    stageFilters,
    stageQuery,
    effectiveUnreturnedQuery,
    effectiveReturnedQuery,
    pickupQuery,
    dateFrom,
    dateTo,
    dateFromQuery,
    dateToQuery,
  ]);

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
      if (checked) {
        setShowReturnedOnly(false);
      }
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleReturnedToggle = useCallback(
    (checked: boolean) => {
      setShowReturnedOnly(checked);
      if (checked) {
        setShowUnreturnedOnly(false);
      }
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handlePickupToggle = useCallback(
    (checked: boolean) => {
      setShowPickupOnly(checked);
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFrom(normalizeDateInput(value));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateTo(normalizeDateInput(value));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleClearDateFilter = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    resetOrdersFeed();
  }, [resetOrdersFeed]);

  const handleFilterMenuEnter = useCallback(() => {
    setFilterMenuMode((prev) => (prev === "pinned" ? prev : "hover"));
  }, []);

  const handleFilterMenuLeave = useCallback(() => {
    setFilterMenuMode((prev) => (prev === "hover" ? "closed" : prev));
  }, []);

  const handleFilterMenuToggle = useCallback(() => {
    setFilterMenuMode((prev) => (prev === "pinned" ? "closed" : "pinned"));
  }, []);

  useEffect(() => {
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
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
    if (list.totals) {
      setOrdersTotals(list.totals);
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
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });
  const pickupValue = Boolean(form.watch("pickup"));
  const transportModeValue = form.watch("transportMode");
  const slanjeModeValue = form.watch("slanjeMode");
  const slanjeOwnerValue = form.watch("slanjeOwner");
  const slanjeOwnerStartingAmountValue = form.watch("slanjeOwnerStartingAmount");
  const availableTransportModes = pickupValue ? pickupTransportModes : transportModes;
  const showShippingFields = !pickupValue;
  const slanjeOwnerLabel =
    slanjeModeValue === "Posta"
      ? "Posta - na ime"
      : slanjeModeValue
        ? "Aks/Bex - na ciji racun"
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
  useEffect(() => {
    if (!pickupValue) return;
    if (slanjeModeValue !== undefined) {
      form.setValue("slanjeMode", undefined, { shouldDirty: true, shouldTouch: true });
    }
    if (slanjeOwnerValue !== undefined) {
      form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
    }
    if (slanjeOwnerStartingAmountValue !== undefined) {
      form.setValue("slanjeOwnerStartingAmount", undefined, { shouldDirty: true, shouldTouch: true });
    }
    if (transportModeValue && !pickupTransportModes.includes(transportModeValue as (typeof pickupTransportModes)[number])) {
      form.setValue("transportMode", pickupTransportModes[0], { shouldDirty: true, shouldTouch: true });
    }
  }, [form, pickupValue, slanjeModeValue, slanjeOwnerStartingAmountValue, slanjeOwnerValue, transportModeValue]);
  useEffect(() => {
    const previousMode = previousSlanjeModeRef.current;
    if (!slanjeModeValue) {
      previousSlanjeModeRef.current = undefined;
      if (slanjeOwnerValue !== undefined) {
        form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
      }
      return;
    }
    if (previousMode && previousMode !== slanjeModeValue) {
      form.setValue("slanjeOwner", undefined, { shouldDirty: true, shouldTouch: true });
    }
    previousSlanjeModeRef.current = slanjeModeValue;
  }, [form, slanjeModeValue, slanjeOwnerValue]);
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

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const consumeLongPressClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!longPressTriggeredRef.current) return false;
    event.preventDefault();
    event.stopPropagation();
    longPressTriggeredRef.current = false;
    return true;
  }, []);

  const createLongPressHandlers = useCallback(
    (onLongPress: () => void) => ({
      onTouchStart: (event: TouchEvent<HTMLElement>) => {
        if (event.touches.length !== 1) return;
        clearLongPressTimer();
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          onLongPress();
        }, 650);
      },
      onTouchEnd: () => {
        clearLongPressTimer();
      },
      onTouchMove: () => {
        clearLongPressTimer();
      },
      onTouchCancel: () => {
        clearLongPressTimer();
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        consumeLongPressClick(event);
      },
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (longPressTriggeredRef.current) {
          event.preventDefault();
        }
      },
    }),
    [clearLongPressTimer, consumeLongPressClick],
  );

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
        transportMode: order.transportMode ?? "",
      });
      return;
    }
    setQuickEdit({
      field,
      order,
      myProfitPercent: String(resolveProfitPercent(order.myProfitPercent)),
    });
  }, [resolveProfitPercent]);

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
        transportMode: values.transportMode ?? null,
        slanjeMode: values.slanjeMode ?? null,
        slanjeOwner: values.slanjeOwner ?? null,
        slanjeOwnerStartingAmount:
          typeof values.slanjeOwnerStartingAmount === "number" ? values.slanjeOwnerStartingAmount : null,
        myProfitPercent: typeof values.myProfitPercent === "number" ? values.myProfitPercent : 100,
        pickup: Boolean(values.pickup),
        sendEmail: values.sendEmail ?? true,
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
    });
  }, [
    draftItems,
    editingOrderId,
    form,
    itemProductId,
    itemQuantity,
    itemSupplierId,
    itemVariantId,
    manualSalePrice,
    productInput,
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
    setCustomerQuery("");
    setCustomerMenuOpen(false);
    setExitConfirmOpen(false);
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

  const handleCustomerSelect = useCallback(
    (customer: Customer) => {
      form.setValue("customerName", customer.name, { shouldDirty: true, shouldTouch: true });
      form.setValue("phone", customer.phone, { shouldDirty: true, shouldTouch: true });
      form.setValue("address", customer.address, { shouldDirty: true, shouldTouch: true });
      if (typeof customer.pickup === "boolean") {
        form.setValue("pickup", customer.pickup, { shouldDirty: true, shouldTouch: true });
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

  const handleSubmitOrder = async (values: OrderFormValues) => {
    if (draftItems.length === 0) {
      toast.error("Dodaj bar jedan proizvod u narudzbinu.");
      focusOrderField("productSearch");
      return;
    }

    try {
      const pickup = Boolean(values.pickup);
      const shouldSendEmail = values.sendEmail ?? true;
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
      }));
      const payload = {
        stage: values.stage,
        title: payloadItems[0]?.title ?? "Narudzbina",
        transportCost: values.transportCost,
        transportMode: values.transportMode,
        slanjeMode,
        slanjeOwner: ownerInput,
        brojPosiljke: editingOrder?.brojPosiljke,
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
        resetOrdersFeed();
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

  const openRestockDeleteModal = (entry: RestockRequest) => {
    setRestockDeleteCandidate(entry);
    setRestockDeleteOpen(true);
  };

  const closeRestockDeleteModal = () => {
    setRestockDeleteOpen(false);
    setRestockDeleteCandidate(null);
  };

  const handleRestockDeleteOpenChange = (open: boolean) => {
    if (open) {
      setRestockDeleteOpen(true);
    } else {
      closeRestockDeleteModal();
    }
  };

  const handleRestockDelete = async (id: string) => {
    if (isDeletingRestock) return;
    setIsDeletingRestock(true);
    try {
      await deleteRestockRequest({ id, token: sessionToken, scope: orderScope });
      toast.success("Zahtev je obrisan.");
      closeRestockDeleteModal();
    } catch (error) {
      console.error(error);
      toast.error("Brisanje zahteva nije uspelo.");
    } finally {
      setIsDeletingRestock(false);
    }
  };

  const resetRestockForm = () => {
    setRestockProductId("");
    setRestockProductInput("");
    setRestockProductSearch("");
    setRestockProductMenuOpen(false);
    setRestockVariantId("");
    setRestockName("");
    setRestockPhone("");
  };

  const handleCreateRestockRequest = async () => {
    if (isCreatingRestock) return;
    const name = restockName.trim();
    const phone = restockPhone.trim();
    const productId = restockProductId.trim();
    const product = restockSelectedProduct;
    if (!productId || !product) {
      toast.error("Izaberi proizvod.");
      return;
    }
    const productTitle = getProductDisplayName(product);
    const variants = product.variants ?? [];
    const selectedVariant =
      variants.find((variant) => variant.id === restockVariantId) ??
      variants.find((variant) => variant.isDefault) ??
      variants[0];
    if (!name) {
      toast.error("Unesi ime.");
      return;
    }
    if (!phone) {
      toast.error("Unesi broj telefona.");
      return;
    }
    setIsCreatingRestock(true);
    try {
      await createRestockRequest({
        token: sessionToken,
        scope: orderScope,
        name,
        phone,
        productId,
        productTitle,
        variantLabel: selectedVariant?.label,
      });
      toast.success("Zahtev je sacuvan.");
      resetRestockForm();
    } catch (error) {
      console.error(error);
      toast.error("Cuvanje zahteva nije uspelo.");
    } finally {
      setIsCreatingRestock(false);
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
      slanjeMode: order.slanjeMode,
      slanjeOwner: order.slanjeOwner,
      myProfitPercent: order.myProfitPercent,
      pickup: order.pickup,
      napomena: order.napomena,
      brojPosiljke: order.brojPosiljke,
      povratVracen: order.povratVracen,
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
    [buildOrderUpdatePayload, updateOrder],
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
        const modeInput = quickEdit.transportMode.trim();
        const normalizedMode = modeInput
          ? transportModes.find((mode) => mode.toLowerCase() === modeInput.toLowerCase())
          : undefined;
        await applyQuickUpdate(
          quickEdit.order,
          { transportCost: nextCost, transportMode: normalizedMode },
          "Sacuvano.",
        );
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
    [buildOrderUpdatePayload, stageFilters, updateOrder],
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
                    <div className="relative">
                      <Input
                        placeholder="npr. Marko Markovic"
                        required
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
                      <p className="text-xs text-slate-500">Oznaci ako kupac preuzima bez kurira.</p>
                    </div>
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
                      {availableTransportModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      {pickupValue ? "Za licno preuzimanje dostupni su Kol i Joe." : "Odaberi kurira ili dostavu."}
                    </p>
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
                        <div className="space-y-2">
                          <div className="hidden flex-wrap gap-2 md:flex">
                            {slanjeModes.map((mode) => {
                              const isActive = field.value === mode;
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                                    isActive
                                      ? "border-blue-500 bg-blue-50 text-blue-700"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200",
                                  )}
                                  onClick={() => field.onChange(mode)}
                                >
                                  {mode}
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                                !field.value
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                              onClick={() => field.onChange(undefined)}
                            >
                              Bez slanja
                            </button>
                          </div>
                          <div className="md:hidden">
                            <select
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                              ref={field.ref}
                              name={field.name}
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(event.target.value || undefined)}
                              onBlur={field.onBlur}
                            >
                              <option value="">Bez slanja</option>
                              {slanjeModes.map((mode) => (
                                <option key={mode} value={mode}>
                                  {mode}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">Odaberi da li ide Posta, Aks ili Bex.</p>
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
                                : "Na ciji bankovni racun lezu pare preko Aksa/Bexa."
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
            <div className="space-y-3">
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
              <div className="space-y-2">
                <FormLabel>Nacin transporta</FormLabel>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={quickEdit.transportMode}
                  onChange={(event) =>
                    setQuickEdit((current) =>
                      current?.field === "transport" ? { ...current, transportMode: event.target.value } : current,
                    )
                  }
                >
                  <option value="">Izaberi</option>
                  {transportModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="flex items-center gap-2 sm:ml-auto">
                <div className="relative" onMouseEnter={handleFilterMenuEnter} onMouseLeave={handleFilterMenuLeave}>
                  <Button type="button" variant="outline" className="gap-2" onClick={handleFilterMenuToggle} aria-expanded={isFilterMenuOpen}>
                    Filteri
                    {activeFilterCount > 0 ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                  <div
                    className={cn(
                      "fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-3 transition md:absolute md:inset-auto md:right-0 md:top-full md:z-30 md:block md:w-72 md:bg-transparent md:p-0 md:pt-2",
                      isFilterMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                    )}
                    onClick={() => setFilterMenuMode("closed")}
                  >
                    <div
                      className="max-h-[90vh] w-[min(96vw,40rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:max-h-none md:w-72"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stage</p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {stageOptions.map((option) => {
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
                <Button type="button" variant="outline" className="gap-2" onClick={() => setRestockModalOpen(true)}>
                  <Bell className="h-4 w-4" />
                  Zahtevi
                  {restockEntries.length > 0 ? (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {restockEntries.length}
                    </span>
                  ) : null}
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
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Profit (50%)</p>
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
              orderEntries.map(({ order, prodajnoUkupno, nabavnoUkupno, transport, profitShare, povrat }) => {
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
                      )}
                      onClick={() => handleRowClick(order._id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-slate-500">{formatDate(order.kreiranoAt)}</span>
                        <StageBadge stage={order.stage} />
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
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Profit (50%)</p>
                          <p className={`text-sm font-semibold ${profitShare < 0 ? "text-red-600" : "text-slate-900"}`}>
                            {formatCurrency(profitShare, "EUR")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-500">Povrat</p>
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(povrat, "EUR")}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
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
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyText(shipmentNumber, "Broj posiljke je kopiran.");
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
                    </div>
                  );
                },
              )
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow>
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
                    <span>Profit (50%)</span>
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
                    const shipmentNumber = resolveShipmentNumber(order);
                    const showShipmentNumberInNote = shipmentNumber.length > 0;

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
                        <TableCell className="text-center">{formatCurrency(transport, "EUR")}</TableCell>
                        <TableCell className="text-center">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-center font-semibold">
                            <span className={profitShare < 0 ? "text-red-600" : ""}>
                              {formatCurrency(profitShare, "EUR")}
                            </span>
                        </TableCell>
                        <TableCell className="text-center">
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
                          {showShipmentNumberInNote ? (
                            <button
                              type="button"
                              className="inline-flex max-w-full items-center gap-1 truncate font-mono text-blue-700 hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void copyText(shipmentNumber, "Broj posiljke je kopiran.");
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
          </div>
          <div ref={ordersLoaderRef} className="flex justify-center">
            <LoadingDots show={isLoadingMoreOrders && hasMoreOrders} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
