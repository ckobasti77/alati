"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent as ReactDragEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download, GripVertical, ImageOff, Loader2, Maximize2, PenLine, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Category, Product, ProductImage, ProductVariant } from "@/types/order";

type ProductWithUrls = Product & {
  images?: (ProductImage & { url?: string | null })[];
  variants?: (ProductVariant & { images?: (ProductImage & { url?: string | null })[] })[];
};

type GalleryItem = {
  id: string;
  storageId: string;
  url: string;
  alt: string;
  label: string;
  fileName?: string | null;
  isMain: boolean;
  origin: { type: "product" } | { type: "variant"; variantId: string };
};

type DraftCategoryIcon = {
  storageId: string;
  previewUrl?: string;
  fileName?: string;
  contentType?: string;
};

const parsePrice = (value: string) => {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return NaN;
  return Number(normalized);
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
                className="text-sm"
              />
            )
          ) : (
            <p className="text-base font-semibold text-slate-900">{displayValue}</p>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-1 py-0.5 text-slate-500 shadow-sm opacity-0 transition group-hover:opacity-100">
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
  const queryResult = useConvexQuery<ProductWithUrls | null>("products:get", { token: sessionToken, id: productId });
  const categories = useConvexQuery<Category[]>("categories:list", { token: sessionToken });
  const updateProduct = useConvexMutation("products:update");
  const createCategory = useConvexMutation<
    {
      token: string;
      name: string;
      icon?: { storageId: string; fileName?: string; contentType?: string };
    },
    string
  >("categories:create");
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");
  const [product, setProduct] = useState<ProductWithUrls | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt?: string } | null>(null);
  const [draggingItem, setDraggingItem] = useState<GalleryItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<DraftCategoryIcon | null>(null);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const categoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  const isLoading = queryResult === undefined;

  useEffect(() => {
    if (queryResult !== undefined) {
      setProduct(queryResult);
    }
  }, [queryResult]);

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

  const buildUpdatePayload = (current: ProductWithUrls) => {
    const variants = current.variants?.map((variant) => ({
      id: variant.id,
      label: variant.label,
      nabavnaCena: variant.nabavnaCena,
      prodajnaCena: variant.prodajnaCena,
      isDefault: variant.isDefault,
      opis: variant.opis,
      images: (variant.images ?? []).map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
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
      prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
      opis: resolvedOpisFb,
      opisKp: current.opisKp,
      opisFbInsta: resolvedOpisFb,
      publishKp: current.publishKp,
      publishFb: current.publishFb,
      publishIg: current.publishIg,
      categoryIds: current.categoryIds ?? [],
      variants,
      images: (current.images ?? []).map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
      })),
    };
  };

  const applyUpdate = async (updater: (current: ProductWithUrls) => ProductWithUrls, successMessage?: string) => {
    if (!product) return;
    const previous = product;
    const next = updater(previous);
    setProduct(next);
    try {
      await updateProduct(buildUpdatePayload(next));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      console.error(error);
      setProduct(previous);
      toast.error("Cuvanje nije uspelo.");
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

  const ensureMainImage = (list: (ProductImage & { url?: string | null })[] = []) => {
    if (list.length === 0) return [];
    if (list.some((image) => image.isMain)) return list;
    const [first, ...rest] = list;
    return [{ ...first, isMain: true }, ...rest];
  };

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

  const handlePublishToggle = async (field: "publishKp" | "publishFb" | "publishIg", value: boolean) => {
    await applyUpdate(
      (current) => ({
        ...current,
        [field]: value,
      }),
      "Sacuvano.",
    );
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
          return {
            ...current,
            images: images.map((image) => ({ ...image, isMain: image.storageId === item.storageId })),
          };
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
            return {
              ...variant,
              images: variantImages.map((image) => ({ ...image, isMain: image.storageId === item.storageId })),
            };
          }),
        };
      },
      "Glavna slika podesena.",
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

  const handleGalleryDragStart = (event: React.DragEvent<HTMLDivElement>, item: GalleryItem) => {
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", item.id);
    } catch {
      // ignore
    }
    setDraggingItem(item);
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

  const handleGalleryDragLeave = (target: GalleryItem) => {
    if (!draggingItem || !isSameGalleryGroup(draggingItem, target)) return;
    setDragOverId((current) => (current === target.id ? null : current));
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
          url: URL.createObjectURL(file),
        });
      }

      await applyUpdate(
        (current) => {
          const baseImages = current.images ?? [];
          let hasMain = baseImages.some((image) => image.isMain);
          const merged = [...baseImages, ...additions].map((image, index) => {
            if (!hasMain && (index === 0 || additions.includes(image))) {
              hasMain = true;
              return { ...image, isMain: true };
            }
            return image;
          });
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

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadImages(files);
    event.target.value = "";
  };

  const handleOpenPreview = (item: GalleryItem) => {
    if (!item.url) return;
    setPreviewImage({ url: item.url, alt: item.alt || item.label });
  };

  const handleClosePreview = () => setPreviewImage(null);

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
          origin: { type: "variant" as const, variantId: variant.id },
        })),
      ) ?? [];
    return [...baseImages, ...variantImages].filter((item) => Boolean(item.url));
  }, [product]);
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

      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-4">
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
              <InlineField
                label="Prodajna cena (EUR)"
                value={product.prodajnaCena}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleBaseFieldSave("prodajnaCena", val)}
              />
              <InlineField
                label="Nabavna cena (EUR)"
                value={product.nabavnaCena}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleBaseFieldSave("nabavnaCena", val)}
              />
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
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  { key: "publishKp" as const, label: "Objava KP", checked: product.publishKp },
                  { key: "publishFb" as const, label: "Objava Facebook", checked: product.publishFb },
                  { key: "publishIg" as const, label: "Objava Instagram", checked: product.publishIg },
                ]).map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(item.checked)}
                      onChange={(event) => handlePublishToggle(item.key, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {item.label}
                  </label>
                ))}
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
              <CardTitle className="flex items-center gap-2">Tipovi proizvoda</CardTitle>
              <p className="text-sm text-slate-500">
                Edit dugme otvara input sa selektovanim tekstom, copy kopira vrednost polja.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {(product.variants ?? []).length === 0 ? (
                <p className="text-sm text-slate-600">Ovaj proizvod nema dodatne tipove.</p>
              ) : (
                product.variants?.map((variant) => (
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
                      <InlineField
                        label="Nabavna cena (EUR)"
                        value={variant.nabavnaCena}
                        formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                        onSave={(val) => handleVariantFieldSave(variant.id, "nabavnaCena", val)}
                      />
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
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Galerija slika
                <Badge variant="default">{gallery.length}</Badge>
              </CardTitle>
              <p className="text-sm text-slate-500">Desno kreativan grid sa slikama proizvoda i tipova.</p>
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
            {gallery.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-slate-500">
                <ImageOff className="h-8 w-8" />
                <p className="text-sm">Trenutno nema slika za ovaj proizvod.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {gallery.map((item, index) => {
                  const shiftClass = getShiftClass(item, index);
                  const isDragOver = dragOverId === item.id && draggingSameGroup;
                  return (
                  <div
                    key={item.id}
                    className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-200 hover:shadow-md ${shiftClass} ${
                      isDragOver ? "ring-1 ring-blue-200" : ""
                    }`}
                    draggable
                    onDragStart={(event) => handleGalleryDragStart(event, item)}
                    onDragOver={(event) => handleGalleryDragOver(event, item)}
                    onDrop={(event) => handleGalleryDrop(event, item)}
                    onDragEnd={handleGalleryDragEnd}
                    onDragLeave={() => handleGalleryDragLeave(item)}
                    onClick={() => handleOpenPreview(item)}
                  >
                    <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm opacity-0 transition group-hover:opacity-100">
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
                    <a
                      href={item.url}
                      download={item.fileName ?? `${item.id}.jpg`}
                      className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm opacity-0 transition hover:bg-slate-100 group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                      Preuzmi
                    </a>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
