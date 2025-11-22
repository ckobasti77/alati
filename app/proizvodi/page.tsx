"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, CloudUpload, Images, Plus } from "lucide-react";
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
import type { Product } from "@/types/order";
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
  opis: z.string().max(500, "Opis tipa moze imati najvise 500 karaktera.").optional(),
  isDefault: z.boolean(),
});

const productSchema = z
  .object({
    productType: z.enum(["single", "variant"]),
    name: z.string().min(2, "Naziv je obavezan."),
    nabavnaCena: priceField("Nabavna cena"),
    prodajnaCena: priceField("Prodajna cena"),
    opis: z.string().max(2000, "Opis moze imati najvise 2000 karaktera.").optional(),
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
  name: "",
  nabavnaCena: "",
  prodajnaCena: "",
  opis: "",
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
  const variantUploadInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const fileInputId = useMemo(() => `product-images-${generateId()}`, []);
  const hiddenFileInputStyle = useMemo<CSSProperties>(
    () => ({ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, opacity: 0 }),
    [],
  );
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const createProduct = useConvexMutation("products:create");
  const updateProduct = useConvexMutation("products:update");
  const removeProduct = useConvexMutation<{ id: string; token: string }>("products:remove");
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
  const resolvedProductType = productType ?? "single";
  const normalizedVariants = resolvedProductType === "variant" && Array.isArray(variants) ? variants : [];

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
    const payload = {
      token: sessionToken,
      name: values.name.trim(),
      nabavnaCena: defaultVariant?.nabavnaCena ?? baseNabavna,
      prodajnaCena: defaultVariant?.prodajnaCena ?? baseProdajna,
      opis: values.opis?.trim() ? values.opis.trim() : undefined,
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

  const items = useMemo(() => products ?? [], [products]);
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
    variantUploadInputsRef.current[variantId]?.click();
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
      name: product.name,
      nabavnaCena: product.nabavnaCena.toString(),
      prodajnaCena: product.prodajnaCena.toString(),
      opis: product.opis ?? "",
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
    setIsModalOpen(true);
  };

  const handleRowClick = (id: string) => {
    router.push(`/proizvodi/${id}`);
  };

  return (
    <div className="relative mx-auto max-w-6xl space-y-6">
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
          <div className="max-h-[85vh] overflow-y-auto px-6 pb-6 pt-4 space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle>{editingProduct ? "Izmeni proizvod" : "Novi proizvod"}</DialogTitle>
              <p className="text-sm text-slate-500">
                {editingProduct
                  ? `Trenutno menjas: ${editingProduct.name}`
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
                Obican ima jednu cenu i opis, tipski moze da ima vise tipova sa sopstvenim cenama i opisima.
              </p>
            </div>

      <div className="mx-auto w-full max-w-4xl">
        <Card className="w-full">
        <CardHeader>
          <CardTitle>{editingProduct ? "Izmeni proizvod" : "Novi proizvod"}</CardTitle>
          {editingProduct && (
            <p className="text-sm text-slate-500">
              Trenutno menjas: <span className="font-medium text-slate-700">{editingProduct.name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={handleSubmit} className="space-y-4">
            <FormField
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Naziv</FormLabel>
                  <Input placeholder="npr. USB kabl" {...field} />
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              name="opis"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <Textarea rows={3} placeholder="npr. Crna boja, 1m duzina" autoResize {...field} />
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
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
                    <label
                      htmlFor={fileInputId}
                      className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                        isUploadingImages
                          ? "bg-slate-400 opacity-70"
                          : "bg-blue-600 hover:-translate-y-[1px] hover:bg-blue-700"
                      }`}
                    >
                      Izaberi fajlove
                    </label>
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
        <CardHeader>
          <CardTitle>Lista proizvoda ({items.length})</CardTitle>
          <p className="text-sm text-slate-500">Klikni na red da otvoris pregled proizvoda.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                              <img src={mainImage.url} alt={product.name} className="h-full w-full object-cover" />
                            </div>
                          );
                        }
                        return <div className="h-12 w-12 rounded-md border border-dashed border-slate-200 text-center text-[10px] uppercase text-slate-400">N/A</div>;
                          })()}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            {product.name}
                            <ArrowUpRight className="h-4 w-4 text-slate-400" />
                          </span>
                        </TableCell>
                        <TableCell className="max-w-sm text-sm text-slate-600">
                          {variantsList.length === 0 ? (
                            "-"
                          ) : (
                            <div className="space-y-1">
                              {variantsList.map((variant) => (
                                <div key={variant.id} className="space-y-0.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={variant.isDefault ? "font-semibold text-slate-800" : "text-slate-600"}>
                                      {`${product.name} - ${variant.label}`}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {formatCurrency(variant.prodajnaCena, "EUR")}
                                    </span>
                                  </div>
                                  {variant.opis ? <p className="text-xs text-slate-500">{variant.opis}</p> : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md text-sm text-slate-500">{product.opis ?? "-"}</TableCell>
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
