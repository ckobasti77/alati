"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  Facebook,
  Images,
  Instagram,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Share2,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency } from "@/lib/format";
import type { Category, InboxImage, Product, ProductStats, Supplier } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";

const parsePrice = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return NaN;
  return Number(normalized);
};

const priceField = (label: string) =>
  z
    .string({ required_error: `${label} je obavezna.` })
    .trim()
    .min(1, `${label} je obavezna.`)
    .refine((value) => {
      const parsed = parsePrice(value);
      return Number.isFinite(parsed) && parsed >= 0;
    }, `${label} mora biti broj veci ili jednak nuli.`);

const variantSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Naziv tipa je obavezan."),
  nabavnaCena: priceField("Nabavna cena"),
  nabavnaCenaIsReal: z.boolean().optional(),
  prodajnaCena: priceField("Prodajna cena"),
  opis: z.string().optional(),
  isDefault: z.boolean(),
});

const supplierOfferSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string({ required_error: "Dobavljac je obavezan." }).min(1, "Dobavljac je obavezan."),
  price: priceField("Cena dobavljaca"),
  variantId: z.string().optional(),
});

const productSchema = z
  .object({
    productType: z.enum(["single", "variant"]),
    kpName: z.string().min(2, "KP naziv je obavezan."),
    name: z.string().min(2, "FB / Insta naziv je obavezan."),
    nabavnaCena: priceField("Nabavna cena"),
    nabavnaCenaIsReal: z.boolean().optional(),
    prodajnaCena: priceField("Prodajna cena"),
    categoryIds: z.array(z.string()).optional(),
    supplierOffers: z.array(supplierOfferSchema).optional(),
    opisKp: z.string().optional(),
    opisFbInsta: z.string().optional(),
    publishKp: z.boolean().optional(),
    publishFb: z.boolean().optional(),
    publishIg: z.boolean().optional(),
    publishFbProfile: z.boolean().optional(),
    publishMarketplace: z.boolean().optional(),
    pickupAvailable: z.boolean().optional(),
    variants: z.array(variantSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.productType !== "variant") return;
    const variants = data.variants ?? [];
    if (variants.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dodaj bar jedan tip za tipski proizvod.",
        path: ["variants"],
      });
      return;
    }
    if (!variants.some((variant) => variant.isDefault)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Oznaci bar jedan tip kao glavni.",
        path: ["variants"],
      });
    }
  });

type ProductFormValues = z.infer<typeof productSchema>;

type VariantFormEntry = z.infer<typeof variantSchema>;

type SupplierOfferFormEntry = z.infer<typeof supplierOfferSchema>;

type DraftImage = {
  storageId: string;
  url?: string | null;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: number;
  publishFb?: boolean;
  publishIg?: boolean;
  isMain: boolean;
};

type DraftCategoryIcon = {
  storageId: string;
  previewUrl?: string;
  fileName?: string;
  contentType?: string;
};

type DraftAdImage = {
  storageId: string;
  url?: string | null;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: number;
};

type SocialPlatform = "facebook" | "instagram";

type SortOption = "created_desc" | "price_desc" | "price_asc" | "sales_desc" | "profit_desc";

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const createVariantFormEntry = (
  options: { isDefault?: boolean; label?: string; nabavnaCena?: string; prodajnaCena?: string; opis?: string } = {},
) => ({
  id: generateId(),
  label: options.label ?? "",
  nabavnaCena: options.nabavnaCena ?? "",
  nabavnaCenaIsReal: true,
  prodajnaCena: options.prodajnaCena ?? "",
  opis: options.opis ?? "",
  isDefault: options.isDefault ?? false,
});

type NormalizedSupplierOffer = {
  supplierId: string;
  price: number;
  variantId?: string;
};

