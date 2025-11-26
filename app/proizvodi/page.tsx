"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, Check, CloudUpload, Images, LayoutGrid, List, Loader2, Plus, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency } from "@/lib/format";
import type { Category, Product } from "@/types/order";
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
  prodajnaCena: priceField("Prodajna cena"),
  opis: z.string().optional(),
  isDefault: z.boolean(),
});

const productSchema = z
  .object({
    productType: z.enum(["single", "variant"]),
    kpName: z.string().min(2, "KP naziv je obavezan."),
    name: z.string().min(2, "FB / Insta naziv je obavezan."),
    nabavnaCena: priceField("Nabavna cena"),
    prodajnaCena: priceField("Prodajna cena"),
    categoryIds: z.array(z.string()).optional(),
    opisKp: z.string().optional(),
    opisFbInsta: z.string().optional(),
    publishKp: z.boolean().optional(),
    publishFb: z.boolean().optional(),
    publishIg: z.boolean().optional(),
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

type DraftImage = {
  storageId: string;
  url?: string | null;
  previewUrl?: string;
  fileName?: string;
  fileType?: string;
  isMain: boolean;
};

type DraftCategoryIcon = {
  storageId: string;
  previewUrl?: string;
  fileName?: string;
  contentType?: string;
};

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
  prodajnaCena: options.prodajnaCena ?? "",
  opis: options.opis ?? "",
  isDefault: options.isDefault ?? false,
});

