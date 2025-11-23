"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Download, ImageOff, Loader2, Maximize2, PenLine, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Product, ProductImage, ProductVariant } from "@/types/order";

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
  const updateProduct = useConvexMutation("products:update");
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");
  const [product, setProduct] = useState<ProductWithUrls | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt?: string } | null>(null);

  const isLoading = queryResult === undefined;

  useEffect(() => {
    if (queryResult !== undefined) {
      setProduct(queryResult);
    }
  }, [queryResult]);

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
    return {
      token: sessionToken,
      id: current._id,
      name: current.name,
      nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
      prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
      opis: current.opis,
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

  const ensureMainImage = (list: (ProductImage & { url?: string | null })[] = []) => {
    if (list.length === 0) return [];
    if (list.some((image) => image.isMain)) return list;
    const [first, ...rest] = list;
    return [{ ...first, isMain: true }, ...rest];
  };

  const handleBaseFieldSave = async (field: "name" | "opis" | "nabavnaCena" | "prodajnaCena", value: string) => {
    const trimmed = value.trim();
    if (!product) return;
    if (field === "name" && trimmed.length < 2) {
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
        [field]: trimmed.length === 0 ? undefined : trimmed,
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
        alt: product.name,
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
                {product.name}
                {product.variants && product.variants.length > 0 ? (
                  <Badge variant="yellow">Tipski</Badge>
                ) : (
                  <Badge variant="green">Obican</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-slate-500">Textualni podaci su editabilni na licu mesta.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <InlineField label="Naziv" value={product.name} onSave={(val) => handleBaseFieldSave("name", val)} />
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
                label="Opis"
                value={product.opis ?? ""}
                multiline
                onSave={(val) => handleBaseFieldSave("opis", val)}
              />
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
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:shadow-md"
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
                ))}
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