const normalizeSupplierOffersInput = (
  offers: SupplierOfferFormEntry[] = [],
  variants: VariantFormEntry[] = [],
  includeVariants = false,
): NormalizedSupplierOffer[] => {
  const allowedVariantIds = new Set(includeVariants ? variants.map((variant) => variant.id) : []);
  const seen = new Set<string>();
  const normalized: NormalizedSupplierOffer[] = [];

  offers.forEach((offer) => {
    const supplierId = offer.supplierId?.trim();
    if (!supplierId) return;
    const price = parsePrice(offer.price);
    if (!Number.isFinite(price) || price < 0) return;
    const variantId = includeVariants && offer.variantId && allowedVariantIds.has(offer.variantId) ? offer.variantId : undefined;
    const key = `${supplierId}-${variantId ?? "base"}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({ supplierId, price, variantId });
  });

  return normalized;
};

const pickBestSupplierOffer = (offers: NormalizedSupplierOffer[], variantId?: string) => {
  if (!offers.length) return null;
  const exact = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
  const fallback = offers.filter((offer) => !offer.variantId);
  const pool = exact.length > 0 ? exact : fallback;
  if (!pool.length) return null;
  let best: { supplierId: string; price: number } | null = null;
  pool.forEach((offer) => {
    if (best === null || offer.price < best.price) {
      best = { supplierId: offer.supplierId, price: offer.price };
    }
  });
  return best;
};

const emptyProductForm = (): ProductFormValues => ({
  productType: "single",
  kpName: "",
  name: "",
  nabavnaCena: "",
  nabavnaCenaIsReal: true,
  prodajnaCena: "",
  supplierOffers: [],
  categoryIds: [],
  opisKp: "",
  opisFbInsta: "",
  publishKp: false,
  publishFb: false,
  publishIg: false,
  publishFbProfile: false,
  publishMarketplace: false,
  pickupAvailable: false,
  variants: [],
});

const productFocusOrder: (keyof ProductFormValues)[] = ["kpName", "name", "nabavnaCena", "prodajnaCena", "opisKp", "opisFbInsta"];
const variantFocusOrder: (keyof VariantFormEntry)[] = ["label", "nabavnaCena", "prodajnaCena", "opis"];

export default function ProductsPage() {
  return (
    <RequireAuth>
      <ProductsContent />
    </RequireAuth>
  );
}

function ProductsContent() {
  const router = useRouter();
  const { token } = useAuth();
  const sessionToken = token as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [variantImages, setVariantImages] = useState<Record<string, DraftImage[]>>({});
  const [adImage, setAdImage] = useState<DraftAdImage | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt?: string } | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isAdDragActive, setIsAdDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isMobile, setIsMobile] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<DraftCategoryIcon | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const [hasSeededCategories, setHasSeededCategories] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [hasSeededSuppliers, setHasSeededSuppliers] = useState(false);
  const [isUploadingInboxImages, setIsUploadingInboxImages] = useState(false);
  const [inboxPreviewIndex, setInboxPreviewIndex] = useState<number | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const variantUploadInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const productUploadInputRef = useRef<HTMLInputElement | null>(null);
  const adImageInputRef = useRef<HTMLInputElement | null>(null);
  const inboxUploadInputRef = useRef<HTMLInputElement | null>(null);
  const categoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const dialogScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputId = useMemo(() => `product-images-${generateId()}`, []);
  const adUploadInputId = useMemo(() => `ad-image-${generateId()}`, []);
  const hiddenFileInputStyle = useMemo<CSSProperties>(
    () => ({ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, opacity: 0 }),
    [],
  );
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const productStats = useConvexQuery<ProductStats[]>("products:stats", { token: sessionToken });
  const createProduct = useConvexMutation("products:create");
  const updateProduct = useConvexMutation("products:update");
  const removeProduct = useConvexMutation<{ id: string; token: string }>("products:remove");
  const categories = useConvexQuery<Category[]>("categories:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
  const inboxImages = useConvexQuery<InboxImage[]>("inboxImages:list", { token: sessionToken });
  const createCategory = useConvexMutation<
    {
      token: string;
      name: string;
      icon?: { storageId: string; fileName?: string; contentType?: string };
    },
    string
  >("categories:create");
  const ensureDefaultCategories = useConvexMutation<{ token: string }, { created: number }>("categories:ensureDefaults");
  const createSupplier = useConvexMutation<{ token: string; name: string }, string>("suppliers:create");
  const removeSupplier = useConvexMutation<{ token: string; id: string }>("suppliers:remove");
  const ensureDefaultSuppliers = useConvexMutation<{ token: string }, { created: number }>("suppliers:ensureDefaults");
  const addInboxImage = useConvexMutation<{
    token: string;
    storageId: string;
    fileName?: string;
    contentType?: string;
    uploadedAt?: number;
  }>("inboxImages:add");
  const deleteInboxImage = useConvexMutation<{ token: string; id: string }>("inboxImages:remove");
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm(),
    mode: "onBlur",
  });
  useEffect(() => {
    form.register("productType");
    form.register("supplierOffers");
  }, [form]);
  const productType = useWatch({ control: form.control, name: "productType" }) as ProductFormValues["productType"];
  const variants = (useWatch({ control: form.control, name: "variants" }) ?? []) as VariantFormEntry[];
  const categoryIds = (useWatch({ control: form.control, name: "categoryIds" }) ?? []) as string[];
  const supplierOffersField =
    (useWatch({ control: form.control, name: "supplierOffers" }) ?? []) as SupplierOfferFormEntry[];
  const publishFbSelected = Boolean(useWatch({ control: form.control, name: "publishFb" }));
  const publishIgSelected = Boolean(useWatch({ control: form.control, name: "publishIg" }));
  const resolvedProductType = productType ?? "single";
  const normalizedVariants = resolvedProductType === "variant" && Array.isArray(variants) ? variants : [];
  const normalizedSupplierOffers = useMemo(
    () => normalizeSupplierOffersInput(supplierOffersField, normalizedVariants, resolvedProductType === "variant"),
    [supplierOffersField, normalizedVariants, resolvedProductType],
  );
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const bestSupplierForVariant = useCallback(
    (variantId?: string) => pickBestSupplierOffer(normalizedSupplierOffers, variantId),
    [normalizedSupplierOffers],
  );
  const hasSupplierOffers = supplierOffersField.length > 0;

  useEffect(() => {
    if (hasSeededCategories) return;
    if (categories === undefined) return;
    if (categories.length > 0) return;
    setHasSeededCategories(true);
    ensureDefaultCategories({ token: sessionToken }).catch((error) => {
      console.error(error);
      setHasSeededCategories(false);
    });
  }, [categories, ensureDefaultCategories, hasSeededCategories, sessionToken]);

  useEffect(() => {
    if (hasSeededSuppliers) return;
    if (suppliers === undefined) return;
    if (suppliers.length > 0) return;
    setHasSeededSuppliers(true);
    ensureDefaultSuppliers({ token: sessionToken }).catch((error) => {
      console.error(error);
      setHasSeededSuppliers(false);
    });
  }, [ensureDefaultSuppliers, hasSeededSuppliers, sessionToken, suppliers]);

  useEffect(() => {
    const media = typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)") : null;
    if (!media) return;
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  useEffect(() => {
    if (supplierOffersField.length > 0) {
      setShowSupplierForm(true);
    } else {
      setShowSupplierForm(false);
    }
  }, [supplierOffersField.length]);

  const resetForm = () => {
    form.reset(emptyProductForm());
    setImages((previous) => {
      previous.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return [];
    });
    setVariantImages((previous) => {
      Object.values(previous).forEach((list) =>
        list.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        }),
      );
      return {};
    });
    if (adImage?.previewUrl) {
      URL.revokeObjectURL(adImage.previewUrl);
    }
    setAdImage(null);
    variantUploadInputsRef.current = {};
    setEditingProduct(null);
    setIsDraggingFiles(false);
    setIsAdDragActive(false);
    setCategorySearch("");
    setCategoryMenuOpen(false);
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (newCategoryIcon?.previewUrl) {
      URL.revokeObjectURL(newCategoryIcon.previewUrl);
    }
    setNewCategoryIcon(null);
    setIsUploadingCategoryIcon(false);
    setIsUploadingAdImage(false);
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const buildImagePayload = (list: DraftImage[] = []) => {
    if (list.length === 0) return [];
    let hasMain = list.some((image) => image.isMain);
    return list.map((image, index) => {
      const isMain = hasMain ? image.isMain : index === 0;
      if (!hasMain && index === 0) {
        hasMain = true;
      }
      return {
        storageId: image.storageId,
        isMain,
        fileName: image.fileName,
        contentType: image.fileType,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
        uploadedAt: image.uploadedAt,
      };
    });
  };

  const buildAdImagePayload = (image: DraftAdImage | null) => {
    if (!image) return null;
    return {
      storageId: image.storageId,
      fileName: image.fileName,
      contentType: image.fileType,
      uploadedAt: image.uploadedAt,
    };
  };

  const publishToSocial = useCallback(
    async (productId: string, options: { publishFb: boolean; publishIg: boolean }) => {
      if (!sessionToken) {
        toast.error("Nedostaje token za objavu na mrezama.");
        return;
      }
      const targets: SocialPlatform[] = [];
      if (options.publishFb) targets.push("facebook");
      if (options.publishIg) targets.push("instagram");
      for (const platform of targets) {
        try {
          const response = await fetch("/api/social", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform,
              productId,
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
        } catch (error) {
          console.error(error);
          toast.error(
            platform === "facebook"
              ? "Objava na Facebook nije uspela."
              : "Objava na Instagram nije uspela.",
          );
        }
      }
    },
    [sessionToken],
  );

  const handleSubmit = async (values: ProductFormValues) => {
    const isVariantProduct = values.productType === "variant";
    const baseNabavna = parsePrice(values.nabavnaCena);
    const baseNabavnaIsReal = values.nabavnaCenaIsReal ?? true;
    const baseProdajna = parsePrice(values.prodajnaCena);
    const variantEntries = (values.variants ?? []) as VariantFormEntry[];
    const normalizedOffers = normalizeSupplierOffersInput(
      (values.supplierOffers ?? []) as SupplierOfferFormEntry[],
      variantEntries,
      isVariantProduct,
    );
    const resolveBestOffer = (variantId?: string) => pickBestSupplierOffer(normalizedOffers, variantId);
    const variants =
      isVariantProduct && variantEntries.length > 0
        ? variantEntries.map((variant, index) => {
            const imagesForVariant = variantImages[variant.id] ?? [];
            const mappedImages = buildImagePayload(imagesForVariant);
            const bestOffer = resolveBestOffer(variant.id);
            const nabavnaCena = bestOffer?.price ?? parsePrice(variant.nabavnaCena);
            return {
              id: variant.id || generateId(),
              label: variant.label.trim() || `Tip ${index + 1}`,
              nabavnaCena,
              nabavnaCenaIsReal: bestOffer ? true : variant.nabavnaCenaIsReal ?? true,
              prodajnaCena: parsePrice(variant.prodajnaCena),
              opis: variant.opis?.trim() ? variant.opis.trim() : undefined,
              isDefault: variant.isDefault,
              images: mappedImages.length ? mappedImages : undefined,
            };
          })
        : undefined;
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const bestOfferForProduct = resolveBestOffer(defaultVariant?.id);
    const fbName = values.name.trim();
    const kpName = values.kpName.trim() || fbName;
    const payload = {
      token: sessionToken,
      name: fbName,
      kpName,
      nabavnaCena: bestOfferForProduct?.price ?? defaultVariant?.nabavnaCena ?? baseNabavna,
      nabavnaCenaIsReal:
        bestOfferForProduct?.price !== undefined
          ? true
          : values.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? baseNabavnaIsReal,
      prodajnaCena: defaultVariant?.prodajnaCena ?? baseProdajna,
      opisKp: values.opisKp?.trim() ? values.opisKp.trim() : undefined,
      opisFbInsta: values.opisFbInsta?.trim() ? values.opisFbInsta.trim() : undefined,
      publishKp: Boolean(values.publishKp),
      publishFb: Boolean(values.publishFb),
      publishIg: Boolean(values.publishIg),
      publishFbProfile: Boolean(values.publishFbProfile),
      publishMarketplace: Boolean(values.publishMarketplace),
      pickupAvailable: Boolean(values.pickupAvailable),
      categoryIds: (values.categoryIds ?? []).filter(Boolean),
      images: buildImagePayload(images),
      variants,
      supplierOffers: normalizedOffers.length ? normalizedOffers : undefined,
      adImage: buildAdImagePayload(adImage),
    };

    try {
      if (editingProduct) {
        await updateProduct({
          id: editingProduct._id,
          expectedUpdatedAt: editingProduct.updatedAt ?? Date.now(),
          updatedAt: Date.now(),
          ...payload,
        });
        toast.success("Proizvod je azuriran.");
      } else {
        const productId = await createProduct(payload);
        toast.success("Proizvod je dodat.");
        if (productId && (payload.publishFb || payload.publishIg)) {
          await publishToSocial(productId as string, {
            publishFb: payload.publishFb,
            publishIg: payload.publishIg,
          });
        }
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Cuvanje nije uspelo.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProduct({ id, token: sessionToken });
      toast.success("Proizvod je obrisan.");
      if (editingProduct?._id === id) {
        closeModal();
      }
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    }
  };

  const handleCreateSupplierEntry = async () => {
    const name = newSupplierName.trim();
    if (!name) {
      toast.error("Unesi naziv dobavljaca.");
      return;
    }
    if (isCreatingSupplier) return;
    setIsCreatingSupplier(true);
    try {
      await createSupplier({ token: sessionToken, name });
      setNewSupplierName("");
      toast.success("Dobavljac je dodat.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Nije moguce dodati dobavljaca.");
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleRemoveSupplierEntry = async (id: string, usage?: { products?: number; orders?: number }) => {
    const productsUsing = usage?.products ?? 0;
    const ordersUsing = usage?.orders ?? 0;
    if (productsUsing > 0 || ordersUsing > 0) {
      toast.error("Dobavljac je vezan za proizvode ili narudzbine.");
      return;
    }
    const confirmed = window.confirm("Da li sigurno zelis da obrises ovog dobavljaca?");
    if (!confirmed) return;
    try {
      await removeSupplier({ token: sessionToken, id });
      toast.success("Dobavljac je obrisan.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Brisanje dobavljaca nije uspelo.");
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

  const handleSelectCategory = (categoryId: string) => {
    const current = (form.getValues("categoryIds") ?? []) as string[];
    if (current.includes(categoryId)) {
      setCategorySearch("");
      setCategoryMenuOpen(false);
      return;
    }
    const next = [...current, categoryId];
    form.setValue("categoryIds", next, { shouldDirty: true, shouldValidate: true });
    setCategorySearch("");
    setCategoryMenuOpen(false);
  };

  const handleRemoveCategory = (categoryId: string) => {
    const current = (form.getValues("categoryIds") ?? []) as string[];
    const next = current.filter((id) => id !== categoryId);
    form.setValue("categoryIds", next, { shouldDirty: true, shouldValidate: true });
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
      handleSelectCategory(id);
      toast.success("Kategorija dodata.");
      resetNewCategoryState();
    } catch (error) {
      console.error(error);
      toast.error("Kreiranje kategorije nije uspelo.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const items = useMemo(() => products ?? [], [products]);
  const statsMap = useMemo(() => {
    const map = new Map<string, ProductStats>();
    (productStats ?? []).forEach((entry) => {
      map.set(String(entry.productId), entry);
    });
    return map;
  }, [productStats]);
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    (categories ?? []).forEach((category) => {
      map.set(category._id, category);
    });
    return map;
  }, [categories]);
  const filteredProducts = useMemo(() => {
    const list = items;
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((product) => {
      const baseText = `${product.kpName ?? ""} ${product.name ?? ""} ${product.opisKp ?? ""} ${product.opisFbInsta ?? ""} ${product.opis ?? ""}`.toLowerCase();
      if (baseText.includes(needle)) return true;
      if ((product.variants ?? []).some((variant) => variant.label.toLowerCase().includes(needle))) {
        return true;
      }
      const hasCategoryHit = (product.categoryIds ?? []).some((id) => {
        const category = categoryMap.get(id);
        return category ? category.name.toLowerCase().includes(needle) : false;
      });
      return hasCategoryHit;
    });
  }, [categoryMap, items, productSearch]);
  const filteredCategories = useMemo(() => {
    const list = categories ?? [];
    const needle = categorySearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((category) => category.name.toLowerCase().includes(needle));
  }, [categories, categorySearch]);
  const hasProductSearch = productSearch.trim().length > 0;
  const selectedCategories = useMemo(() => {
    if (!categories) return [];
    const map = new Map(categories.map((category) => [category._id, category]));
    return categoryIds.map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [categories, categoryIds]);
  const variantsFieldError = form.formState.errors.variants;
  const variantsError =
    variantsFieldError && !Array.isArray(variantsFieldError) ? (variantsFieldError.message as string | undefined) : undefined;
  const getPrimaryVariant = useCallback((product: Product) => {
    const list = product.variants ?? [];
    return list.find((variant) => variant.isDefault) ?? list[0];
  }, []);
  const getProductPrice = useCallback(
    (product: Product) => {
      const primary = getPrimaryVariant(product);
      return primary?.prodajnaCena ?? product.prodajnaCena;
    },
    [getPrimaryVariant],
  );
  const getDisplayPrice = useCallback(
    (product: Product) => {
      return formatCurrency(getProductPrice(product), "EUR");
    },
    [getProductPrice],
  );
  const getBestSupplier = useCallback(
    (product: Product) => {
      const offers = product.supplierOffers ?? [];
      if (!offers.length) return null;
      const primary = getPrimaryVariant(product);
      const pool = primary
        ? offers.filter((offer) => (offer.variantId ?? null) === (primary.id ?? null) || !offer.variantId)
        : offers.filter((offer) => !offer.variantId);
      const relevant = pool.length > 0 ? pool : offers;
      if (!relevant.length) return null;
      let best = relevant[0];
      relevant.forEach((offer) => {
        if (offer.price < best.price) {
          best = offer;
        }
      });
      const supplier = supplierMap.get(String(best.supplierId));
      return {
        supplierId: String(best.supplierId),
        supplierName: supplier?.name,
        price: best.price,
      };
    },
    [getPrimaryVariant, supplierMap],
  );
  const getMainImage = useCallback((product: Product) => {
    const images = product.images ?? [];
    return images.find((image) => image.isMain) ?? images[0];
  }, []);
  const hasSocialMainImage = useCallback((product: Product) => {
    return Boolean(product.adImage?.url ?? product.adImage?.storageId);
  }, []);
  const getSalesCount = useCallback(
    (product: Product) => statsMap.get(String(product._id))?.salesCount ?? 0,
    [statsMap],
  );
  const getProfit = useCallback((product: Product) => statsMap.get(String(product._id))?.profit ?? 0, [statsMap]);
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    const byPriceAsc = (a: Product, b: Product) => getProductPrice(a) - getProductPrice(b);
    switch (sortBy) {
      case "price_asc":
        return list.sort(byPriceAsc);
      case "price_desc":
        return list.sort((a, b) => byPriceAsc(b, a));
      case "sales_desc":
        return list.sort((a, b) => getSalesCount(b) - getSalesCount(a));
      case "profit_desc":
        return list.sort((a, b) => getProfit(b) - getProfit(a));
      case "created_desc":
      default:
        return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  }, [filteredProducts, getProductPrice, sortBy, getSalesCount, getProfit]);
  const defaultVariantEntry =
    resolvedProductType === "variant"
      ? normalizedVariants.find((variant) => variant.isDefault) ?? normalizedVariants[0]
      : undefined;
  const bestFormOffer = useMemo(
    () => bestSupplierForVariant(resolvedProductType === "variant" ? defaultVariantEntry?.id : undefined),
    [bestSupplierForVariant, defaultVariantEntry?.id, resolvedProductType],
  );
  const bestFormSupplierName = bestFormOffer ? supplierMap.get(bestFormOffer.supplierId)?.name : undefined;
  const inboxList = inboxImages ?? [];
  const inboxPreviewImage = inboxPreviewIndex !== null ? inboxList[inboxPreviewIndex] : undefined;

  const focusProductField = useCallback(
    (fieldName: string) => {
      const targetName = String(fieldName);
      requestAnimationFrame(() => {
        try {
          form.setFocus(targetName as any, { shouldSelect: true });
          return;
        } catch {
          // fall through to DOM lookup
        }
        const scope: ParentNode = dialogScrollRef.current ?? document;
        const node =
          scope.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${targetName}"]`) ??
          document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${targetName}"]`);
        if (node) {
          node.focus();
          if ("select" in node && typeof node.select === "function") {
            node.select();
          }
        }
      });
    },
    [form],
  );

  useEffect(() => {
    if (!isModalOpen) return;
    const timer = window.setTimeout(() => focusProductField("kpName"), 0);
    return () => window.clearTimeout(timer);
  }, [focusProductField, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (form.formState.submitCount === 0 && Object.keys(form.formState.errors).length === 0) return;
    const errors = form.formState.errors;
    let target: string | null = productFocusOrder.find((field) => errors[field]) ?? null;
    if (!target) {
      const variantErrors = errors.variants;
      if (Array.isArray(variantErrors)) {
        const variantIndex = variantErrors.findIndex((entry) => entry);
        if (variantIndex >= 0) {
          const entry = variantErrors[variantIndex] as Record<string, unknown> | undefined;
          const variantHit = variantFocusOrder.find((field) => entry?.[field]);
          target = `variants.${variantIndex}.${variantHit ?? "label"}`;
        }
      } else if (variantErrors) {
        target = "variants";
      }
    }
    if (!target) return;
    const timer = window.setTimeout(() => focusProductField(target as string), 0);
    return () => window.clearTimeout(timer);
  }, [focusProductField, form.formState.errors, form.formState.submitCount, isModalOpen]);

  useEffect(() => {
    if (!hasSupplierOffers) return;
    if (!bestFormOffer) return;
    const currentValue = form.getValues("nabavnaCena");
    if (parsePrice(currentValue) !== bestFormOffer.price) {
      form.setValue("nabavnaCena", String(bestFormOffer.price), { shouldDirty: true, shouldValidate: true });
    }
    if (form.getValues("nabavnaCenaIsReal") !== true) {
      form.setValue("nabavnaCenaIsReal", true, { shouldDirty: true, shouldValidate: true });
    }
  }, [bestFormOffer, form, hasSupplierOffers]);

  const seedInitialVariant = () => {
    const entry = createVariantFormEntry({
      isDefault: true,
      nabavnaCena: form.getValues("nabavnaCena"),
      prodajnaCena: form.getValues("prodajnaCena"),
    });
    form.setValue("variants", [entry], { shouldDirty: true, shouldValidate: true });
  };

  const handleProductTypeChange = (type: ProductFormValues["productType"]) => {
    const currentType = form.getValues("productType") ?? "single";
    if (currentType === type) return;
    form.setValue("productType", type, { shouldDirty: true, shouldValidate: true });
    if (type === "single") {
      form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
      const baseOffers = (form.getValues("supplierOffers") ?? []).filter((offer) => !offer.variantId);
      form.setValue("supplierOffers", baseOffers, { shouldDirty: true, shouldValidate: true });
      setVariantImages((previous) => {
        Object.values(previous).forEach((list) =>
          list.forEach((image) => {
            if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
          }),
        );
        return {};
      });
    } else {
      const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
      if (current.length === 0) {
        seedInitialVariant();
      }
    }
  };

  const handleAddVariant = () => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    const shouldBeDefault = current.length === 0 || !current.some((variant) => variant.isDefault);
    const entry = createVariantFormEntry({
      isDefault: shouldBeDefault,
      nabavnaCena: shouldBeDefault ? form.getValues("nabavnaCena") : "",
      prodajnaCena: shouldBeDefault ? form.getValues("prodajnaCena") : "",
    });
    const next = [...current, entry];
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddVariantFromSingle = () => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    const shouldBeDefault = current.length === 0 || !current.some((variant) => variant.isDefault);
    const entry = createVariantFormEntry({
      isDefault: shouldBeDefault,
      nabavnaCena: shouldBeDefault ? form.getValues("nabavnaCena") : "",
      prodajnaCena: shouldBeDefault ? form.getValues("prodajnaCena") : "",
    });
    const next = [...current, entry];
    form.setValue("productType", "variant", { shouldDirty: true, shouldValidate: true });
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveVariant = (id: string) => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    if (current.length === 1) {
      form.setValue("productType", "single", { shouldDirty: true, shouldValidate: true });
      form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
      setVariantImages((prev) => {
        const copy = { ...prev };
        const removed = copy[id];
        if (removed) {
          removed.forEach((image) => {
            if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
          });
        }
        delete copy[id];
        return copy;
      });
      return;
    }
    const next = current.filter((variant) => variant.id !== id);
    if (!next.some((variant) => variant.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
    const filteredOffers = (form.getValues("supplierOffers") ?? []).filter((offer) => offer.variantId !== id);
    form.setValue("supplierOffers", filteredOffers, { shouldDirty: true, shouldValidate: true });
    if (next.length === 0) {
      form.setValue("productType", "single", { shouldDirty: true, shouldValidate: true });
    }
    setVariantImages((prev) => {
      const copy = { ...prev };
      const removed = copy[id];
      if (removed) {
        removed.forEach((image) => {
          if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
        });
      }
      delete copy[id];
      return copy;
    });
    delete variantUploadInputsRef.current[id];
  };

  const handleSetDefaultVariant = (id: string) => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    const next = current.map((variant) => ({
      ...variant,
      isDefault: variant.id === id,
    }));
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleClearVariants = () => {
    form.setValue("productType", "single", { shouldDirty: true, shouldValidate: true });
    form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
    const baseOffers = (form.getValues("supplierOffers") ?? []).filter((offer) => !offer.variantId);
    form.setValue("supplierOffers", baseOffers, { shouldDirty: true, shouldValidate: true });
    setVariantImages((prev) => {
      Object.values(prev).forEach((list) =>
        list.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        }),
      );
      return {};
    });
  };

  const setSupplierOffersField = (updater: (prev: SupplierOfferFormEntry[]) => SupplierOfferFormEntry[]) => {
    const current = (form.getValues("supplierOffers") ?? []) as SupplierOfferFormEntry[];
    const next = updater(current);
    form.setValue("supplierOffers", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddSupplierOffer = (variantId?: string) => {
    if (!suppliers || suppliers.length === 0) {
      toast.error("Dodaj bar jednog dobavljaca pre dodavanja ponude.");
      return;
    }
    const scopedVariantId = resolvedProductType === "variant" ? variantId : undefined;
    setSupplierOffersField((prev) => [
      ...prev,
      {
        id: generateId(),
        supplierId: suppliers[0]._id,
        price: "",
        variantId: scopedVariantId,
      },
    ]);
  };

  const handleUpdateSupplierOffer = (
    rowId: string,
    field: "supplierId" | "price" | "variantId",
    value: string | undefined,
  ) => {
    setSupplierOffersField((prev) =>
      prev.map((entry) => (entry.id === rowId ? { ...entry, [field]: value ?? "" } : entry)),
    );
  };

  const handleRemoveSupplierOffer = (rowId: string) => {
    setSupplierOffersField((prev) => prev.filter((entry) => entry.id !== rowId));
  };

  const uploadAdImage = async (file: File) => {
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
      if (adImage?.previewUrl) {
        URL.revokeObjectURL(adImage.previewUrl);
      }
      setAdImage({
        storageId,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: file.type,
        uploadedAt: Date.now(),
      });
      toast.success("Glavna slika sacuvana.");
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje glavne slike nije uspelo.");
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleAdImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
    event.target.value = "";
  };

  const handleAdDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
    setIsAdDragActive(false);
  };

  const uploadInboxImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (isUploadingInboxImages) {
      toast.info("Otpremanje slika je vec u toku.");
      return;
    }
    const imagesOnly = Array.from(files).filter(
      (file) => file.type?.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name),
    );
    if (imagesOnly.length === 0) {
      toast.error("Izaberi fajlove tipa slike.");
      return;
    }
    setIsUploadingInboxImages(true);
    try {
      for (const file of imagesOnly) {
        const uploadUrl = await generateUploadUrl({ token: sessionToken });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!response.ok) {
          throw new Error("Upload nije uspeo.");
        }
        const result = await response.json();
        if (!result?.storageId) {
          throw new Error("Nedostaje ID fajla.");
        }
        await addInboxImage({
          token: sessionToken,
          storageId: result.storageId as string,
          fileName: file.name,
          contentType: file.type,
          uploadedAt: Date.now(),
        });
      }
      toast.success("Slike su dodate u inbox za ubacivanje.");
    } catch (error) {
      console.error(error);
      toast.error("Otpremanje slika nije uspelo.");
    } finally {
      setIsUploadingInboxImages(false);
      if (inboxUploadInputRef.current) {
        inboxUploadInputRef.current.value = "";
      }
    }
  };

  const handleInboxFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    await uploadInboxImages(files);
    event.target.value = "";
  };

  const handleDeleteInboxImage = async (id: string) => {
    const confirmed = window.confirm("Obrisi ovu sliku iz inboxa?");
    if (!confirmed) return;
    try {
      await deleteInboxImage({ token: sessionToken, id });
      if (inboxPreviewIndex !== null) {
        const nextCount = (inboxImages?.length ?? 0) - 1;
        if (nextCount <= 0) {
          setInboxPreviewIndex(null);
        } else {
          setInboxPreviewIndex((prev) => {
            if (prev === null) return null;
            return Math.min(prev, nextCount - 1);
          });
        }
      }
      toast.success("Slika je obrisana.");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce obrisati sliku.");
    }
  };

  const handleOpenInboxPreview = (index: number) => {
    setInboxPreviewIndex(index);
  };

  const handleCloseInboxPreview = () => setInboxPreviewIndex(null);

  const handleStepInboxPreview = (direction: 1 | -1) => {
    const list = inboxImages ?? [];
    if (inboxPreviewIndex === null || list.length === 0) return;
    const nextIndex = (inboxPreviewIndex + direction + list.length) % list.length;
    setInboxPreviewIndex(nextIndex);
  };

  const handleAdDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const hasFile = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
    if (hasFile) {
      setIsAdDragActive(true);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }
  };

  const handleAdDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsAdDragActive(false);
    }
  };

  const handleRemoveAdImage = () => {
    if (adImage?.previewUrl) {
      URL.revokeObjectURL(adImage.previewUrl);
    }
    setAdImage(null);
  };

  const uploadImages = useCallback(
    async (
      fileList: FileList | File[],
      target: { type: "product" } | { type: "variant"; variantId: string } = { type: "product" },
    ) => {
      if (isUploadingImages) {
        toast.info("Sacekaj da se zavrsi trenutno otpremanje.");
        return;
      }

      const acceptedFiles = Array.from(fileList instanceof FileList ? fileList : fileList).filter((file) => {
        if (file.type) return file.type.startsWith("image/");
        return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
      });

      if (acceptedFiles.length === 0) {
        toast.error("Prevuci ili izaberi fajlove tipa slike.");
        return;
      }

      setIsUploadingImages(true);
      try {
        for (const file of acceptedFiles) {
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
          const previewUrl = URL.createObjectURL(file);
          if (target.type === "product") {
            setImages((prev) => {
              const hasMain = prev.some((image) => image.isMain);
              return [
                ...prev,
                {
                  storageId,
                  previewUrl,
                  fileName: file.name,
                  fileType: file.type,
                  publishFb: true,
                  publishIg: true,
                  uploadedAt: Date.now(),
                  isMain: hasMain ? false : true,
                },
              ];
            });
          } else {
            setVariantImages((prev) => {
              const current = prev[target.variantId] ?? [];
              const hasMain = current.some((image) => image.isMain);
              return {
                ...prev,
                [target.variantId]: [
                  ...current,
                  {
                    storageId,
                    previewUrl,
                    fileName: file.name,
                    fileType: file.type,
                    publishFb: true,
                    publishIg: true,
                    uploadedAt: Date.now(),
                    isMain: hasMain ? false : true,
                  },
                ],
              };
            });
          }
        }
        toast.success("Slike su uploadovane.");
      } catch (error) {
        console.error(error);
        toast.error("Upload slike nije uspeo.");
      } finally {
        setIsUploadingImages(false);
      }
    },
    [generateUploadUrl, isUploadingImages, sessionToken],
  );

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await uploadImages(files, { type: "product" });
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDropFiles = async (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    await uploadImages(files, { type: "product" });
  };

  const handleVariantFilesSelected = async (variantId: string, event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadImages(files, { type: "variant", variantId });
    event.target.value = "";
  };

  const handleDragEnter = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
    if (hasFiles) {
      setIsDraggingFiles(true);
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
    if (hasFiles) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDraggingFiles(false);
    }
  };

  const handleOpenVariantPicker = (variantId: string) => {
    if (isUploadingImages) {
      toast.info("Sacekaj da se zavrsi trenutno otpremanje.");
      return;
    }
    const scrollContainer = dialogScrollRef.current;
    const prevScroll = scrollContainer?.scrollTop ?? null;
    variantUploadInputsRef.current[variantId]?.click();
    requestAnimationFrame(() => {
      if (prevScroll !== null && scrollContainer) {
        scrollContainer.scrollTo({ top: prevScroll });
      }
    });
  };

  const handleOpenProductPicker = () => {
    if (isUploadingImages) {
      toast.info("Sacekaj da se zavrsi trenutno otpremanje.");
      return;
    }
    const scrollContainer = dialogScrollRef.current;
    const prevScroll = scrollContainer?.scrollTop ?? null;
    productUploadInputRef.current?.click();
    requestAnimationFrame(() => {
      if (prevScroll !== null && scrollContainer) {
        scrollContainer.scrollTo({ top: prevScroll });
      }
    });
  };

  useEffect(() => {
    if (!isModalOpen) {
      setIsDraggingFiles(false);
      return;
    }

    const handleWindowDragOver = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
      if (hasFiles) {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        setIsDraggingFiles(true);
      }
    };

    const handleWindowDrop = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
      if (!hasFiles) return;
      event.preventDefault();
      setIsDraggingFiles(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        uploadImages(files, { type: "product" });
      }
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      const leavingDocument = !event.relatedTarget && event.clientX === 0 && event.clientY === 0;
      if (leavingDocument) {
        setIsDraggingFiles(false);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragleave", handleWindowDragLeave);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, [isModalOpen, uploadImages]);

  const handleSetMainImage = (storageId: string) => {
    setImages((prev) => prev.map((image) => ({ ...image, isMain: image.storageId === storageId })));
  };

  const handleOpenPreview = (url?: string | null, alt?: string) => {
    if (!url) return;
    setPreviewImage({ url, alt });
  };

  const handleClosePreview = () => setPreviewImage(null);

  const handleSetVariantMainImage = (variantId: string, storageId: string) => {
    setVariantImages((prev) => {
      const current = prev[variantId] ?? [];
      return {
        ...prev,
        [variantId]: current.map((image) => ({ ...image, isMain: image.storageId === storageId })),
      };
    });
  };

  const handleToggleImagePublish = (storageId: string, field: "publishFb" | "publishIg", value: boolean) => {
    setImages((prev) => prev.map((image) => (image.storageId === storageId ? { ...image, [field]: value } : image)));
  };

  const handleToggleVariantImagePublish = (
    variantId: string,
    storageId: string,
    field: "publishFb" | "publishIg",
    value: boolean,
  ) => {
    setVariantImages((prev) => {
      const current = prev[variantId] ?? [];
      return {
        ...prev,
        [variantId]: current.map((image) => (image.storageId === storageId ? { ...image, [field]: value } : image)),
      };
    });
  };

  const handleRemoveImage = (storageId: string) => {
    setImages((prev) => {
      const filtered = prev.filter((image) => {
        if (image.storageId === storageId && image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
        return image.storageId !== storageId;
      });
      if (filtered.length > 0 && !filtered.some((image) => image.isMain)) {
        filtered[0] = { ...filtered[0], isMain: true };
      }
      return filtered;
    });
  };

  const handleRemoveVariantImage = (variantId: string, storageId: string) => {
    setVariantImages((prev) => {
      const current = prev[variantId] ?? [];
      const filtered = current.filter((image) => {
        if (image.storageId === storageId && image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
        return image.storageId !== storageId;
      });
      if (filtered.length > 0 && !filtered.some((image) => image.isMain)) {
        filtered[0] = { ...filtered[0], isMain: true };
      }
      return { ...prev, [variantId]: filtered };
    });
  };

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    const sourceVariants = product.variants ?? [];
    const mappedVariants = sourceVariants.map((variant, index) => {
      const variantId = variant.id || generateId();
      return {
        id: variantId,
        label: variant.label || `Tip ${index + 1}`,
        nabavnaCena: variant.nabavnaCena.toString(),
        nabavnaCenaIsReal: variant.nabavnaCenaIsReal ?? true,
        prodajnaCena: variant.prodajnaCena.toString(),
        opis: variant.opis ?? "",
        isDefault: variant.isDefault ?? index === 0,
      };
    });
    const mappedSupplierOffers =
      product.supplierOffers?.map((offer) => ({
        id: generateId(),
        supplierId: offer.supplierId,
        price: offer.price.toString(),
        variantId: offer.variantId,
      })) ?? [];
    form.reset({
      productType: (product.variants ?? []).length > 0 ? "variant" : "single",
      kpName: product.kpName ?? product.name,
      name: product.name,
      nabavnaCena: product.nabavnaCena.toString(),
      nabavnaCenaIsReal: product.nabavnaCenaIsReal ?? true,
      prodajnaCena: product.prodajnaCena.toString(),
      supplierOffers: mappedSupplierOffers,
      categoryIds: product.categoryIds ?? [],
      opisKp: product.opisKp ?? "",
      opisFbInsta: product.opisFbInsta ?? product.opis ?? "",
      publishKp: product.publishKp ?? false,
      publishFb: product.publishFb ?? false,
      publishIg: product.publishIg ?? false,
      publishFbProfile: product.publishFbProfile ?? false,
      publishMarketplace: product.publishMarketplace ?? false,
      pickupAvailable: product.pickupAvailable ?? false,
      variants: mappedVariants,
    });
    setImages((prev) => {
      prev.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return (product.images ?? []).map((image) => ({
        storageId: image.storageId,
        url: image.url,
        fileName: image.fileName,
        fileType: image.contentType,
        isMain: image.isMain,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
        uploadedAt: image.uploadedAt,
      }));
    });
    setVariantImages(() => {
      const map: Record<string, DraftImage[]> = {};
      sourceVariants.forEach((variant, index) => {
        const variantId = mappedVariants[index]?.id ?? variant.id ?? generateId();
        map[variantId] = (variant.images ?? []).map((image) => ({
          storageId: image.storageId,
          url: image.url,
          fileName: image.fileName,
          fileType: image.contentType,
          isMain: image.isMain,
          publishFb: image.publishFb ?? true,
          publishIg: image.publishIg ?? true,
          uploadedAt: image.uploadedAt,
        }));
      });
      return map;
    });
    setAdImage((previous) => {
      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      if (!product.adImage) return null;
      return {
        storageId: product.adImage.storageId,
        url: product.adImage.url,
        fileName: product.adImage.fileName,
        fileType: product.adImage.contentType,
        uploadedAt: product.adImage.uploadedAt,
      };
    });
    resetNewCategoryState();
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!categoryMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryDropdownRef.current) return;
      if (categoryDropdownRef.current.contains(event.target as Node)) return;
      setCategoryMenuOpen(false);
      resetNewCategoryState();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoryMenuOpen]);

  const handleRowClick = (id: string) => {
    router.push(`/proizvodi/${id}`);
  };

  return (
    <div className="relative mx-auto space-y-6">
      {isModalOpen && isDraggingFiles && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/75 px-6 py-3 text-slate-800 shadow-2xl shadow-blue-500/25 ring-1 ring-white/70">
            <div className="rounded-full bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/40">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Otpusti slike da ih dodas</p>
              <p className="text-xs text-slate-600">Drop radi gde god da spustis fajlove dok je modal otvoren.</p>
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proizvodi</h1>
          <p className="text-sm text-slate-500">Klikni na red za detalje ili otvori modal za novi unos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {items.length} proizvoda
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj novi proizvod
          </Button>
        </div>
      </header>

      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : closeModal())}>
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <div
            ref={dialogScrollRef}
            className="max-h-[85vh] overflow-y-auto px-6 pb-6 pt-4 space-y-4"
          >
            <DialogHeader className="space-y-1">
              <DialogTitle>{editingProduct ? "Izmeni proizvod" : "Novi proizvod"}</DialogTitle>
              <p className="text-sm text-slate-500">
                {editingProduct
                  ? `Trenutno menjas: ${editingProduct.kpName ?? editingProduct.name}`
                  : "Sacuvaj nabavnu i prodajnu cenu u evrima."}
              </p>
            </DialogHeader>

            <div className="space-y-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  className="w-full"
                  variant={resolvedProductType === "single" ? "default" : "outline"}
                  onClick={() => handleProductTypeChange("single")}
                >
                  Obican proizvod
                </Button>
                <Button
                  type="button"
                  className="w-full"
                  variant={resolvedProductType === "variant" ? "default" : "outline"}
                  onClick={() => handleProductTypeChange("variant")}
                >
                  Tipski proizvod
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Obican ima jednu cenu i KP / FB opis, tipski moze da ima vise tipova sa sopstvenim cenama i opisima.
              </p>
            </div>

      <div className="mx-auto w-full max-w-4xl">
        <Card className="w-full">
        <CardHeader>
          <CardTitle>{editingProduct ? "Izmeni proizvod" : "Novi proizvod"}</CardTitle>
          {editingProduct && (
            <p className="text-sm text-slate-500">
              Trenutno menjas:{" "}
              <span className="font-medium text-slate-700">{editingProduct.kpName ?? editingProduct.name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="kpName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>KP naziv (glavni na sajtu)</FormLabel>
                    <Input placeholder="npr. Samohodni trimer" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>FB / Insta naziv</FormLabel>
                    <Input placeholder="npr. Trimer za FB/IG objavu" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
              <div className="space-y-2" ref={categoryDropdownRef}>
                <FormLabel>Kategorije</FormLabel>
                <p className="text-sm text-slate-500">Biraj postojecu ili napravi novu na licu mesta.</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.length === 0 ? (
                    <span className="text-xs text-slate-500">Nema izabranih kategorija.</span>
                ) : (
                  selectedCategories.map((category) => (
                    <span
                      key={category._id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      <Tag className="h-4 w-4 text-slate-500" />
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
                  onFocus={() => {
                    setCategoryMenuOpen(true);
                  }}
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
                        const isSelected = categoryIds.includes(category._id);
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
                            </div>
                            {isSelected ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="opisKp"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>KupujemProdajem opis</FormLabel>
                    <Textarea rows={3} placeholder="Opis za KP" autoResize {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="opisFbInsta"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>FB / Insta opis</FormLabel>
                    <Textarea rows={3} placeholder="Opis za drustvene mreze" autoResize {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <FormField
                  name="publishKp"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <input
                        id="publish-kp"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel htmlFor="publish-kp" className="m-0 flex items-center gap-2 cursor-pointer">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/kp.png" alt="KP" className="h-7 w-7 object-contain" />
                        </span>
                        <span className="text-sm font-semibold text-slate-800">KupujemProdajem</span>
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="publishFb"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <input
                        id="publish-fb"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-fb"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                      >
                        <Facebook className="h-5 w-5 text-blue-600" />
                        <span>Alati Mašine</span>
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="publishFbProfile"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <input
                        id="publish-fb-profile"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-fb-profile"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                      >
                        <Facebook className="h-5 w-5 text-blue-600" />
                        <span>Kod Majstora</span>
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="publishIg"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <input
                        id="publish-ig"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-ig"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                      >
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-sm">
                          <Instagram className="h-4 w-4" />
                        </span>
                        <span>kod.majstora</span>
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="publishMarketplace"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                      <input
                        id="publish-marketplace"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-marketplace"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                      >
                        <Facebook className="h-5 w-5 text-blue-600" />
                        <span>Marketplace</span>
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              {!editingProduct && (publishFbSelected || publishIgSelected) ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <p className="leading-snug">
                    Kada cekiras Facebook ili Instagram ovde, posle cuvanja novog proizvoda objava ide automatski na stranice Alati Mašine i
                    kod.majstora.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <FormField
                name="pickupAvailable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <input
                      id="pickup-available"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FormLabel htmlFor="pickup-available" className="m-0 cursor-pointer">
                      Licno preuzimanje
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="nabavnaCena"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Nabavna cena (EUR)</FormLabel>
                    <div className="space-y-2">
                      <Input
                        ref={field.ref}
                        name={field.name}
                        type="text"
                        inputMode="decimal"
                        placeholder="npr. 11.90"
                        value={hasSupplierOffers ? bestFormOffer?.price ?? field.value : field.value}
                        disabled={hasSupplierOffers}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                      />
                      {hasSupplierOffers ? (
                        <div className="flex flex-wrap gap-2">
                          {normalizedSupplierOffers.map((offer) => {
                            const supplierName = supplierMap.get(offer.supplierId)?.name ?? "Dobavljac";
                            const isBest = bestFormOffer && offer.price === bestFormOffer.price;
                            return (
                              <span
                                key={`${offer.supplierId}-${offer.variantId ?? "base"}`}
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold shadow ${
                                  isBest
                                    ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                                }`}
                              >
                                {supplierName}
                                <span className="text-xs font-bold">{formatCurrency(offer.price, "EUR")}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </div>
                  </FormItem>
                )}
              />
            <FormField
              name="prodajnaCena"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Prodajna cena (EUR)</FormLabel>
                    <Input
                      ref={field.ref}
                      name={field.name}
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 15.50"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                    />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            {!hasSupplierOffers && (
              <FormField
                name="nabavnaCenaIsReal"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      id="nabavna-is-real"
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <FormLabel htmlFor="nabavna-is-real" className="m-0 cursor-pointer">
                        Prava nabavna cena
                      </FormLabel>
                      <p className="text-xs text-slate-500">Odznači ako je cena procenjena.</p>
                    </div>
                  </FormItem>
                )}
              />
            )}
            <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <FormLabel>Dobavljaci i nabavne ponude</FormLabel>
                  <p className="text-xs text-slate-600">Najniza ponuda postaje prava nabavna cena proizvoda.</p>
                </div>
                {!showSupplierForm && supplierOffersField.length === 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSupplierForm(true)}
                    disabled={suppliers === undefined}
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj dobavljaca
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddSupplierOffer(defaultVariantEntry?.id)}
                    disabled={suppliers === undefined}
                  >
                    <Plus className="h-4 w-4" />
                    Dodaj dobavljaca
                  </Button>
                )}
              </div>
              {suppliers === undefined ? (
                <p className="text-sm text-slate-500">Ucitavanje dobavljaca...</p>
              ) : suppliers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Dodaj dobavljace u kartici ispod, pa ih povezi sa proizvodima.
                </p>
              ) : showSupplierForm || supplierOffersField.length > 0 ? (
                <div className="space-y-2">
                  {supplierOffersField.length === 0 ? (
                    <div className="rounded-md border border-dashed border-blue-200 bg-white px-3 py-2 text-sm text-slate-600">
                      Nema vezanih dobavljaca. Najnizu cenu iz ponude dobavljaca cuvamo kao nabavnu cenu.
                    </div>
                  ) : (
                    supplierOffersField.map((offer) => {
                      const rowId = offer.id ?? `${offer.supplierId}-${offer.variantId ?? "base"}`;
                      return (
                        <div
                          key={rowId}
                          className="rounded-md border border-blue-200 bg-white px-3 py-3 shadow-sm ring-1 ring-blue-50"
                        >
                          <div className="grid gap-3 md:grid-cols-12 md:items-end">
                            <div className="md:col-span-4 space-y-1">
                              <FormLabel className="text-xs text-slate-500">Dobavljac</FormLabel>
                              <Select
                                value={offer.supplierId}
                                onValueChange={(value) => handleUpdateSupplierOffer(rowId, "supplierId", value)}
                              >
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
                            {resolvedProductType === "variant" ? (
                              <div className="md:col-span-4 space-y-1">
                                <FormLabel className="text-xs text-slate-500">Vazi za</FormLabel>
                                <Select
                                  value={offer.variantId ?? "base"}
                                  onValueChange={(value) =>
                                    handleUpdateSupplierOffer(rowId, "variantId", value === "base" ? undefined : value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Svi tipovi" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="base">Svi tipovi</SelectItem>
                                    {normalizedVariants.map((variant) => (
                                      <SelectItem key={variant.id} value={variant.id}>
                                        {variant.label || "Tip"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : null}
                            <div
                              className={`space-y-1 ${resolvedProductType === "variant" ? "md:col-span-3" : "md:col-span-6"}`}
                            >
                              <FormLabel className="text-xs text-slate-500">Cena (EUR)</FormLabel>
                              <Input
                                value={offer.price}
                                inputMode="decimal"
                                placeholder="npr. 10.50"
                                onChange={(event) => handleUpdateSupplierOffer(rowId, "price", event.target.value)}
                              />
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSupplierOffer(rowId)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
              {bestFormOffer ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Najniza nabavna: {formatCurrency(bestFormOffer.price, "EUR")}{" "}
                  {bestFormSupplierName ? `(${bestFormSupplierName})` : ""}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Kada dodelis dobavljaca, ova cena ce biti oznacena kao prava nabavna cena.
                </p>
              )}
            </div>
            {resolvedProductType === "variant" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <FormLabel>Tipovi proizvoda</FormLabel>
                    <p className="text-sm text-slate-500">
                      Svaki tip ima svoje cene i opis. Glavni tip se koristi kao podrazumevani za liste i kalkulacije.
                    </p>
                  </div>
                  {normalizedVariants.length === 0 ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
                      Dodaj tip
                    </Button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
                        Dodaj jos tip
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleClearVariants}>
                        Vrati na jednostavni
                      </Button>
                    </div>
                  )}
                </div>
                {normalizedVariants.length === 0 ? (
                  <p className="text-sm text-slate-500">Dodaj bar jedan tip da bi sacuvao tipski proizvod.</p>
                ) : (
                  <div className="space-y-4">
                    {normalizedVariants.map((variant, index) => (
                      <div key={variant.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-600">Tip #{index + 1}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <label className="flex items-center gap-2 font-medium text-slate-600">
                              <input
                                type="radio"
                                name="default-variant"
                                checked={variant.isDefault}
                                onChange={() => handleSetDefaultVariant(variant.id)}
                              />
                              Glavni
                            </label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveVariant(variant.id)}>
                              Ukloni
                            </Button>
                          </div>
                        </div>
                        <FormField
                          name={`variants.${index}.label` as const}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel>Naziv tipa</FormLabel>
                              <Input placeholder="npr. 2 brzine" {...field} />
                              <FormMessage>{fieldState.error?.message}</FormMessage>
                            </FormItem>
                          )}
                        />
                        <FormField
                          name={`variants.${index}.opis` as const}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel>Opis tipa (opciono)</FormLabel>
                              <Textarea rows={2} placeholder="npr. Bela boja, velicina M" autoResize {...field} />
                              <FormMessage>{fieldState.error?.message}</FormMessage>
                            </FormItem>
                          )}
                        />
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          name={`variants.${index}.nabavnaCena` as const}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel>Nabavna cena (EUR)</FormLabel>
                              <Input
                                ref={field.ref}
                                name={field.name}
                                type="text"
                                inputMode="decimal"
                                placeholder="npr. 120.00"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                onBlur={field.onBlur}
                              />
                              <FormMessage>{fieldState.error?.message}</FormMessage>
                            </FormItem>
                          )}
                        />
                        <FormField
                          name={`variants.${index}.prodajnaCena` as const}
                          render={({ field, fieldState }) => (
                            <FormItem>
                              <FormLabel>Prodajna cena (EUR)</FormLabel>
                                <Input
                                  ref={field.ref}
                                  name={field.name}
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="npr. 150.00"
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                  onBlur={field.onBlur}
                                />
                                <FormMessage>{fieldState.error?.message}</FormMessage>
                              </FormItem>
                            )}
                          />
                        <FormField
                          name={`variants.${index}.nabavnaCenaIsReal` as const}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                <input
                                  id={`variant-${index}-nabavna-real`}
                                  type="checkbox"
                                  checked={field.value ?? true}
                                  onChange={(event) => field.onChange(event.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex flex-col">
                                  <FormLabel htmlFor={`variant-${index}-nabavna-real`} className="m-0 cursor-pointer">
                                    Prava nabavna cena
                                  </FormLabel>
                                  <p className="text-xs text-slate-500">Odznači ako je cena procenjena.</p>
                                </div>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FormLabel>Slike tipa</FormLabel>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:bg-slate-800"
                              disabled={isUploadingImages}
                              onClick={() => handleOpenVariantPicker(variant.id)}
                              aria-controls={`variant-upload-${variant.id}`}
                            >
                              Dodaj slike
                            </Button>
                            <input
                              id={`variant-upload-${variant.id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              disabled={isUploadingImages}
                              onChange={(event) => handleVariantFilesSelected(variant.id, event)}
                              tabIndex={-1}
                              style={hiddenFileInputStyle}
                              ref={(node) => {
                                if (!node) {
                                  delete variantUploadInputsRef.current[variant.id];
                                  return;
                                }
                                variantUploadInputsRef.current[variant.id] = node;
                              }}
                            />
                          </div>
                        </div>
                        {variantImages[variant.id]?.length ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {variantImages[variant.id]?.map((image) => {
                              const resolvedUrl = image.url ?? image.previewUrl;
                              const fbActive = image.publishFb ?? true;
                              const igActive = image.publishIg ?? true;
                              return (
                                <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                                  <div
                                    className={`relative aspect-video overflow-hidden rounded-md bg-slate-100 ${
                                      resolvedUrl ? "cursor-pointer transition hover:opacity-95" : ""
                                    }`}
                                    onClick={() => handleOpenPreview(resolvedUrl, image.fileName ?? "Variant image")}
                                  >
                                    {resolvedUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={resolvedUrl} alt={image.fileName ?? "Variant image"} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs uppercase text-slate-400">
                                        Bez pregleda
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <label className="flex items-center gap-2 font-medium text-slate-600">
                                        <input
                                          type="radio"
                                          name={`variant-main-${variant.id}`}
                                          checked={image.isMain}
                                          onChange={() => handleSetVariantMainImage(variant.id, image.storageId)}
                                        />
                                        Glavna
                                      </label>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                            fbActive
                                              ? "bg-blue-600 text-white hover:bg-blue-700"
                                              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                          }`}
                                          onClick={() =>
                                            handleToggleVariantImagePublish(variant.id, image.storageId, "publishFb", !fbActive)
                                          }
                                        >
                                          <Facebook className="h-3.5 w-3.5" />
                                          FB
                                        </button>
                                        <button
                                          type="button"
                                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                            igActive
                                              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                                              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                          }`}
                                          onClick={() =>
                                            handleToggleVariantImagePublish(variant.id, image.storageId, "publishIg", !igActive)
                                          }
                                        >
                                          <Instagram className="h-3.5 w-3.5" />
                                          IG
                                        </button>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveVariantImage(variant.id, image.storageId)}
                                    >
                                      Ukloni
                                    </Button>
                                  </div>
                                  {image.fileName && <p className="truncate text-xs text-slate-500">{image.fileName}</p>}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">Jos nema slika za ovaj tip.</p>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                )}
                {variantsError && normalizedVariants.length > 0 && (
                  <p className="text-sm text-red-600">{variantsError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <FormLabel>Tipovi proizvoda</FormLabel>
                    <p className="text-sm text-slate-500">Dodaj tip i proizvod se automatski prebacuje na tipski.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddVariantFromSingle}>
                    Dodaj tip
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <FormLabel>Glavna slika za drustvene mreze</FormLabel>
                  <p className="text-sm text-slate-500">Prva fotka koja ide uz FB / Instagram objave.</p>
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
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={isUploadingAdImage}
                    onClick={() => adImageInputRef.current?.click()}
                  >
                    <CloudUpload className="h-4 w-4" />
                    {adImage ? "Zameni sliku" : "Dodaj glavnu sliku"}
                  </Button>
                  {adImage ? (
                    <Button type="button" size="sm" variant="ghost" className="gap-1 text-red-600" onClick={handleRemoveAdImage}>
                      <X className="h-4 w-4" />
                      Ukloni
                    </Button>
                  ) : null}
                </div>
              </div>
              <div
                className={`relative overflow-hidden rounded-xl border border-dashed transition ${
                  isAdDragActive ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-slate-50"
                }`}
                onDragEnter={handleAdDragOver}
                onDragOver={handleAdDragOver}
                onDragLeave={handleAdDragLeave}
                onDrop={handleAdDrop}
              >
                {(() => {
                  const previewUrl = adImage?.previewUrl ?? adImage?.url;
                  if (previewUrl) {
                    return (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Glavna slika za drustvene mreze"
                          className="h-[200px] w-full object-cover sm:h-[260px]"
                        />
                        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow">
                          <Tag className="h-3 w-3 text-slate-500" />
                          Glavna za drustvene mreze
                        </div>
                        <div className="absolute right-3 top-3 hidden gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow sm:inline-flex">
                          <CloudUpload className="h-3.5 w-3.5 text-blue-600" />
                          Prevuci novu fotku da zamenis
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="flex min-h-[160px] items-center justify-between gap-3 p-4 sm:p-6">
                      <div className="flex items-center gap-3 text-slate-700">
                        <div className="rounded-full bg-blue-100 p-3 text-blue-600 shadow-inner shadow-blue-200">
                          <Images className="h-5 w-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold">Dodaj glavnu sliku</p>
                          <p className="text-xs text-slate-500">Prevuci je ovde ili klikni na dugme.</p>
                        </div>
                      </div>
                      <div className="hidden text-xs text-slate-500 sm:block">Koristi se kao prva na FB/IG.</div>
                    </div>
                  );
                })()}
                {isAdDragActive ? (
                  <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-400/60 bg-blue-100/50" />
                ) : null}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <FormLabel>Slike</FormLabel>
                <p className="text-sm text-slate-500">Dodaj vise slika i oznaci jednu kao glavnu.</p>
              </div>
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropFiles}
                className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition duration-200 ${
                  isDraggingFiles
                    ? "border-blue-500/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-[0_22px_60px_-34px_rgba(37,99,235,0.55)]"
                    : "border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:shadow-[0_16px_50px_-40px_rgba(15,23,42,0.35)]"
                }`}
              >
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingImages}
                  onChange={handleFilesSelected}
                  tabIndex={-1}
                  style={hiddenFileInputStyle}
                  ref={productUploadInputRef}
                />
                <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="rounded-full bg-blue-100 p-3 text-blue-600 shadow-inner shadow-blue-200">
                      <CloudUpload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Prevuci ili izaberi slike</p>
                      <p className="text-xs text-slate-500">Podrzani su PNG, JPG, WebP i ostali standardni formati.</p>
                      {isUploadingImages && <p className="text-xs font-semibold text-blue-600">Otpremanje...</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 sm:items-end">
                    <Button
                      type="button"
                      onClick={handleOpenProductPicker}
                      className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                        isUploadingImages
                          ? "bg-slate-400 opacity-70"
                          : "bg-blue-600 hover:-translate-y-[1px] hover:bg-blue-700"
                      }`}
                      disabled={isUploadingImages}
                    >
                      Izaberi fajlove
                    </Button>
                    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-slate-200">
                      <Images className="h-4 w-4 text-slate-400" />
                      Drag & Drop
                    </div>
                  </div>
                </div>
                {isDraggingFiles && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/12 to-purple-500/20">
                    <div className="absolute inset-4 rounded-xl border border-blue-500/40 shadow-[0_0_0_1px_rgba(37,99,235,0.25)] blur-[0.5px]" />
                  </div>
                )}
              </div>
              {!isUploadingImages && (
                <p className="text-xs text-slate-500">Prevuci slike iz Windows foldera ili klikni na dugme.</p>
              )}
              {images.length === 0 ? (
                <p className="text-sm italic text-slate-500">Jos nema dodatih slika.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {images.map((image) => {
                    const resolvedUrl = image.url ?? image.previewUrl;
                    const fbActive = image.publishFb ?? true;
                    const igActive = image.publishIg ?? true;
                    return (
                      <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <div
                          className={`relative aspect-video overflow-hidden rounded-md bg-slate-100 ${
                            resolvedUrl ? "cursor-pointer transition hover:opacity-95" : ""
                          }`}
                          onClick={() => handleOpenPreview(resolvedUrl, image.fileName ?? "Product image")}
                        >
                          {resolvedUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolvedUrl} alt={image.fileName ?? "Product image"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs uppercase text-slate-400">
                              Bez pregleda
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="flex items-center gap-2 font-medium text-slate-600">
                              <input
                                type="radio"
                                name="main-image"
                                checked={image.isMain}
                                onChange={() => handleSetMainImage(image.storageId)}
                              />
                              Glavna
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                  fbActive
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                }`}
                                onClick={() => handleToggleImagePublish(image.storageId, "publishFb", !fbActive)}
                              >
                                <Facebook className="h-3.5 w-3.5" />
                                FB
                              </button>
                              <button
                                type="button"
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                  igActive
                                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                }`}
                                onClick={() => handleToggleImagePublish(image.storageId, "publishIg", !igActive)}
                              >
                                <Instagram className="h-3.5 w-3.5" />
                                IG
                              </button>
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage(image.storageId)}>
                            Ukloni
                          </Button>
                        </div>
                        {image.fileName && <p className="truncate text-xs text-slate-500">{image.fileName}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetForm}>
                {editingProduct ? "Otkazi izmene" : "Ponisti"}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingProduct ? "Azuriraj" : "Sacuvaj"}
              </Button>
            </div>
          </Form>
        </CardContent>
        </Card>
      </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Dobavljaci</CardTitle>
            <p className="text-sm text-slate-500">Dodaj ili obrisi dobavljace. Ne mozes obrisati vezane za proizvode.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={newSupplierName}
                onChange={(event) => setNewSupplierName(event.target.value)}
                placeholder="npr. Petrit"
              />
              <Button
                type="button"
                onClick={handleCreateSupplierEntry}
                disabled={isCreatingSupplier || !newSupplierName.trim()}
                className="gap-2"
              >
                {isCreatingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Dodaj
              </Button>
            </div>
            <div className="space-y-2">
              {suppliers === undefined ? (
                <p className="text-sm text-slate-500">Ucitavanje dobavljaca...</p>
              ) : suppliers.length === 0 ? (
                <p className="text-sm text-slate-500">Nema dobavljaca. Dodaj Petrit i Menad za pocetak.</p>
              ) : (
                suppliers.map((supplier) => {
                  const usageProducts = supplier.usage?.products ?? 0;
                  const usageOrders = supplier.usage?.orders ?? 0;
                  const isLocked = usageProducts > 0 || usageOrders > 0;
                  return (
                    <div
                      key={supplier._id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{supplier.name}</p>
                        <p className="text-xs text-slate-500">
                          Proizvodi: {usageProducts} | Narudzbine: {usageOrders}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLocked ? <Badge variant="secondary">Vezan</Badge> : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isLocked}
                          onClick={() => handleRemoveSupplierEntry(supplier._id, supplier.usage)}
                        >
                          Obrisi
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Slike za ubacivanje</CardTitle>
            <p className="text-sm text-slate-500">Privremeni inbox za slike proizvoda koji tek treba da se dodaju.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Dodaj vise slika, pregledaj ih u punoj velicini i obrisi kada ih povezes sa proizvodom.
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={inboxUploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handleInboxFilesSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => inboxUploadInputRef.current?.click()}
                  disabled={isUploadingInboxImages}
                >
                  {isUploadingInboxImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                  Dodaj slike
                </Button>
              </div>
            </div>
            {inboxImages === undefined ? (
              <p className="text-sm text-slate-500">Ucitavanje slika...</p>
            ) : inboxList.length === 0 ? (
              <p className="text-sm text-slate-500">Nema slika u inboxu. Dodaj ih da ih kasnije rasporedis.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {inboxList.map((image, index) => {
                  const safeUrl = image.url ?? "";
                  return (
                    <div
                      key={image._id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={safeUrl}
                        alt={image.fileName ?? "Inbox slika"}
                        className="h-full w-full cursor-pointer object-cover transition duration-200 group-hover:scale-[1.02]"
                        onClick={() => handleOpenInboxPreview(index)}
                      />
                      <div className="absolute inset-0 flex items-start justify-between p-2">
                        <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow">
                          {image.fileName ?? "Slika"}
                        </span>
                        <div className="flex items-center gap-1">
                          {safeUrl ? (
                            <a
                              href={safeUrl}
                              download={image.fileName ?? "slika.jpg"}
                              className="inline-flex items-center justify-center rounded-full bg-white/90 p-1 text-slate-700 shadow hover:bg-white"
                              title="Preuzmi"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full bg-white/90 p-1 text-red-600 shadow hover:bg-white"
                            onClick={() => handleDeleteInboxImage(image._id)}
                            title="Obrisi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              Lista proizvoda ({hasProductSearch ? `${sortedProducts.length} od ${items.length}` : items.length})
            </CardTitle>
            <p className="text-sm text-slate-500">
              {viewMode === "list"
                ? "Klikni na red da otvoris pregled proizvoda."
                : "Klikni na karticu da otvoris pregled proizvoda."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
            <div className="flex flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-2">
              <div className="relative w-full md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={productSearch}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                  }}
                  placeholder="Pretrazi proizvode"
                  className="pl-9"
                  aria-label="Pretraga proizvoda"
                />
              </div>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="md:w-56 text-slate-100" aria-label="Sortiranje proizvoda">
                  <SelectValue className="text-slate-100 data-placeholder:text-slate-400" placeholder="Sortiraj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Najnovije</SelectItem>
                  <SelectItem value="price_desc">Cena (vise prvo)</SelectItem>
                  <SelectItem value="price_asc">Cena (manje prvo)</SelectItem>
                  <SelectItem value="sales_desc">Najvise prodaja</SelectItem>
                  <SelectItem value="profit_desc">Najveci profit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          {sortedProducts.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
              {items.length === 0 ? "Dodaj prvi proizvod." : "Nema proizvoda koji odgovaraju pretrazi."}
            </div>
          ) : viewMode === "list" && !isMobile ? (
            <div className="space-y-2">
              {sortedProducts.map((product) => {
                const mainImage = getMainImage(product);
                const productCategories = (product.categoryIds ?? [])
                  .map((id) => categoryMap.get(id))
                  .filter(Boolean) as Category[];
                const isVariantProduct = (product.variants ?? []).length > 0;
                const hasSocialImage = hasSocialMainImage(product);
                const salesCount = getSalesCount(product);
                const bestSupplier = getBestSupplier(product);
                return (
                  <div
                    key={product._id}
                    className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                    onClick={() => handleRowClick(product._id)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                        {mainImage?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mainImage.url} alt={product.kpName ?? product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                            Bez slike
                          </div>
                        )}
                        {isVariantProduct ? (
                          <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                            <Layers className="h-3 w-3" />
                            Tipski
                          </span>
                        ) : null}
                        {hasSocialImage ? (
                          <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow">
                            <Share2 className="h-3 w-3 text-blue-600" />
                            Social
                          </span>
                        ) : null}
                        {product.publishIg || product.publishFb ? (
                          <div className="absolute bottom-1 right-1 flex gap-1">
                            {product.publishIg ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                <Instagram className="h-3 w-3" />
                                IG
                              </span>
                            ) : null}
                            {product.publishFb ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                <Facebook className="h-3 w-3" />
                                FB
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{product.kpName ?? product.name}</p>
                          <ArrowUpRight className="h-4 w-4 text-slate-400" />
                        </div>
                        {productCategories.length ? (
                          <div className="flex flex-wrap gap-1">
                            {productCategories.slice(0, 3).map((category) => (
                              <span
                                key={category._id}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                              >
                                <Tag className="h-3 w-3 text-slate-500" />
                                {category.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
                            {getDisplayPrice(product)}
                          </span>
                          {bestSupplier ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow ring-1 ring-emerald-100">
                              {formatCurrency(bestSupplier.price, "EUR")}
                              {bestSupplier.supplierName ? (
                                <span className="text-[10px] font-medium text-emerald-700/90">- {bestSupplier.supplierName}</span>
                              ) : null}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Prodato: {salesCount}
                          </span>
                          {isVariantProduct ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                              <Layers className="h-3.5 w-3.5" />
                              Tipovi
                            </span>
                          ) : null}
                          {product.pickupAvailable ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                              <UserRound className="h-3.5 w-3.5" />
                              Licno
                            </span>
                          ) : null}
                          {product.publishIg ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
                              <Instagram className="h-3.5 w-3.5" />
                              IG
                            </span>
                          ) : null}
                          {product.publishFb ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                              <Facebook className="h-3.5 w-3.5" />
                              FB
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStartEdit(product);
                          }}
                        >
                          Izmeni
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(product._id);
                          }}
                        >
                          Obrisi
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {sortedProducts.map((product) => {
                const mainImage = getMainImage(product);
                const productCategories = (product.categoryIds ?? [])
                  .map((id) => categoryMap.get(id))
                  .filter(Boolean) as Category[];
                const isVariantProduct = (product.variants ?? []).length > 0;
                const hasSocialImage = hasSocialMainImage(product);
                const salesCount = getSalesCount(product);
                const bestSupplier = getBestSupplier(product);
                return (
                  <button
                    key={product._id}
                    type="button"
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => handleRowClick(product._id)}
                  >
                    {mainImage?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mainImage.url}
                        alt={product.kpName ?? product.name}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.01] group-hover:blur-[1px]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Bez slike
                      </div>
                    )}
                    <div className="absolute inset-0 z-0 bg-black/35" />
                    <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-slate-900 shadow">
                        {getDisplayPrice(product)}
                      </span>
                      {bestSupplier ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow">
                          {formatCurrency(bestSupplier.price, "EUR")} {bestSupplier.supplierName ? `(${bestSupplier.supplierName})` : ""}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                        <ShoppingBag className="h-4 w-4" />
                        Prodato: {salesCount}
                      </span>
                      {hasSocialImage ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                          <Share2 className="h-4 w-4 text-blue-600" />
                          Social
                        </span>
                      ) : null}
                    </div>
                    {isVariantProduct ? (
                      <span className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-3 py-1 text-sm font-bold text-white shadow-lg">
                        <Layers className="h-5 w-5" />
                        Tipski
                      </span>
                    ) : null}
                    {product.pickupAvailable ? (
                      <span className="absolute left-2 bottom-2 z-20 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow">
                        <UserRound className="h-4 w-4" />
                        Licno
                      </span>
                    ) : null}
                    <div className="absolute right-2 bottom-2 z-30 flex gap-2">
                      {product.publishIg ? (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-[0_0_16px_rgba(244,114,182,0.55)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                          <Instagram className="h-5 w-5 drop-shadow-[0_0_8px_rgba(244,114,182,0.55)]" />
                        </span>
                      ) : null}
                      {product.publishFb ? (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_16px_rgba(37,99,235,0.5)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                          <Facebook className="h-5 w-5 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]" />
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pr-16 pb-6 pt-8 text-left">
                      {productCategories.length > 0 ? (
                        <div className="mb-1 flex flex-wrap gap-1 text-[11px] font-semibold text-slate-200 -translate-y-5">
                          {productCategories.slice(0, 2).map((category) => (
                            <span key={category._id} className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                              {category.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 -translate-y-5">
                        <p className="w-full truncate text-sm font-semibold text-white mb-1">{product.kpName ?? product.name}</p>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/80" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {inboxPreviewImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleCloseInboxPreview}
        >
          <div className="relative w-full max-w-5xl">
            <div className="absolute left-3 top-1/2 flex -translate-y-1/2 gap-2">
              <button
                type="button"
                className="rounded-full bg-white/80 p-2 text-slate-800 shadow"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStepInboxPreview(-1);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-full bg-white/80 p-2 text-slate-800 shadow"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStepInboxPreview(1);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div
              className="relative max-h-[90vh] overflow-hidden rounded-2xl bg-black/50 p-3 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="truncate text-sm font-semibold text-slate-100">
                  {inboxPreviewImage.fileName ?? "Inbox slika"}
                </div>
                <div className="flex items-center gap-2">
                  {inboxPreviewImage.url ? (
                    <a
                      href={inboxPreviewImage.url}
                      download={inboxPreviewImage.fileName ?? "slika.jpg"}
                      className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-800 shadow"
                    >
                      <Download className="h-4 w-4" />
                      Preuzmi
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleDeleteInboxImage(inboxPreviewImage._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Obrisi
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={handleCloseInboxPreview}>
                    Zatvori
                  </Button>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inboxPreviewImage.url ?? ""}
                alt={inboxPreviewImage.fileName ?? "Inbox slika"}
                className="mx-auto max-h-[78vh] w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleClosePreview}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/40 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClosePreview}
              className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 shadow"
            >
              Zatvori
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.alt ?? "Pregled slike"}
              className="mx-auto max-h-[82vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