const emptyProductForm = (): ProductFormValues => ({
  productType: "single",
  kpName: "",
  name: "",
  nabavnaCena: "",
  prodajnaCena: "",
  categoryIds: [],
  opisKp: "",
  opisFbInsta: "",
  publishKp: false,
  publishFb: false,
  publishIg: false,
  variants: [],
});

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
  const [previewImage, setPreviewImage] = useState<{ url: string; alt?: string } | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<DraftCategoryIcon | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const [hasSeededCategories, setHasSeededCategories] = useState(false);
  const variantUploadInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const productUploadInputRef = useRef<HTMLInputElement | null>(null);
  const categoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const dialogScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputId = useMemo(() => `product-images-${generateId()}`, []);
  const hiddenFileInputStyle = useMemo<CSSProperties>(
    () => ({ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, opacity: 0 }),
    [],
  );
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const createProduct = useConvexMutation("products:create");
  const updateProduct = useConvexMutation("products:update");
  const removeProduct = useConvexMutation<{ id: string; token: string }>("products:remove");
  const categories = useConvexQuery<Category[]>("categories:list", { token: sessionToken });
  const createCategory = useConvexMutation<
    {
      token: string;
      name: string;
      icon?: { storageId: string; fileName?: string; contentType?: string };
    },
    string
  >("categories:create");
  const ensureDefaultCategories = useConvexMutation<{ token: string }, { created: number }>("categories:ensureDefaults");
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm(),
    mode: "onBlur",
  });
  useEffect(() => {
    form.register("productType");
  }, [form]);
  const productType = useWatch({ control: form.control, name: "productType" }) as ProductFormValues["productType"];
  const variants = (useWatch({ control: form.control, name: "variants" }) ?? []) as VariantFormEntry[];
  const categoryIds = (useWatch({ control: form.control, name: "categoryIds" }) ?? []) as string[];
  const resolvedProductType = productType ?? "single";
  const normalizedVariants = resolvedProductType === "variant" && Array.isArray(variants) ? variants : [];

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
    variantUploadInputsRef.current = {};
    setEditingProduct(null);
    setIsDraggingFiles(false);
    setCategorySearch("");
    setCategoryMenuOpen(false);
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (newCategoryIcon?.previewUrl) {
      URL.revokeObjectURL(newCategoryIcon.previewUrl);
    }
    setNewCategoryIcon(null);
    setIsUploadingCategoryIcon(false);
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
      };
    });
  };

  const handleSubmit = async (values: ProductFormValues) => {
    const isVariantProduct = values.productType === "variant";
    const baseNabavna = parsePrice(values.nabavnaCena);
    const baseProdajna = parsePrice(values.prodajnaCena);
    const variants =
      isVariantProduct && (values.variants ?? []).length > 0
        ? values.variants?.map((variant, index) => {
            const imagesForVariant = variantImages[variant.id] ?? [];
            const mappedImages = buildImagePayload(imagesForVariant);
            return {
              id: variant.id || generateId(),
              label: variant.label.trim() || `Tip ${index + 1}`,
              nabavnaCena: parsePrice(variant.nabavnaCena),
              prodajnaCena: parsePrice(variant.prodajnaCena),
              opis: variant.opis?.trim() ? variant.opis.trim() : undefined,
              isDefault: variant.isDefault,
              images: mappedImages.length ? mappedImages : undefined,
            };
          })
        : undefined;
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const fbName = values.name.trim();
    const kpName = values.kpName.trim() || fbName;
    const payload = {
      token: sessionToken,
      name: fbName,
      kpName,
      nabavnaCena: defaultVariant?.nabavnaCena ?? baseNabavna,
      prodajnaCena: defaultVariant?.prodajnaCena ?? baseProdajna,
      opisKp: values.opisKp?.trim() ? values.opisKp.trim() : undefined,
      opisFbInsta: values.opisFbInsta?.trim() ? values.opisFbInsta.trim() : undefined,
      publishKp: Boolean(values.publishKp),
      publishFb: Boolean(values.publishFb),
      publishIg: Boolean(values.publishIg),
      categoryIds: (values.categoryIds ?? []).filter(Boolean),
      images: buildImagePayload(images),
      variants,
    };

    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, ...payload });
        toast.success("Proizvod je azuriran.");
      } else {
        await createProduct(payload);
        toast.success("Proizvod je dodat.");
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
  const filteredCategories = useMemo(() => {
    const list = categories ?? [];
    const needle = categorySearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((category) => category.name.toLowerCase().includes(needle));
  }, [categories, categorySearch]);
  const selectedCategories = useMemo(() => {
    if (!categories) return [];
    const map = new Map(categories.map((category) => [category._id, category]));
    return categoryIds.map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [categories, categoryIds]);
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    (categories ?? []).forEach((category) => {
      map.set(category._id, category);
    });
    return map;
  }, [categories]);
  const variantsFieldError = form.formState.errors.variants;
  const variantsError =
    variantsFieldError && !Array.isArray(variantsFieldError) ? (variantsFieldError.message as string | undefined) : undefined;

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

  const handleRemoveVariant = (id: string) => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    if (current.length === 1) {
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
        prodajnaCena: variant.prodajnaCena.toString(),
        opis: variant.opis ?? "",
        isDefault: variant.isDefault ?? index === 0,
      };
    });
    form.reset({
      productType: (product.variants ?? []).length > 0 ? "variant" : "single",
      kpName: product.kpName ?? product.name,
      name: product.name,
      nabavnaCena: product.nabavnaCena.toString(),
      prodajnaCena: product.prodajnaCena.toString(),
      categoryIds: product.categoryIds ?? [],
      opisKp: product.opisKp ?? "",
      opisFbInsta: product.opisFbInsta ?? product.opis ?? "",
      publishKp: product.publishKp ?? false,
      publishFb: product.publishFb ?? false,
      publishIg: product.publishIg ?? false,
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
        }));
      });
      return map;
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
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                name="publishKp"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <input
                      id="publish-kp"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FormLabel htmlFor="publish-kp" className="m-0 cursor-pointer">
                      Objavi na KP
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                name="publishFb"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <input
                      id="publish-fb"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FormLabel htmlFor="publish-fb" className="m-0 cursor-pointer">
                      Objavi na Facebook
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                name="publishIg"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <input
                      id="publish-ig"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FormLabel htmlFor="publish-ig" className="m-0 cursor-pointer">
                      Objavi na Instagram
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
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 11.90"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="prodajnaCena"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Prodajna cena (EUR)</FormLabel>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 15.50"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            {resolvedProductType === "variant" && (
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
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="npr. 120.00"
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
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
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="npr. 150.00"
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                />
                                <FormMessage>{fieldState.error?.message}</FormMessage>
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
                            {variantImages[variant.id]?.map((image) => (
                              <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                                {(() => {
                                  const resolvedUrl = image.url ?? image.previewUrl;
                                  return (
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
                                  );
                                })()}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 font-medium text-slate-600">
                                      <input
                                        type="radio"
                                        name={`variant-main-${variant.id}`}
                                        checked={image.isMain}
                                        onChange={() => handleSetVariantMainImage(variant.id, image.storageId)}
                                      />
                                      Glavna
                                    </label>
                                    {(() => {
                                      const resolvedUrl = image.url ?? image.previewUrl;
                                      if (!resolvedUrl) return null;
                                      return (
                                        <Button type="button" variant="secondary" size="sm" asChild>
                                          <a href={resolvedUrl} download={image.fileName ?? "slika"}>
                                            Preuzmi
                                          </a>
                                        </Button>
                                      );
                                    })()}
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
                            ))}
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
            )}
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
                  {images.map((image) => (
                    <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      {(() => {
                        const resolvedUrl = image.url ?? image.previewUrl;
                        return (
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
                        );
                      })()}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 font-medium text-slate-600">
                            <input
                              type="radio"
                              name="main-image"
                              checked={image.isMain}
                              onChange={() => handleSetMainImage(image.storageId)}
                            />
                            Glavna
                          </label>
                          {(() => {
                            const resolvedUrl = image.url ?? image.previewUrl;
                            if (!resolvedUrl) return null;
                            return (
                              <Button type="button" variant="secondary" size="sm" asChild>
                                <a href={resolvedUrl} download={image.fileName ?? "slika"}>
                                  Preuzmi
                                </a>
                              </Button>
                            );
                          })()}
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage(image.storageId)}>
                          Ukloni
                        </Button>
                      </div>
                      {image.fileName && <p className="truncate text-xs text-slate-500">{image.fileName}</p>}
                    </div>
                  ))}
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

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Lista proizvoda ({items.length})</CardTitle>
            <p className="text-sm text-slate-500">
              {viewMode === "list"
                ? "Klikni na red da otvoris pregled proizvoda."
                : "Klikni na sliku da otvoris pregled proizvoda."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
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
        </CardHeader>
        <CardContent className={viewMode === "list" ? "overflow-x-auto" : "pb-6"}>
          {viewMode === "list" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slika</TableHead>
                  <TableHead>Naziv</TableHead>
                  <TableHead>Tipovi</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead className="text-right">Nabavna (EUR)</TableHead>
                  <TableHead className="text-right">Prodajna (EUR)</TableHead>
                  <TableHead>Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-slate-500">
                      Dodaj prvi proizvod.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((product) => {
                    const variantsList = product.variants ?? [];
                    const defaultVariant = variantsList.find((variant) => variant.isDefault) ?? variantsList[0];
                    const productCategories = (product.categoryIds ?? [])
                      .map((id) => categoryMap.get(id))
                      .filter(Boolean) as Category[];
                    return (
                      <TableRow
                        key={product._id}
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => handleRowClick(product._id)}
                      >
                        <TableCell>
                          {(() => {
                            const images = product.images ?? [];
                            const mainImage = images.find((image) => image.isMain) ?? images[0];
                            if (mainImage?.url) {
                              return (
                                <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={mainImage.url} alt={product.kpName ?? product.name} className="h-full w-full object-cover" />
                                </div>
                              );
                            }
                            return (
                              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-200 text-center text-[10px] uppercase text-slate-400">
                                N/A
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-slate-900">
                              {product.kpName ?? product.name}
                              <ArrowUpRight className="h-4 w-4 text-slate-400" />
                            </span>
                            <p className="text-xs text-slate-500">FB/IG: {product.name}</p>
                            {productCategories.length ? (
                              <div className="flex flex-wrap gap-1">
                                {productCategories.map((category) => (
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
                          </div>
                        </TableCell>
                        <TableCell className="max-w-sm text-sm text-slate-600">
                          {variantsList.length === 0 ? (
                            "-"
                          ) : (
                            <div className="space-y-1">
                              {variantsList.map((variant) => (
                                <div key={variant.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200/80 px-3 py-1">
                                  <span className={variant.isDefault ? "font-semibold text-slate-800" : "text-slate-700"}>
                                    {variant.label}
                                  </span>
                                  <div className="text-right text-[11px] leading-tight text-slate-500">
                                    <div>Nab {formatCurrency(variant.nabavnaCena, "EUR")}</div>
                                    <div className="font-semibold text-slate-700">
                                      {formatCurrency(variant.prodajnaCena, "EUR")}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md align-top text-sm text-slate-600">
                          {(() => {
                            const preview = product.opisKp || product.opisFbInsta || product.opis || "";
                            if (!preview.trim()) return <span className="text-slate-400">-</span>;
                            return <span className="line-clamp-3 block whitespace-pre-wrap">{preview}</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(defaultVariant?.nabavnaCena ?? product.nabavnaCena, "EUR")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(defaultVariant?.prodajnaCena ?? product.prodajnaCena, "EUR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
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
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : (
            <>
              {items.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Dodaj prvi proizvod.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((product) => {
                    const images = product.images ?? [];
                    const mainImage = images.find((image) => image.isMain) ?? images[0];
                    const mainUrl = mainImage?.url;
                    const productCategories = (product.categoryIds ?? [])
                      .map((id) => categoryMap.get(id))
                      .filter(Boolean) as Category[];
                    return (
                      <button
                        key={product._id}
                        type="button"
                        className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        onClick={() => handleRowClick(product._id)}
                      >
                        {mainUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mainUrl} alt={product.kpName ?? product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Bez slike
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-6 text-white">
                          {productCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-1 text-[11px] font-semibold text-slate-200">
                              {productCategories.slice(0, 2).map((category) => (
                                <span key={category._id} className="rounded-full bg-white/15 px-2 py-0.5 backdrop-blur">
                                  {category.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <p className="w-full truncate text-sm font-semibold">{product.kpName ?? product.name}</p>
                            <ArrowUpRight className="h-4 w-4 flex-shrink-0" />
                          </div>
                          <p className="truncate text-[11px] text-slate-200">FB/IG: {product.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
