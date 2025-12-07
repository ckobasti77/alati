"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Facebook,
  GripVertical,
  ImageOff,
  Instagram,
  Loader2,
  Maximize2,
  PenLine,
  Plus,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Product, ProductAdImage, ProductImage, ProductVariant, Supplier } from "@/types/order";

type ProductWithUrls = Omit<Product, "images" | "variants" | "adImage"> & {
  images?: (ProductImage & { url?: string | null })[];
  variants?: (ProductVariant & { images?: (ProductImage & { url?: string | null })[] })[];
  adImage?: (ProductAdImage & { url?: string | null }) | null;
};

type GalleryItem = {
  id: string;
  storageId: string;
  url: string;
  alt: string;
  label: string;
  fileName?: string | null;
  isMain: boolean;
  publishFb: boolean;
  publishIg: boolean;
  origin: { type: "product" } | { type: "variant"; variantId: string };
};

type DraftCategoryIcon = {
  storageId: string;
  previewUrl?: string;
  fileName?: string;
  contentType?: string;
};

type SocialPlatform = "facebook" | "instagram";

type LightboxItem = {
  id?: string;
  url: string;
  alt?: string;
};

const isVariantOrigin = (
  origin: GalleryItem["origin"],
): origin is Extract<GalleryItem["origin"], { type: "variant"; variantId: string }> => origin.type === "variant";

const parsePrice = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return NaN;
  return Number(normalized);
};

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type InlineFieldProps = {
  label: string;
  value?: string | number | null;
  multiline?: boolean;
  formatter?: (value?: string | number | null) => string;
  onSave: (nextValue: string) => Promise<void>;
};

function InlineField({ label, value, multiline = false, formatter, onSave }: InlineFieldProps) {
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
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleSave();
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-1 w-full">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {isEditing ? (
            multiline ? (
              <Textarea
                ref={textareaRef}
                autoResize
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="text-sm w-full"
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
            <p className="text-base font-semibold text-slate-900">{displayValue}</p>
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

export default function ProductDetailsPage() {
  return (
    <RequireAuth>
      <ProductDetailsContent />
    </RequireAuth>
  );
}

function ProductDetailsContent() {
  const { token } = useAuth();
  const sessionToken = token as string;
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const uploadInputId = useMemo(() => `product-upload-${productId}`, [productId]);
  const adUploadInputId = useMemo(() => `ad-upload-${productId}`, [productId]);
  const queryResult = useConvexQuery<ProductWithUrls | null>("products:get", { token: sessionToken, id: productId });
  const categories = useConvexQuery<Category[]>("categories:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
  const updateProduct = useConvexMutation("products:update");
  const createCategory = useConvexMutation<
    {
      token: string;
      name: string;
      icon?: { storageId: string; fileName?: string; contentType?: string };
    },
    string
  >("categories:create");
  const removeCategory = useConvexMutation<{ token: string; id: string; force?: boolean }, { removed: boolean; productCount: number }>(
    "categories:remove",
  );
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");
  const [product, setProduct] = useState<ProductWithUrls | null>(null);
  const productRef = useRef<ProductWithUrls | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [isGalleryDropActive, setIsGalleryDropActive] = useState(false);
  const [isAdDropActive, setIsAdDropActive] = useState(false);
  const [publishing, setPublishing] = useState<SocialPlatform | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });
  const adImageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const [draggingItem, setDraggingItem] = useState<GalleryItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<DraftCategoryIcon | null>(null);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [reorderEditingId, setReorderEditingId] = useState<string | null>(null);
  const [reorderInputValue, setReorderInputValue] = useState("");
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newVariantOpis, setNewVariantOpis] = useState("");
  const [newVariantNabavna, setNewVariantNabavna] = useState("");
  const [newVariantProdajna, setNewVariantProdajna] = useState("");
  const [newVariantIsDefault, setNewVariantIsDefault] = useState(false);
  const [newVariantNabavnaIsReal, setNewVariantNabavnaIsReal] = useState(true);
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const [supplierEdits, setSupplierEdits] = useState<Record<string, string>>({});
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newSupplierVariantId, setNewSupplierVariantId] = useState("base");
  const [newSupplierPrice, setNewSupplierPrice] = useState("");
  const [isSavingSupplierOffer, setIsSavingSupplierOffer] = useState(false);
  const categoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  const isLoading = queryResult === undefined;

  useEffect(() => {
    if (queryResult === undefined) return;
    const normalized = queryResult ? normalizeProductImages(queryResult) : null;
    productRef.current = normalized;
    setProduct(normalized);
  }, [queryResult]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(update);
    }
    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", update);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(update);
      }
    };
  }, []);

  useEffect(() => {
    if (!isTouchDevice) return;
    setIsGalleryDropActive(false);
    setIsAdDropActive(false);
  }, [isTouchDevice]);

  useEffect(() => {
    if (!categoryMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const node = categoryDropdownRef.current;
      if (!node) return;
      const path = typeof event.composedPath === "function" ? event.composedPath() : undefined;
      if (path && path.includes(node)) return;
      if (node.contains(event.target as Node)) return;
      setCategoryMenuOpen(false);
      resetNewCategoryState();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoryMenuOpen]);

  const productCategories = useMemo(() => {
    if (!product || !categories) return [];
    const map = new Map(categories.map((category) => [category._id, category]));
    return (product.categoryIds ?? []).map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [categories, product]);
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    (categories ?? []).forEach((category) => map.set(category._id, category));
    return map;
  }, [categories]);
  const filteredCategories = useMemo(() => {
    const list = categories ?? [];
    const needle = categorySearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((category) => category.name.toLowerCase().includes(needle));
  }, [categories, categorySearch]);
  const variantMap = useMemo(
    () => new Map((product?.variants ?? []).map((variant) => [variant.id, variant])),
    [product?.variants],
  );
  const supplierOffers = useMemo(() => product?.supplierOffers ?? [], [product]);
  const bestSupplierOffer = useMemo(() => {
    if (!supplierOffers.length) return null;
    return supplierOffers.reduce((best, offer) => {
      if (!best || offer.price < best.price) return offer;
      return best;
    }, supplierOffers[0] as (typeof supplierOffers)[number]);
  }, [supplierOffers]);
  useEffect(() => {
    const map: Record<string, string> = {};
    supplierOffers.forEach((offer) => {
      const key = `${offer.supplierId}-${offer.variantId ?? "base"}`;
      map[key] = String(offer.price);
    });
    setSupplierEdits(map);
  }, [supplierOffers]);

  useEffect(() => {
    if (!showAddSupplierForm && supplierOffers.length === 0) {
      setShowAddSupplierForm(true);
    }
  }, [showAddSupplierForm, supplierOffers]);

  useEffect(() => {
    if (!showAddSupplierForm) return;
    if (newSupplierId && suppliers?.some((supplier) => supplier._id === newSupplierId)) return;
    if (!suppliers || suppliers.length === 0) return;
    setNewSupplierId(suppliers[0]._id);
  }, [newSupplierId, showAddSupplierForm, suppliers]);

  useEffect(() => {
    const variants = product?.variants ?? [];
    if (variants.length === 0 && newSupplierVariantId !== "base") {
      setNewSupplierVariantId("base");
      return;
    }
    if (newSupplierVariantId === "base") return;
    const hasVariant = variants.some((variant) => variant.id === newSupplierVariantId);
    if (!hasVariant) {
      setNewSupplierVariantId("base");
    }
  }, [newSupplierVariantId, product]);

  const supplierOfferKey = (offer: { supplierId: string; variantId?: string }) =>
    `${offer.supplierId}-${offer.variantId ?? "base"}`;

  const resolveSupplierPriceForVariant = (
    offers: { price: number; variantId?: string }[] | undefined,
    variantId?: string,
    options?: { fallbackToBase?: boolean },
  ) => {
    if (!offers || offers.length === 0) return undefined;
    const exactMatches = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
    const fallbackMatches = options?.fallbackToBase === false ? [] : offers.filter((offer) => !offer.variantId);
    const pool = exactMatches.length > 0 ? exactMatches : fallbackMatches;
    if (pool.length === 0) return undefined;
    return pool.reduce((min, offer) => Math.min(min, offer.price), Number.POSITIVE_INFINITY);
  };

  const applySupplierOffersDraft = (
    current: ProductWithUrls,
    offers: { supplierId: string; price: number; variantId?: string }[],
  ): ProductWithUrls => {
    const seen = new Set<string>();
    const normalized = offers.reduce<typeof offers>((list, offer) => {
      const key = supplierOfferKey(offer);
      if (seen.has(key)) return list;
      seen.add(key);
      const price = Number.isFinite(offer.price) ? Math.max(offer.price, 0) : 0;
      const variantId = offer.variantId?.trim() || undefined;
      list.push({ supplierId: offer.supplierId, price, variantId });
      return list;
    }, []);
    const variants = (current.variants ?? []).map((variant) => {
      const supplierPrice = resolveSupplierPriceForVariant(normalized, variant.id, { fallbackToBase: false });
      if (supplierPrice === undefined) return variant;
      return { ...variant, nabavnaCena: supplierPrice, nabavnaCenaIsReal: true };
    });
    const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
    const supplierPrice = resolveSupplierPriceForVariant(normalized, defaultVariant?.id);
    const nabavnaCenaIsReal =
      supplierPrice !== undefined
        ? true
        : current.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? true;
    return {
      ...current,
      variants: variants.length ? variants : undefined,
      supplierOffers: normalized as any,
      nabavnaCena: supplierPrice ?? defaultVariant?.nabavnaCena ?? current.nabavnaCena,
      nabavnaCenaIsReal,
    };
  };

  const handleSupplierPriceChange = (key: string, value: string) => {
    setSupplierEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSupplierPriceSave = async (offer: { supplierId: string; variantId?: string }) => {
    const key = supplierOfferKey(offer);
    const raw = supplierEdits[key] ?? "";
    const parsed = parsePrice(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Unesi ispravnu cenu za dobavljaca.");
      return;
    }
    const updatedAt = Date.now();
    await applyUpdate(
      (current) => {
        const nextOffers = (current.supplierOffers ?? []).map((item) =>
          supplierOfferKey(item) === key ? { ...item, price: parsed } : item,
        );
        return { ...applySupplierOffersDraft(current, nextOffers as any), updatedAt };
      },
      "Cena dobavljaca sacuvana.",
    );
  };

  const handleAddSupplierOffer = async () => {
    if (!product) return;
    if (!newSupplierId) {
      toast.error("Izaberi dobavljaca.");
      return;
    }
    const parsed = parsePrice(newSupplierPrice);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Unesi ispravnu cenu za dobavljaca.");
      return;
    }
    const variantId =
      (product.variants ?? []).length > 0 && newSupplierVariantId !== "base" ? newSupplierVariantId : undefined;
    setIsSavingSupplierOffer(true);
    const updatedAt = Date.now();
    const newKey = supplierOfferKey({ supplierId: newSupplierId, variantId });
    try {
      await applyUpdate(
        (current) => {
          const existing = current.supplierOffers ?? [];
          const hasExisting = existing.some((item) => supplierOfferKey(item) === newKey);
          const nextOffers = hasExisting
            ? existing.map((item) => (supplierOfferKey(item) === newKey ? { ...item, price: parsed } : item))
            : [...existing, { supplierId: newSupplierId as any, price: parsed, variantId }];
          return { ...applySupplierOffersDraft(current, nextOffers as any), updatedAt };
        },
        "Ponuda dobavljaca sacuvana.",
      );
      setNewSupplierPrice("");
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje dobavljaca nije uspelo.");
    } finally {
      setIsSavingSupplierOffer(false);
    }
  };

  const handleRemoveSupplierOffer = async (offer: { supplierId: string; variantId?: string }) => {
    const key = supplierOfferKey(offer);
    const confirmDelete = window.confirm("Da li sigurno zelis da uklonis ovog dobavljaca sa proizvoda?");
    if (!confirmDelete) return;
    const updatedAt = Date.now();
    await applyUpdate(
      (current) => {
        const nextOffers = (current.supplierOffers ?? []).filter((item) => supplierOfferKey(item) !== key);
        return { ...applySupplierOffersDraft(current, nextOffers as any), updatedAt };
      },
      "Ponuda dobavljaca uklonjena.",
    );
  };

  const buildUpdatePayload = (
    current: ProductWithUrls,
    options?: { expectedUpdatedAt?: number; updatedAt?: number },
  ) => {
    const variants = current.variants?.map((variant) => ({
      id: variant.id,
      label: variant.label,
      nabavnaCena: variant.nabavnaCena,
      nabavnaCenaIsReal: variant.nabavnaCenaIsReal ?? true,
      prodajnaCena: variant.prodajnaCena,
      isDefault: variant.isDefault,
      opis: variant.opis,
      images: (variant.images ?? []).map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
      })),
    }));
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const resolvedOpisFb = current.opisFbInsta ?? current.opis;
    return {
      token: sessionToken,
      id: current._id,
      name: current.name,
      kpName: current.kpName ?? current.name,
      nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
      nabavnaCenaIsReal:
        current.nabavnaCenaIsReal ??
        current.variants?.find((variant) => variant.isDefault)?.nabavnaCenaIsReal ??
        defaultVariant?.nabavnaCenaIsReal ??
        true,
      prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
      opis: resolvedOpisFb,
      opisKp: current.opisKp,
      opisFbInsta: resolvedOpisFb,
      publishKp: current.publishKp,
      publishFb: current.publishFb,
      publishIg: current.publishIg,
      publishFbProfile: current.publishFbProfile ?? false,
      publishMarketplace: current.publishMarketplace ?? false,
      pickupAvailable: current.pickupAvailable ?? false,
      categoryIds: current.categoryIds ?? [],
      variants,
      images: (current.images ?? []).map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
      })),
      supplierOffers: current.supplierOffers?.map((offer) => ({
        supplierId: offer.supplierId as any,
        price: offer.price,
        variantId: offer.variantId,
      })),
      adImage: current.adImage
        ? {
            storageId: current.adImage.storageId,
            fileName: current.adImage.fileName,
            contentType: current.adImage.contentType,
            uploadedAt: current.adImage.uploadedAt,
          }
        : null,
      expectedUpdatedAt: options?.expectedUpdatedAt ?? current.updatedAt,
      updatedAt: options?.updatedAt ?? current.updatedAt,
    };
  };

  const applyUpdate = async (updater: (current: ProductWithUrls) => ProductWithUrls, successMessage?: string) => {
    const previous = productRef.current;
    if (!previous) return;
    const expectedUpdatedAt = previous.updatedAt ?? Date.now();
    const optimisticUpdatedAt = Date.now();
    const draft = updater(previous);
    const next = normalizeProductImages({ ...draft, updatedAt: optimisticUpdatedAt });
    productRef.current = next;
    setProduct(next);
    try {
      await updateProduct(buildUpdatePayload(next, { expectedUpdatedAt, updatedAt: optimisticUpdatedAt }));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      console.error(error);
      productRef.current = previous;
      setProduct(previous);
      const message =
        error instanceof Error && error.message.toLowerCase().includes("medjuvremenu promenjen")
          ? "Proizvod je u medjuvremenu promenjen. Osvezi stranicu i probaj ponovo."
          : "Cuvanje nije uspelo.";
      toast.error(message);
      throw error;
    }
  };

  const resetNewCategoryState = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (newCategoryIcon?.previewUrl) {
      URL.revokeObjectURL(newCategoryIcon.previewUrl);
    }
    setNewCategoryIcon(null);
    setIsUploadingCategoryIcon(false);
  };

  const handleSelectCategory = async (categoryId: string) => {
    await applyUpdate(
      (current) => {
        const existing = new Set(current.categoryIds ?? []);
        if (existing.has(categoryId)) return current;
        return { ...current, categoryIds: [...existing, categoryId] as any };
      },
      "Kategorija dodata.",
    );
    setCategoryMenuOpen(false);
    setCategorySearch("");
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await applyUpdate(
      (current) => ({
        ...current,
        categoryIds: (current.categoryIds ?? []).filter((id) => id !== categoryId),
      }),
      "Kategorija uklonjena.",
    );
  };

  const handleUploadCategoryIcon = async (file: File) => {
    if (isUploadingCategoryIcon) return;
    const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
    if (!isImage) {
      toast.error("Prevuci ili izaberi fajl tipa slike za ikonicu.");
      return;
    }
    setIsUploadingCategoryIcon(true);
    try {
      const uploadUrl = await generateUploadUrl({ token: sessionToken });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Upload ikonice nije uspeo.");
      }
      const { storageId } = await response.json();
      if (newCategoryIcon?.previewUrl) {
        URL.revokeObjectURL(newCategoryIcon.previewUrl);
      }
      setNewCategoryIcon({
        storageId,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        contentType: file.type,
      });
      toast.success("Ikonica je spremna.");
    } catch (error) {
      console.error(error);
      toast.error("Upload ikonice nije uspeo.");
    } finally {
      setIsUploadingCategoryIcon(false);
    }
  };

  const handleCategoryIconChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleUploadCategoryIcon(file);
    }
    event.target.value = "";
  };

  const handleCategoryIconDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await handleUploadCategoryIcon(file);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Upisi naziv kategorije.");
      return;
    }
    setIsCreatingCategory(true);
    try {
      const id = await createCategory({
        token: sessionToken,
        name,
        icon: newCategoryIcon
          ? {
              storageId: newCategoryIcon.storageId,
              fileName: newCategoryIcon.fileName,
              contentType: newCategoryIcon.contentType,
            }
          : undefined,
      });
      await handleSelectCategory(id);
      toast.success("Kategorija dodata.");
      resetNewCategoryState();
    } catch (error) {
      console.error(error);
      toast.error("Kreiranje kategorije nije uspelo.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleRequestDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await removeCategory({ token: sessionToken, id: categoryToDelete._id, force: true });
      setProduct((current) => {
        if (!current) return current;
        const nextCategoryIds = (current.categoryIds ?? []).filter((id) => id !== categoryToDelete._id);
        const next = { ...current, categoryIds: nextCategoryIds };
        productRef.current = next;
        return next;
      });
      toast.success("Kategorija obrisana.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Brisanje kategorije nije uspelo.");
    } finally {
      setIsDeletingCategory(false);
      setCategoryToDelete(null);
    }
  };

  function ensureMainImage(
    list: (ProductImage & { url?: string | null })[] = [],
    preferredMainId?: string,
  ) {
    if (list.length === 0) return [];
    const next = [...list];
    const preferredIndex = preferredMainId ? next.findIndex((image) => image.storageId === preferredMainId) : -1;
    const flaggedIndex = preferredIndex === -1 ? next.findIndex((image) => image.isMain) : -1;
    const targetIndex = preferredIndex >= 0 ? preferredIndex : flaggedIndex >= 0 ? flaggedIndex : 0;
    if (targetIndex > 0) {
      const [main] = next.splice(targetIndex, 1);
      next.unshift(main);
    }
    return next.map((image, index) => ({ ...image, isMain: index === 0 }));
  }

  function normalizeProductImages(current: ProductWithUrls): ProductWithUrls {
    return {
      ...current,
      images: current.images ? ensureMainImage(current.images) : current.images,
      variants:
        current.variants?.map((variant) => ({
          ...variant,
          images: variant.images ? ensureMainImage(variant.images) : variant.images,
        })) ?? current.variants,
    };
  }

  const handleBaseFieldSave = async (
    field: "name" | "kpName" | "opisKp" | "opisFbInsta" | "nabavnaCena" | "prodajnaCena",
    value: string,
  ) => {
    const trimmed = value.trim();
    if (!product) return;
    if ((field === "name" || field === "kpName") && trimmed.length < 2) {
      toast.error("Naziv mora imati bar 2 karaktera.");
      throw new Error("Invalid name");
    }

    if (field === "nabavnaCena" || field === "prodajnaCena") {
      const parsed = parsePrice(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Upisi broj veci ili jednak nuli.");
        throw new Error("Invalid price");
      }
      await applyUpdate(
        (current) => {
          const variantsList = current.variants ?? [];
          const hasDefault = variantsList.some((variant) => variant.isDefault);
          const updatedVariants = variantsList.map((variant, index) => {
            const shouldSync = variant.isDefault || (!hasDefault && index === 0);
            return shouldSync ? { ...variant, [field]: parsed } : variant;
          });
          return {
            ...current,
            [field]: parsed,
            variants: variantsList.length ? updatedVariants : undefined,
          };
        },
        "Cena sacuvana.",
      );
      return;
    }

    await applyUpdate(
      (current) => ({
        ...current,
        [field]: trimmed.length === 0 ? (field === "kpName" ? current.kpName ?? current.name : current.name) : trimmed,
      }),
      "Sacuvano.",
    );
  };

  const handlePublishToggle = async (
    field: "publishKp" | "publishFb" | "publishIg" | "publishFbProfile" | "publishMarketplace" | "pickupAvailable",
    value: boolean,
  ) => {
    await applyUpdate(
      (current) => ({
        ...current,
        [field]: value,
      }),
      "Sacuvano.",
    );
  };

  const publishNow = async (platform: SocialPlatform) => {
    if (!sessionToken) {
      toast.error("Nedostaje token za objavu. Prijavi se ponovo.");
      return;
    }
    const latestProduct = productRef.current;
    if (!latestProduct) {
      toast.error("Proizvod nije ucitan.");
      return;
    }
    try {
      setPublishing(platform);
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productId: latestProduct._id,
          token: sessionToken,
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.error) {
        throw new Error(result?.error || "Objava nije uspela.");
      }
      toast.success(
        platform === "facebook" ? "Objavljeno na Facebook stranici." : "Objavljeno na Instagram nalogu.",
      );
      const publishField: "publishFb" | "publishIg" = platform === "facebook" ? "publishFb" : "publishIg";
      if (!latestProduct[publishField]) {
        try {
          await applyUpdate((current) => ({ ...current, [publishField]: true }));
        } catch (error) {
          console.error(error);
          toast.error("Objava je poslata, ali cuvanje oznake nije uspelo.");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Objava nije uspela.");
    } finally {
      setPublishing(null);
    }
  };

  const handleVariantFieldSave = async (
    variantId: string,
    field: "label" | "nabavnaCena" | "prodajnaCena" | "opis",
    value: string,
  ) => {
    if (!product) return;
    const trimmed = value.trim();
    if (field === "label" && trimmed.length === 0) {
      toast.error("Naziv tipa ne sme biti prazan.");
      throw new Error("Invalid variant label");
    }
    if (field === "nabavnaCena" || field === "prodajnaCena") {
      const parsed = parsePrice(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Upisi broj veci ili jednak nuli.");
        throw new Error("Invalid price");
      }
      await applyUpdate(
        (current) => {
          const nextVariants =
            current.variants?.map((variant) =>
              variant.id === variantId ? { ...variant, [field]: parsed } : variant,
            ) ?? [];
          const defaultVariant = nextVariants.find((variant) => variant.isDefault) ?? nextVariants[0];
          return {
            ...current,
            variants: nextVariants,
            nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
            nabavnaCenaIsReal: defaultVariant?.nabavnaCenaIsReal ?? current.nabavnaCenaIsReal ?? true,
            prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
          };
        },
        "Tip sacuvan.",
      );
      return;
    }

    await applyUpdate(
      (current) => ({
        ...current,
        variants: current.variants?.map((variant) =>
          variant.id === variantId ? { ...variant, [field]: trimmed.length === 0 ? undefined : trimmed } : variant,
        ),
      }),
      "Tip sacuvan.",
    );
  };

  const handleBasePurchaseRealityToggle = async (value: boolean) => {
    await applyUpdate(
      (current) => {
        const variantsList = current.variants ?? [];
        const defaultVariant = variantsList.find((variant) => variant.isDefault) ?? variantsList[0];
        const nextVariants =
          variantsList.length && defaultVariant
            ? variantsList.map((variant) =>
                variant.id === defaultVariant.id ? { ...variant, nabavnaCenaIsReal: value } : variant,
              )
            : current.variants;
        return {
          ...current,
          nabavnaCenaIsReal: value,
          variants: nextVariants,
        };
      },
      value ? "Oznaceno kao prava nabavna cena." : "Oznaceno kao procenjena nabavna cena.",
    );
  };

  const handleVariantPurchaseRealityToggle = async (variantId: string, value: boolean) => {
    await applyUpdate(
      (current) => {
        const currentVariants = current.variants ?? [];
        if (currentVariants.length === 0) return current;
        const nextVariants = currentVariants.map((variant) =>
          variant.id === variantId ? { ...variant, nabavnaCenaIsReal: value } : variant,
        );
        const defaultVariant = nextVariants.find((variant) => variant.isDefault) ?? nextVariants[0];
        return {
          ...current,
          variants: nextVariants,
          nabavnaCenaIsReal:
            defaultVariant && defaultVariant.id === variantId
              ? value
              : current.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? true,
        };
      },
      value ? "Oznaceno kao prava nabavna cena." : "Oznaceno kao procenjena nabavna cena.",
    );
  };

  const resetNewVariantForm = () => {
    setNewVariantLabel("");
    setNewVariantOpis("");
    setNewVariantNabavna("");
    setNewVariantProdajna("");
    setNewVariantIsDefault(false);
    setNewVariantNabavnaIsReal(product?.nabavnaCenaIsReal ?? true);
  };

  const handleStartAddVariant = () => {
    if (!product) return;
    setNewVariantLabel(product.name);
    setNewVariantOpis(product.opisFbInsta ?? product.opis ?? "");
    setNewVariantNabavna(String(product.nabavnaCena ?? ""));
    setNewVariantProdajna(String(product.prodajnaCena ?? ""));
    const hasVariants = (product.variants ?? []).length > 0;
    const hasDefault = (product.variants ?? []).some((variant) => variant.isDefault);
    setNewVariantIsDefault(!hasVariants || !hasDefault);
    setNewVariantNabavnaIsReal(product.nabavnaCenaIsReal ?? true);
    setIsAddingVariant(true);
  };

  const handleCancelAddVariant = () => {
    resetNewVariantForm();
    setIsAddingVariant(false);
  };

  const handleCreateVariant = async () => {
    if (!product) return;
    const label = newVariantLabel.trim();
    if (!label) {
      toast.error("Upisi naziv tipa.");
      return;
    }
    const nabavna = parsePrice(newVariantNabavna);
    if (!Number.isFinite(nabavna) || nabavna < 0) {
      toast.error("Unesi ispravnu nabavnu cenu.");
      return;
    }
    const prodajna = parsePrice(newVariantProdajna);
    if (!Number.isFinite(prodajna) || prodajna < 0) {
      toast.error("Unesi ispravnu prodajnu cenu.");
      return;
    }
    setIsSavingVariant(true);
    const hasExistingVariants = (product.variants ?? []).length > 0;
    const opis = newVariantOpis.trim();
    const draftVariant: ProductVariant = {
      id: generateId(),
      label,
      nabavnaCena: nabavna,
      nabavnaCenaIsReal: newVariantNabavnaIsReal,
      prodajnaCena: prodajna,
      isDefault: newVariantIsDefault || !hasExistingVariants,
      opis: opis ? opis : undefined,
      images: [],
    };
    try {
      await applyUpdate(
        (current) => {
          const existing = current.variants ?? [];
          const hasDefault = existing.some((variant) => variant.isDefault);
          const normalizedVariant = {
            ...draftVariant,
            isDefault: draftVariant.isDefault || !hasDefault || existing.length === 0,
          };
          const nextVariants = [...existing, normalizedVariant];
          const defaultVariant = nextVariants.find((variant) => variant.isDefault) ?? nextVariants[0];
          return {
            ...current,
            variants: nextVariants,
            nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
            nabavnaCenaIsReal: defaultVariant?.nabavnaCenaIsReal ?? current.nabavnaCenaIsReal ?? true,
            prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
          };
        },
        "Tip dodat.",
      );
      resetNewVariantForm();
      setIsAddingVariant(false);
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje tipa nije uspelo.");
    } finally {
      setIsSavingVariant(false);
    }
  };

  const uploadAdImage = async (file: File) => {
    if (!product) return;
    const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
    if (!isImage) {
      toast.error("Prevuci ili izaberi fajl tipa slike.");
      return;
    }
    setIsUploadingAdImage(true);
    try {
      const uploadUrl = await generateUploadUrl({ token: sessionToken });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Upload nije uspeo.");
      }
      const { storageId } = await response.json();
      const nextImage = {
        storageId,
        fileName: file.name,
        contentType: file.type,
        uploadedAt: Date.now(),
        url: URL.createObjectURL(file),
      };
      await applyUpdate(
        (current) => ({
          ...current,
          adImage: nextImage,
        }),
        "Ad slika sacuvana.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje ad slike nije uspelo.");
      throw error;
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleRemoveAllImages = async () => {
    if (!product) return;
    const shouldRemove = window.confirm("Obrisi sve slike ovog proizvoda (ukljucujuci slike tipova)?");
    if (!shouldRemove) return;
    await applyUpdate(
      (current) => ({
        ...current,
        images: [],
        variants: current.variants?.map((variant) => ({ ...variant, images: [] })),
      }),
      "Sve slike su obrisane.",
    );
  };

  const handleAdImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
    event.target.value = "";
  };

  const handleRemoveAdImage = async () => {
    await applyUpdate(
      (current) => ({
        ...current,
        adImage: null,
      }),
      "Ad slika uklonjena.",
    );
  };

  const handleRemoveSingleImage = async (item: GalleryItem) => {
    await applyUpdate(
      (current) => {
        if (item.origin.type === "product") {
          const remaining = ensureMainImage((current.images ?? []).filter((image) => image.storageId !== item.storageId));
          return { ...current, images: remaining };
        }
        if (item.origin.type !== "variant") return current;
        const currentVariants = current.variants ?? [];
        if (currentVariants.length === 0) return current;
        const { variantId } = item.origin;
        const nextVariants = currentVariants.map((variant) => {
          if (variant.id !== variantId) return variant;
          const remaining = ensureMainImage(
            (variant.images ?? []).filter((image) => image.storageId !== item.storageId),
          );
          return { ...variant, images: remaining };
        });
        return { ...current, variants: nextVariants };
      },
      "Slika obrisana.",
    );
  };

  const handleSetAsMain = async (item: GalleryItem) => {
    await applyUpdate(
      (current) => {
        if (item.origin.type === "product") {
          const images = current.images ?? [];
          if (images.length === 0) return current;
          return { ...current, images: ensureMainImage(images, item.storageId) };
        }
        if (item.origin.type !== "variant") return current;
        const variants = current.variants ?? [];
        if (variants.length === 0) return current;
        const { variantId } = item.origin;
        return {
          ...current,
          variants: variants.map((variant) => {
            if (variant.id !== variantId) return variant;
            const variantImages = variant.images ?? [];
            if (variantImages.length === 0) return variant;
            return { ...variant, images: ensureMainImage(variantImages, item.storageId) };
          }),
        };
      },
      "Glavna slika podesena.",
    );
  };

  const handleImagePublishToggle = async (
    item: GalleryItem,
    field: "publishFb" | "publishIg",
    value: boolean,
  ) => {
    await applyUpdate(
      (current) => {
        const updateList = (list: (ProductImage & { url?: string | null })[] = []) =>
          list.map((image) => (image.storageId === item.storageId ? { ...image, [field]: value } : image));
        if (item.origin.type === "product") {
          return { ...current, images: updateList(current.images ?? []) };
        }
        const origin = item.origin;
        if (!isVariantOrigin(origin)) return current;
        const variants = (current.variants ?? []).map((variant) =>
          variant.id === origin.variantId ? { ...variant, images: updateList(variant.images ?? []) } : variant,
        );
        return { ...current, variants };
      },
      "Sacuvano.",
    );
  };

  const isSameGalleryGroup = (a: GalleryItem, b: GalleryItem) => {
    if (a.origin.type !== b.origin.type) return false;
    if (a.origin.type === "variant" && b.origin.type === "variant") {
      return a.origin.variantId === b.origin.variantId;
    }
    return true;
  };

  const reorderImageList = (
    list: (ProductImage & { url?: string | null })[] = [],
    sourceId: string,
    targetId: string,
  ) => {
    const next = [...list];
    const fromIndex = next.findIndex((image) => image.storageId === sourceId);
    const toIndex = next.findIndex((image) => image.storageId === targetId);
    if (fromIndex === -1 || toIndex === -1) return list;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next.map((image, index) => ({ ...image, isMain: index === 0 }));
  };

  const handleReorderGallery = async (source: GalleryItem, target: GalleryItem) => {
    await applyUpdate(
      (current) => {
        if (source.origin.type === "product" && target.origin.type === "product") {
          const images = reorderImageList(current.images ?? [], source.storageId, target.storageId);
          return { ...current, images };
        }
        if (source.origin.type === "variant" && target.origin.type === "variant") {
          const variantId = source.origin.variantId;
          const variants = (current.variants ?? []).map((variant) => {
            if (variant.id !== variantId) return variant;
            const nextImages = reorderImageList(variant.images ?? [], source.storageId, target.storageId);
            return { ...variant, images: nextImages };
          });
          return { ...current, variants };
        }
        return current;
      },
      "Redosled sacuvan.",
    );
  };

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchDragActiveRef = useRef(false);
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null);

  const isTouchOnActionButton = (event: React.TouchEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    return Boolean(target.closest("button"));
  };

  const handleGalleryDragStart = (event: React.DragEvent<HTMLDivElement>, item: GalleryItem) => {
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", item.id);
    } catch {
      // ignore
    }
    setDraggingItem(item);
  };

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>, item: GalleryItem) => {
    if (event.touches.length !== 1) return;
    if (isTouchOnActionButton(event)) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTimerRef.current = setTimeout(() => {
      touchDragActiveRef.current = true;
      setTouchDraggingId(item.id);
      setDraggingItem(item);
      setDragOverId(item.id);
    }, 1000);
  };

  const handleGalleryTouchMove = async (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDragActiveRef.current || !draggingItem) return;
    event.preventDefault();
    const touch = event.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const targetId = targetElement?.closest("[data-gallery-id]")?.getAttribute("data-gallery-id");
    if (!targetId || targetId === touchDraggingId) return;
    const targetItem = gallery.find((item) => item.id === targetId);
    if (!targetItem) return;
    if (!isSameGalleryGroup(draggingItem, targetItem)) return;
    await handleReorderGallery(draggingItem, targetItem);
    setTouchDraggingId(targetId);
    setDraggingItem(targetItem);
    setDragOverId(targetId);
  };

  const resetTouchDrag = () => {
    touchDragActiveRef.current = false;
    setTouchDraggingId(null);
    setDraggingItem(null);
    setDragOverId(null);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleGalleryTouchEnd = () => {
    resetTouchDrag();
  };

  const handleGalleryDragOver = (event: React.DragEvent<HTMLDivElement>, target: GalleryItem) => {
    if (!draggingItem || !isSameGalleryGroup(draggingItem, target)) return;
    event.preventDefault();
    setDragOverId(target.id);
  };

  const handleGalleryDrop = async (event: React.DragEvent<HTMLDivElement>, target: GalleryItem) => {
    event.preventDefault();
    if (!draggingItem || draggingItem.id === target.id) return;
    if (!isSameGalleryGroup(draggingItem, target)) return;
    await handleReorderGallery(draggingItem, target);
    setDraggingItem(null);
    setDragOverId(null);
  };

  const handleGalleryDragEnd = () => {
    setDraggingItem(null);
    setDragOverId(null);
  };

  const handleGalleryTouchCancel = () => {
    resetTouchDrag();
  };

  const handleGalleryDragLeave = (target: GalleryItem) => {
    if (!draggingItem || !isSameGalleryGroup(draggingItem, target)) return;
    setDragOverId((current) => (current === target.id ? null : current));
  };

  const getGalleryGroup = (item: GalleryItem) => gallery.filter((candidate) => isSameGalleryGroup(item, candidate));

  const handleOpenReorderInput = (item: GalleryItem) => {
    const group = getGalleryGroup(item);
    const currentIndex = group.findIndex((candidate) => candidate.id === item.id);
    setReorderEditingId(item.id);
    setReorderInputValue(String(currentIndex >= 0 ? currentIndex + 1 : 1));
  };

  const handleCancelReorderInput = () => {
    setReorderEditingId(null);
    setReorderInputValue("");
  };

  const handleConfirmReorderInput = async (item: GalleryItem) => {
    const group = getGalleryGroup(item);
    if (group.length === 0) return;
    const parsed = Number.parseInt(reorderInputValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("Upisi redni broj (1 ili vise).");
      return;
    }
    const targetIndex = Math.min(Math.max(parsed - 1, 0), group.length - 1);
    const targetItem = group[targetIndex];
    handleCancelReorderInput();
    if (!targetItem || targetItem.id === item.id) return;
    setDraggingItem(item);
    setDragOverId(targetItem.id);
    await new Promise((resolve) => setTimeout(resolve, 180));
    try {
      await handleReorderGallery(item, targetItem);
    } finally {
      setTimeout(() => {
        setDraggingItem(null);
        setDragOverId(null);
      }, 260);
    }
  };

  const getShiftClass = (item: GalleryItem, index: number) => {
    if (!draggingSameGroup || draggingIndex === -1 || targetIndex === -1) return "";
    if (item.id === draggingItem?.id) return "scale-[1.02] shadow-lg";
    // dragging item moving to the left
    if (draggingIndex > targetIndex) {
      if (index >= targetIndex && index < draggingIndex) return "translate-x-3";
    }
    // dragging item moving to the right
    if (draggingIndex < targetIndex) {
      if (index > draggingIndex && index <= targetIndex) return "-translate-x-3";
    }
    return "";
  };

  const uploadImages = async (fileList: FileList | File[]) => {
    if (!product) return;
    const accepted = Array.from(fileList instanceof FileList ? Array.from(fileList) : fileList).filter((file) => {
      if (file.type) return file.type.startsWith("image/");
      return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
    });
    if (accepted.length === 0) {
      toast.error("Prevuci ili izaberi fajlove tipa slike.");
      return;
    }

    setIsUploadingImages(true);
    const additions: (ProductImage & { url?: string | null })[] = [];
    try {
      for (const file of accepted) {
        const uploadUrl = await generateUploadUrl({ token: sessionToken });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error("Upload nije uspeo.");
        }
        const { storageId } = await response.json();
        additions.push({
          storageId,
          isMain: false,
          fileName: file.name,
          contentType: file.type,
          publishFb: true,
          publishIg: true,
          url: URL.createObjectURL(file),
        });
      }

      await applyUpdate(
        (current) => {
          const baseImages = current.images ?? [];
          const merged = ensureMainImage([...baseImages, ...additions]);
          return { ...current, images: merged };
        },
        "Slike dodate.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje slika nije uspelo.");
      throw error;
    } finally {
      setIsUploadingImages(false);
    }
  };
  const isFileDrag = (event: { dataTransfer?: DataTransfer | null }) => {
    const types = event.dataTransfer?.types;
    const items = event.dataTransfer?.items;
    if (!types) return false;
    const hasFiles = Array.from(types).includes("Files");
    if (!hasFiles) return false;
    return Array.from(items ?? []).some((item) => item.kind === "file");
  };

  const handleGalleryDropZoneDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsGalleryDropActive(true);
  };

  const handleGalleryDropZoneDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (!isGalleryDropActive) {
      setIsGalleryDropActive(true);
    }
  };

  const handleGalleryDropZoneDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) return;
    setIsGalleryDropActive(false);
  };

  const handleGalleryDropZoneDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsGalleryDropActive(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await uploadImages(files);
    }
  };

  const handleAdDropZoneDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsAdDropActive(true);
  };

  const handleAdDropZoneDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (!isAdDropActive) {
      setIsAdDropActive(true);
    }
  };

  const handleAdDropZoneDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) return;
    setIsAdDropActive(false);
  };

  const handleAdDropZoneDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsAdDropActive(false);
    if (isUploadingAdImage) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadImages(files);
    event.target.value = "";
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      toast.error("Preuzimanje nije uspelo.");
    }
  };

  const gallery: GalleryItem[] = useMemo(() => {
    if (!product) return [];
    const baseImages =
      product.images?.map((image) => ({
        id: image.storageId,
        storageId: image.storageId,
        url: image.url ?? "",
        alt: product.kpName ?? product.name,
        label: image.isMain ? "Glavna" : "Slika",
        fileName: image.fileName,
        isMain: Boolean(image.isMain),
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
        origin: { type: "product" } as const,
      })) ?? [];
    const variantImages =
      product.variants?.flatMap((variant) =>
        (variant.images ?? []).map((image) => ({
          id: `${variant.id}-${image.storageId}`,
          storageId: image.storageId,
          url: image.url ?? "",
          alt: `${variant.label}`,
          label: variant.label,
          fileName: image.fileName,
          isMain: Boolean(image.isMain),
          publishFb: image.publishFb ?? true,
          publishIg: image.publishIg ?? true,
        origin: { type: "variant" as const, variantId: variant.id },
      })),
    ) ?? [];
    return [...baseImages, ...variantImages].filter((item) => Boolean(item.url));
  }, [product]);
  const openLightbox = useCallback(
    (targetId?: string) => {
      if (!gallery.length) return;
      const items: LightboxItem[] = gallery
        .map((item) => ({
          id: item.id,
          url: item.url,
          alt: item.alt || item.label,
        }))
        .filter((item) => Boolean(item.url));
      if (items.length === 0) return;
      const startIndex =
        targetId && items.some((item) => item.id === targetId)
          ? items.findIndex((item) => item.id === targetId)
          : 0;
      setImageLightbox({ items, index: startIndex < 0 ? 0 : startIndex });
    },
    [gallery],
  );
  const handleOpenPreview = useCallback(
    (item: GalleryItem) => {
      if (!item.url) return;
      openLightbox(item.id);
    },
    [openLightbox],
  );
  const handleCloseLightbox = useCallback(() => setImageLightbox(null), []);
  const handleStepLightbox = useCallback((direction: 1 | -1) => {
    setImageLightbox((prev) => {
      if (!prev || prev.items.length === 0) return prev;
      const nextIndex = (prev.index + direction + prev.items.length) % prev.items.length;
      return { ...prev, index: nextIndex };
    });
  }, []);
  useEffect(() => {
    if (!imageLightbox) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseLightbox();
      } else if (event.key === "ArrowRight") {
        handleStepLightbox(1);
      } else if (event.key === "ArrowLeft") {
        handleStepLightbox(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseLightbox, handleStepLightbox, imageLightbox]);
  const draggingIndex = useMemo(
    () => (draggingItem ? gallery.findIndex((item) => item.id === draggingItem.id) : -1),
    [draggingItem, gallery],
  );
  const targetIndex = useMemo(
    () => (dragOverId ? gallery.findIndex((item) => item.id === dragOverId) : -1),
    [dragOverId, gallery],
  );
  const draggingSameGroup =
    draggingItem && dragOverId && targetIndex !== -1
      ? isSameGalleryGroup(draggingItem, gallery[targetIndex])
      : false;
  const baseNabavnaIsReal = product?.nabavnaCenaIsReal ?? true;
  const hasVariants = (product?.variants ?? []).length > 0;
  const showGalleryDropOverlay = isGalleryDropActive && !isTouchDevice;
  const showAdDropOverlay = isAdDropActive && !isTouchDevice;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Ucitavanje proizvoda...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2" onClick={() => router.push("/proizvodi")}>
          <ArrowLeft className="h-4 w-4" />
          Nazad na proizvode
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-slate-600">Proizvod nije pronadjen.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" className="gap-2" onClick={() => router.push("/proizvodi")}>
          <ArrowLeft className="h-4 w-4" />
          Nazad na listu
        </Button>
        <Badge variant="blue">ID: {product._id}</Badge>
        <Badge variant="green">Azurirano: {formatDate(product.updatedAt)}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Galerija slika
                <Badge variant="default">{gallery.length}</Badge>
              </CardTitle>
              <p className="text-sm text-slate-500">Kreativan grid sa slikama proizvoda i tipova.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={uploadInputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFilesSelected}
                disabled={isUploadingImages}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isUploadingImages}
                onClick={() => document.getElementById(uploadInputId)?.click()}
              >
                <Plus className="h-4 w-4" />
                {isUploadingImages ? "Dodavanje..." : "Dodaj slike"}
              </Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={handleRemoveAllImages}>
                <Trash2 className="h-4 w-4" />
                Obrisi sve slike
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`relative rounded-xl border border-transparent transition ${
                showGalleryDropOverlay ? "border-2 border-dashed border-blue-300 bg-blue-50/60" : ""
              }`}
              onDragEnter={handleGalleryDropZoneDragEnter}
              onDragOver={handleGalleryDropZoneDragOver}
              onDragLeave={handleGalleryDropZoneDragLeave}
              onDrop={handleGalleryDropZoneDrop}
            >
              {showGalleryDropOverlay ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-blue-100/80 backdrop-blur-sm">
                  <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow">
                    <UploadCloud className="h-4 w-4" />
                    <span>Otpusti da dodas slike</span>
                  </div>
                </div>
              ) : null}
              {gallery.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-slate-500">
                  <ImageOff className="h-8 w-8" />
                  <p className="text-sm">Trenutno nema slika za ovaj proizvod.</p>
                  <p className="text-xs text-slate-500">Prevuci fotografije ovde ili klikni na dugme iznad.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {gallery.map((item, index) => {
                  const shiftClass = getShiftClass(item, index);
                  const isDragOver = dragOverId === item.id && draggingSameGroup;
                  const fbActive = item.publishFb ?? true;
                  const igActive = item.publishIg ?? true;
                  const groupItems = getGalleryGroup(item);
                  const position = groupItems.findIndex((candidate) => candidate.id === item.id);
                  const currentPosition = position >= 0 ? position + 1 : 1;
                  const totalInGroup = groupItems.length || 1;
                  const isReorderEditing = reorderEditingId === item.id;
                  return (
                    <div
                      key={item.id}
                      data-gallery-id={item.id}
                      className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-200 hover:shadow-md ${shiftClass} ${
                        isDragOver ? "ring-1 ring-blue-200" : ""
                      }`}
                      draggable
                      onDragStart={(event) => handleGalleryDragStart(event, item)}
                      onDragOver={(event) => handleGalleryDragOver(event, item)}
                      onDrop={(event) => handleGalleryDrop(event, item)}
                      onDragEnd={handleGalleryDragEnd}
                      onDragLeave={() => handleGalleryDragLeave(item)}
                      onTouchStart={(event) => handleGalleryTouchStart(event, item)}
                      onTouchMove={handleGalleryTouchMove}
                      onTouchEnd={handleGalleryTouchEnd}
                      onTouchCancel={handleGalleryTouchCancel}
                      onClick={() => {
                        if (touchDragActiveRef.current) return;
                        handleOpenPreview(item);
                      }}
                    >
                      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                          title="Otvori pregled"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenPreview(item);
                          }}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                          title="Preuzmi sliku"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDownloadImage(item.url, item.fileName ?? `${item.id}.jpg`);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                            item.isMain
                              ? "bg-emerald-50 text-emerald-700 shadow-[0_1px_0_rgba(16,185,129,0.25)]"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          disabled={item.isMain}
                          title={item.isMain ? "Vec je glavna" : "Postavi kao glavnu"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetAsMain(item);
                          }}
                        >
                          Glavna
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-slate-100 hover:text-red-600"
                          title="Obrisi sliku"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveSingleImage(item);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] group-hover:brightness-95"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                          <Maximize2 className="h-4 w-4" />
                          <span>Povecaj</span>
                        </div>
                      </div>
                      <div className="absolute left-2 top-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        <GripVertical className="h-3 w-3 text-slate-500" />
                        {item.label}
                      </div>
                      <div className="absolute left-2 bottom-2 z-10 flex gap-1">
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                            fbActive
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-white/90 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                          }`}
                          title={fbActive ? "Ukloni iz FB objave" : "Uključi u FB objavu"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleImagePublishToggle(item, "publishFb", !fbActive);
                          }}
                        >
                          <Facebook className="h-3.5 w-3.5" />
                          FB
                        </button>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                            igActive
                              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                              : "bg-white/90 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                          }`}
                          title={igActive ? "Ukloni iz IG objave" : "Uključi u IG objavu"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleImagePublishToggle(item, "publishIg", !igActive);
                          }}
                        >
                          <Instagram className="h-3.5 w-3.5" />
                          IG
                        </button>
                      </div>
                      <div className="absolute bottom-2 right-2 z-10">
                        <div
                          className={`flex items-center gap-1 overflow-hidden rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-300 ${
                            isReorderEditing ? "w-36" : "w-auto"
                          }`}
                        >
                          {isReorderEditing ? (
                            <>
                              <input
                                type="number"
                                min={1}
                                max={totalInGroup}
                                value={reorderInputValue}
                                onChange={(event) => setReorderInputValue(event.target.value)}
                                className="h-8 w-14 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void handleConfirmReorderInput(item);
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleCancelReorderInput();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-2 text-white transition hover:bg-blue-700"
                                title="Promeni redosled"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleConfirmReorderInput(item);
                                }}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 items-center justify-center rounded-md px-2 text-slate-500 transition hover:text-slate-800"
                                title="Zatvori"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCancelReorderInput();
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-white transition hover:bg-slate-900"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenReorderInput(item);
                              }}
                              title="Promeni poziciju slike"
                            >
                              <GripVertical className="h-3 w-3 text-white/80" />
                              #{currentPosition}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Glavna slika za drustvene mreze
                {product.adImage ? <Badge variant="green">Postavljena</Badge> : <Badge variant="default">Nije dodata</Badge>}
              </CardTitle>
              <p className="text-sm text-slate-500">Fotografija koja ide kao prva na FB / Instagram oglasima.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={adUploadInputId}
                ref={adImageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAdImageChange}
                disabled={isUploadingAdImage}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isUploadingAdImage}
                onClick={() => document.getElementById(adUploadInputId)?.click()}
              >
                <UploadCloud className="h-4 w-4" />
                {isUploadingAdImage ? "Dodavanje..." : "Dodaj glavnu sliku"}
              </Button>
              {product.adImage ? (
                <Button variant="ghost" size="sm" className="gap-2 text-red-600" onClick={handleRemoveAdImage}>
                  <Trash2 className="h-4 w-4" />
                  Obrisi glavnu sliku
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`relative rounded-xl border border-transparent transition ${
                showAdDropOverlay ? "border-2 border-dashed border-blue-300 bg-blue-50/60" : ""
              }`}
              onDragEnter={handleAdDropZoneDragEnter}
              onDragOver={handleAdDropZoneDragOver}
              onDragLeave={handleAdDropZoneDragLeave}
              onDrop={handleAdDropZoneDrop}
            >
              {showAdDropOverlay ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-blue-100/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow">
                    <UploadCloud className="h-4 w-4" />
                    <span>Otpusti da postavis glavnu</span>
                  </div>
                </div>
              ) : null}
              {product.adImage ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.adImage.url ?? ""}
                    alt="Glavna slika za drustvene mreze"
                    className="h-[260px] w-full object-cover sm:h-[320px]"
                  />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                    <Tag className="h-3 w-3 text-slate-500" />
                    Glavna za drustvene mreze
                  </div>
                  {product.adImage.url ? (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadImage(
                          product.adImage?.url ?? "",
                          product.adImage?.fileName ?? `${product._id}-ad.jpg`,
                        )
                      }
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100"
                    >
                      <Download className="h-4 w-4" />
                      Preuzmi
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                  <UploadCloud className="h-8 w-8" />
                  <p className="text-sm font-semibold text-slate-700">Nema glavne slike za drustvene mreze</p>
                  <p className="text-xs text-slate-500">Prevuci je ovde ili iskoristi dugme iznad.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {product.kpName ?? product.name}
                {product.variants && product.variants.length > 0 ? (
                  <Badge variant="yellow">Tipski</Badge>
                ) : (
                  <Badge variant="green">Obican</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-slate-500">Textualni podaci su editabilni na licu mesta.</p>
              <p className="text-xs text-slate-500">FB / Insta naziv: {product.name}</p>
              <div className="flex flex-wrap gap-2">
                {productCategories.length ? (
                  productCategories.map((category) => (
                    <span
                      key={category._id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                    >
                      <Tag className="h-3 w-3 text-slate-500" />
                      {category.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Nema dodeljenih kategorija.</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InlineField
                label="KP naziv (glavni)"
                value={product.kpName ?? product.name}
                onSave={(val) => handleBaseFieldSave("kpName", val)}
              />
              <InlineField label="FB / Insta naziv" value={product.name} onSave={(val) => handleBaseFieldSave("name", val)} />
              <div
                className="space-y-2"
                ref={categoryDropdownRef}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategorije</p>
                <div className="flex flex-wrap gap-2">
                  {productCategories.length === 0 ? (
                    <span className="text-xs text-slate-500">Nema dodeljenih kategorija.</span>
                  ) : (
                    productCategories.map((category) => (
                      <span
                        key={category._id}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        <Tag className="h-3 w-3 text-slate-500" />
                        {category.name}
                        <button
                          type="button"
                          className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                          onClick={() => handleRemoveCategory(category._id)}
                          title="Ukloni kategoriju"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="relative">
                  <Input
                    value={categorySearch}
                    placeholder={categories === undefined ? "Ucitavanje kategorija..." : "Pretrazi ili dodaj kategoriju"}
                    disabled={categories === undefined}
                    onChange={(event) => {
                      setCategorySearch(event.target.value);
                      setCategoryMenuOpen(true);
                    }}
                    onFocus={() => setCategoryMenuOpen(true)}
                    onClick={() => setCategoryMenuOpen(true)}
                  />
                  <input
                    ref={categoryIconInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleCategoryIconChange}
                  />
                  {categoryMenuOpen && (
                    <div
                      className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <div className="border-b border-slate-100 bg-slate-50/60">
                        {isAddingCategory ? (
                          <div className="flex items-center gap-2 px-3 py-2">
                            <div
                              className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-400"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                categoryIconInputRef.current?.click();
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={handleCategoryIconDrop}
                              title="Prevuci ili izaberi ikonicu"
                            >
                              {isUploadingCategoryIcon ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : newCategoryIcon?.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={newCategoryIcon.previewUrl} alt="Ikonica" className="h-full w-full object-cover" />
                              ) : (
                                <Tag className="h-4 w-4" />
                              )}
                            </div>
                            <Input
                              value={newCategoryName}
                              placeholder="Naziv kategorije"
                              onChange={(event) => setNewCategoryName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleCreateCategory();
                                }
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleCreateCategory();
                                }}
                                disabled={isCreatingCategory}
                                className="gap-1"
                              >
                                {isCreatingCategory ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Sacuvaj
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  resetNewCategoryState();
                                }}
                              >
                                Odustani
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsAddingCategory(true);
                            setCategoryMenuOpen(true);
                          }}
                        >
                            <Plus className="h-4 w-4" />
                            Dodaj novu kategoriju
                          </button>
                        )}
                      </div>
                      {categories === undefined ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                      ) : filteredCategories.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                      ) : (
                        filteredCategories.map((category, idx) => {
                          const isSelected = (product.categoryIds ?? []).includes(category._id);
                          const usageCount = category.productCount ?? 0;
                          return (
                            <button
                              key={category._id}
                              type="button"
                              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                              } ${isSelected ? "text-blue-700" : "text-slate-800"} hover:bg-blue-50`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectCategory(category._id);
                            }}
                          >
                              {category.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={category.iconUrl} alt={category.name} className="h-8 w-8 rounded-md object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                  <Tag className="h-4 w-4" />
                                </div>
                              )}
                            <div className="flex-1">
                              <p className="font-semibold">{category.name}</p>
                              {isSelected ? <p className="text-[11px] text-emerald-600">Izabrana</p> : null}
                              {usageCount > 0 ? (
                                <p className="text-[11px] text-amber-600">{usageCount} proizvoda vezano</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                              <span
                                role="button"
                                aria-label="Obrisi kategoriju"
                                className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setCategoryMenuOpen(false);
                                  handleRequestDeleteCategory(category);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </span>
                            </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            <InlineField
              label="Prodajna cena (EUR)"
              value={product.prodajnaCena}
              formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
              onSave={(val) => handleBaseFieldSave("prodajnaCena", val)}
            />
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nabavka</p>
                  <p className="text-xs text-slate-600">Najniza ponuda dobavljaca postaje prava nabavna cena.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={showAddSupplierForm ? "ghost" : "outline"}
                  className="gap-2"
                  onClick={() => setShowAddSupplierForm((prev) => !prev)}
                  disabled={suppliers === undefined}
                >
                  {showAddSupplierForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAddSupplierForm ? "Zatvori" : "Dodaj dobavljaca"}
                </Button>
              </div>

              {showAddSupplierForm ? (
                suppliers === undefined ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Ucitavanje dobavljaca...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Dodaj dobavljace na glavnoj listi pa ih povezi ovde.
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-blue-200 bg-white/90 px-3 py-3 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-12 md:items-end">
                      <div className="space-y-1 md:col-span-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dobavljac</p>
                        <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberi dobavljaca" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier._id} value={supplier._id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {hasVariants ? (
                        <div className="space-y-1 md:col-span-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vazi za</p>
                          <Select value={newSupplierVariantId} onValueChange={(value) => setNewSupplierVariantId(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Svi tipovi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="base">Svi tipovi</SelectItem>
                              {(product.variants ?? []).map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.label || "Tip"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      <div className={`space-y-1 ${hasVariants ? "md:col-span-3" : "md:col-span-6"}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cena (EUR)</p>
                        <Input
                          value={newSupplierPrice}
                          inputMode="decimal"
                          placeholder="npr. 10.50"
                          onChange={(event) => setNewSupplierPrice(event.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          className="w-full gap-2"
                          onClick={handleAddSupplierOffer}
                          disabled={isSavingSupplierOffer || !newSupplierId}
                        >
                          {isSavingSupplierOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Sacuvaj
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ) : null}

              {supplierOffers.length === 0 ? (
                <>
                  <InlineField
                    label="Nabavna cena (EUR)"
                    value={product.nabavnaCena}
                    formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                    onSave={(val) => handleBaseFieldSave("nabavnaCena", val)}
                  />
                  <label className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                    <div className="flex flex-col">
                      <span>{baseNabavnaIsReal ? "Prava nabavna cena" : "Procenjena nabavna cena"}</span>
                      <span className="text-xs font-normal text-slate-500">Check ako je cifra 100% sigurna.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={baseNabavnaIsReal}
                      onChange={(event) => handleBasePurchaseRealityToggle(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </>
              ) : supplierOffers.length === 1 ? (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Nabavna cena</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(supplierOffers[0].price, "EUR")}
                        </p>
                      </div>
                      {hasVariants ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          {supplierOffers[0].variantId
                            ? variantMap.get(supplierOffers[0].variantId)?.label ?? "Tip"
                            : "Svi tipovi"}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {supplierMap.get(supplierOffers[0].supplierId)?.name ?? "Dobavljac"}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSupplierOffer(supplierOffers[0])}
                        title="Ukloni ponudu"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(() => {
                    const offer = supplierOffers[0];
                    const key = supplierOfferKey(offer);
                    const editValue = supplierEdits[key] ?? String(offer.price);
                    const isChanged = parsePrice(editValue) !== offer.price;
                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          inputMode="decimal"
                          className="h-9"
                          onChange={(event) => handleSupplierPriceChange(key, event.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!isChanged}
                          onClick={() => handleSupplierPriceSave(offer)}
                        >
                          Sacuvaj
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  {supplierOffers.map((offer) => {
                    const supplierName = supplierMap.get(offer.supplierId)?.name ?? "Dobavljac";
                    const isBest = bestSupplierOffer && offer.price === bestSupplierOffer.price;
                    const key = supplierOfferKey(offer);
                    const editValue = supplierEdits[key] ?? String(offer.price);
                    const isChanged = parsePrice(editValue) !== offer.price;
                    const variantLabel = hasVariants
                      ? offer.variantId
                        ? variantMap.get(offer.variantId)?.label ?? "Tip"
                        : "Svi tipovi"
                      : null;
                    return (
                      <div
                        key={`${offer.supplierId}-${offer.variantId ?? "base"}`}
                        className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${
                          isBest
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{supplierName}</span>
                            {variantLabel ? (
                              <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                {variantLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{formatCurrency(offer.price, "EUR")}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSupplierOffer(offer)}
                              title="Ukloni ponudu"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            value={editValue}
                            inputMode="decimal"
                            className="h-9"
                            onChange={(event) => handleSupplierPriceChange(key, event.target.value)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!isChanged}
                            onClick={() => handleSupplierPriceSave(offer)}
                          >
                            Sacuvaj
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[240px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishKp)}
                  onChange={(event) => handlePublishToggle("publishKp", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/kp.png" alt="KP" className="h-28 w-28 object-cover" />
                        </span> 
                  <span className="text-sm font-semibold text-slate-800">KupujemProdajem</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishFb)}
                  onChange={(event) => handlePublishToggle("publishFb", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span>Alati Mašine</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishFbProfile)}
                  onChange={(event) => handlePublishToggle("publishFbProfile", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span>Kod Majstora</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishIg)}
                  onChange={(event) => handlePublishToggle("publishIg", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-sm">
                    <Instagram className="h-4 w-4" />
                  </span>
                  <span>kod.majstora</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishMarketplace)}
                  onChange={(event) => handlePublishToggle("publishMarketplace", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span>Marketplace</span>
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.pickupAvailable)}
                  onChange={(event) => handlePublishToggle("pickupAvailable", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Lično preuzimanje
              </label>
            </div>
          </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  onClick={() => publishNow("facebook")}
                  disabled={publishing !== null}
                >
                  {publishing === "facebook" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Facebook className="h-4 w-4" />
                  )}
                  {publishing === "facebook" ? "Objavljivanje..." : "Okaci na Facebook"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => publishNow("instagram")}
                  disabled={publishing !== null}
                >
                  {publishing === "instagram" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Instagram className="h-4 w-4" />
                  )}
                  {publishing === "instagram" ? "Objavljivanje..." : "Okaci na Instagram"}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Kreirano</p>
                  <p className="font-medium text-slate-800">{formatDate(product.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Azurirano</p>
                  <p className="font-medium text-slate-800">{formatDate(product.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Opisi proizvoda</CardTitle>
              <p className="text-sm text-slate-500">Posebni tekstovi za KupujemProdajem i drustvene mreze.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <InlineField
                label="KupujemProdajem opis"
                value={product.opisKp ?? ""}
                multiline
                onSave={(val) => handleBaseFieldSave("opisKp", val)}
              />
              <InlineField
                label="FB / Insta opis"
                value={product.opisFbInsta ?? product.opis ?? ""}
                multiline
                onSave={(val) => handleBaseFieldSave("opisFbInsta", val)}
              />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">Tipovi proizvoda</CardTitle>
            <p className="text-sm text-slate-500">
              Edit dugme otvara input sa selektovanim tekstom, copy kopira vrednost polja.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={isAddingVariant ? "ghost" : "outline"}
            className="gap-2"
            onClick={isAddingVariant ? handleCancelAddVariant : handleStartAddVariant}
            disabled={isSavingVariant}
          >
            {isAddingVariant ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAddingVariant ? "Zatvori" : "Dodaj tip"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAddingVariant ? (
            <div className="space-y-4 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Naziv tipa</p>
                  <Input
                    value={newVariantLabel}
                    onChange={(event) => setNewVariantLabel(event.target.value)}
                    placeholder="npr. 18V bez baterije"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prodajna cena (EUR)</p>
                  <Input
                    value={newVariantProdajna}
                    onChange={(event) => setNewVariantProdajna(event.target.value)}
                    placeholder="Prodajna cena"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nabavna cena (EUR)</p>
                  <Input
                    value={newVariantNabavna}
                    onChange={(event) => setNewVariantNabavna(event.target.value)}
                    placeholder="Nabavna cena"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Opis tipa (opciono)
                  </p>
                  <Textarea
                    autoResize
                    rows={3}
                    value={newVariantOpis}
                    onChange={(event) => setNewVariantOpis(event.target.value)}
                    placeholder="Kratak opis koji razlikuje ovaj tip."
                  />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                  <div className="flex flex-col">
                    <span>{newVariantNabavnaIsReal ? "Prava nabavna cena" : "Procenjena nabavna cena"}</span>
                    <span className="text-xs font-normal text-slate-500">Check ako je cifra 100% sigurna.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newVariantNabavnaIsReal}
                    onChange={(event) => setNewVariantNabavnaIsReal(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                  <div className="flex flex-col">
                    <span>Postavi kao glavni tip</span>
                    <span className="text-xs font-normal text-slate-500">
                      Glavni tip se koristi za KP i kalkulacije.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newVariantIsDefault || !hasVariants}
                    onChange={(event) => setNewVariantIsDefault(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    disabled={!hasVariants}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="gap-2" onClick={handleCreateVariant} disabled={isSavingVariant}>
                  {isSavingVariant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Sacuvaj tip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAddVariant}
                  disabled={isSavingVariant}
                >
                  Odustani
                </Button>
              </div>
            </div>
          ) : null}
          {(product.variants ?? []).length === 0 ? (
            isAddingVariant ? null : (
              <p className="text-sm text-slate-600">
                Ovaj proizvod nema dodatne tipove. Dodaj prvi tip da ga pretvoris u tipski.
              </p>
            )
          ) : (
            product.variants?.map((variant) => {
              const variantNabavnaIsReal =
                variant.nabavnaCenaIsReal ?? product.nabavnaCenaIsReal ?? baseNabavnaIsReal;
              return (
                <div
                  key={variant.id}
                  className="rounded-lg border border-slate-200/80 bg-white/60 p-3 shadow-sm shadow-slate-100"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant.isDefault ? "green" : "default"}>
                        {variant.isDefault ? "Glavni tip" : "Tip"}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-800">{variant.label}</span>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-slate-400">ID: {variant.id}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <InlineField
                      label="Naziv tipa"
                      value={variant.label}
                      onSave={(val) => handleVariantFieldSave(variant.id, "label", val)}
                    />
                    <InlineField
                      label="Prodajna cena (EUR)"
                      value={variant.prodajnaCena}
                      formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                      onSave={(val) => handleVariantFieldSave(variant.id, "prodajnaCena", val)}
                    />
                    <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
                      <InlineField
                        label="Nabavna cena (EUR)"
                        value={variant.nabavnaCena}
                        formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                        onSave={(val) => handleVariantFieldSave(variant.id, "nabavnaCena", val)}
                      />
                      <label className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                        <span>{variantNabavnaIsReal ? "Prava nabavna" : "Procenjena nabavna"}</span>
                        <input
                          type="checkbox"
                          checked={variantNabavnaIsReal}
                          onChange={(event) => handleVariantPurchaseRealityToggle(variant.id, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <InlineField
                        label="Opis tipa"
                        value={variant.opis ?? ""}
                        multiline
                        onSave={(val) => handleVariantFieldSave(variant.id, "opis", val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(categoryToDelete)} onOpenChange={(open) => (!open ? setCategoryToDelete(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obrisi kategoriju</DialogTitle>
            <DialogDescription>
              {categoryToDelete?.productCount && categoryToDelete.productCount > 0
                ? `Kategorija "${categoryToDelete.name}" je vezana za ${categoryToDelete.productCount} proizvoda. Brisanjem ce biti uklonjena sa svih.`
                : `Obrisi kategoriju "${categoryToDelete?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete?.productCount && categoryToDelete.productCount > 0 ? (
            <div className="flex items-start gap-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ova kategorija je dodeljena na {categoryToDelete.productCount} proizvod
                {categoryToDelete.productCount === 1 ? "" : "a"}. Potvrdom ce biti skinuta sa svih proizvoda i obrisana.
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setCategoryToDelete(null)} disabled={isDeletingCategory}>
              Odustani
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDeleteCategory} disabled={isDeletingCategory}>
              {isDeletingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Obrisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageLightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleCloseLightbox}
        >
          {imageLightbox.items.length > 1 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStepLightbox(-1);
                }}
                aria-label="Prethodna slika"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStepLightbox(1);
                }}
                aria-label="Sledeca slika"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          ) : null}
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/40 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-white/80">
              <span>
                {imageLightbox.index + 1} / {imageLightbox.items.length}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCloseLightbox();
                }}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow"
              >
                Zatvori
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageLightbox.items[imageLightbox.index]?.url}
              alt={imageLightbox.items[imageLightbox.index]?.alt ?? "Pregled slike"}
              className="mx-auto max-h-[82vh] w-auto rounded-xl object-contain"
              onClick={(event) => {
                event.stopPropagation();
                if (imageLightbox.items.length > 1) {
                  handleStepLightbox(1);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
