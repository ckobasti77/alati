"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { Product } from "@/types/sale";

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
  isDefault: z.boolean(),
});

const productSchema = z
  .object({
    name: z.string().min(2, "Naziv je obavezan."),
    nabavnaCena: priceField("Nabavna cena"),
    prodajnaCena: priceField("Prodajna cena"),
    opis: z.string().max(500, "Opis moze imati najvise 500 karaktera.").optional(),
    variants: z.array(variantSchema).optional(),
  })
  .refine(
    (data) =>
      !data.variants ||
      data.variants.length === 0 ||
      data.variants.some((variant) => variant.isDefault),
    {
      message: "Oznaci bar jedan tip kao glavni.",
      path: ["variants"],
    },
  );

type ProductFormValues = z.infer<typeof productSchema>;

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
  options: { isDefault?: boolean; label?: string; nabavnaCena?: string; prodajnaCena?: string } = {},
) => ({
  id: generateId(),
  label: options.label ?? "",
  nabavnaCena: options.nabavnaCena ?? "",
  prodajnaCena: options.prodajnaCena ?? "",
  isDefault: options.isDefault ?? false,
});

const emptyProductForm = (): ProductFormValues => ({
  name: "",
  nabavnaCena: "",
  prodajnaCena: "",
  opis: "",
  variants: [],
});

export default function ProductsPage() {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const products = useConvexQuery<Product[]>("products:list", {});
  const createProduct = useConvexMutation("products:create");
  const updateProduct = useConvexMutation("products:update");
  const removeProduct = useConvexMutation<{ id: string }>("products:remove");
  const generateUploadUrl = useConvexMutation("images:generateUploadUrl");

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm(),
    mode: "onBlur",
  });
  const variants = (useWatch({ control: form.control, name: "variants" }) ?? []) as ProductFormValues["variants"];
  const normalizedVariants = Array.isArray(variants) ? variants : [];

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
    setEditingProduct(null);
  };

  const buildImagePayload = () => {
    if (images.length === 0) return [];
    let hasMain = images.some((image) => image.isMain);
    return images.map((image, index) => {
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
    const baseNabavna = parsePrice(values.nabavnaCena);
    const baseProdajna = parsePrice(values.prodajnaCena);
    const variants =
      (values.variants ?? []).length > 0
        ? values.variants?.map((variant, index) => ({
            id: variant.id || generateId(),
            label: variant.label.trim() || `Tip ${index + 1}`,
            nabavnaCena: parsePrice(variant.nabavnaCena),
            prodajnaCena: parsePrice(variant.prodajnaCena),
            isDefault: variant.isDefault,
          }))
        : undefined;
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const payload = {
      name: values.name.trim(),
      nabavnaCena: defaultVariant?.nabavnaCena ?? baseNabavna,
      prodajnaCena: defaultVariant?.prodajnaCena ?? baseProdajna,
      opis: values.opis?.trim() ? values.opis.trim() : undefined,
      images: buildImagePayload(),
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
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error("Cuvanje nije uspelo.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProduct({ id });
      toast.success("Proizvod je obrisan.");
      if (editingProduct?._id === id) {
        resetForm();
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

  const handleAddVariant = () => {
    const current = (form.getValues("variants") ?? []) as ProductFormValues["variants"];
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
    const current = (form.getValues("variants") ?? []) as ProductFormValues["variants"];
    if (current.length === 1) {
      form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
      return;
    }
    const next = current.filter((variant) => variant.id !== id);
    if (!next.some((variant) => variant.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleSetDefaultVariant = (id: string) => {
    const current = (form.getValues("variants") ?? []) as ProductFormValues["variants"];
    const next = current.map((variant) => ({
      ...variant,
      isDefault: variant.id === id,
    }));
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleClearVariants = () => {
    form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl({});
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
      }
      toast.success("Slike su uploadovane.");
    } catch (error) {
      console.error(error);
      toast.error("Upload slike nije uspeo.");
    } finally {
      setIsUploadingImages(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSetMainImage = (storageId: string) => {
    setImages((prev) => prev.map((image) => ({ ...image, isMain: image.storageId === storageId })));
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

  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      nabavnaCena: product.nabavnaCena.toString(),
      prodajnaCena: product.prodajnaCena.toString(),
      opis: product.opis ?? "",
      variants: (product.variants ?? []).map((variant, index) => ({
        id: variant.id || generateId(),
        label: variant.label || `Tip ${index + 1}`,
        nabavnaCena: variant.nabavnaCena.toString(),
        prodajnaCena: variant.prodajnaCena.toString(),
        isDefault: variant.isDefault ?? index === 0,
      })),
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
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proizvodi</h1>
          <p className="text-sm text-slate-500">Sacuvaj nabavnu i prodajnu cenu u evrima.</p>
        </div>
      </header>

      <Card className="max-w-2xl">
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
                  <Textarea rows={3} placeholder="npr. Crna boja, 1m duzina" {...field} />
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
            <div className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <FormLabel>Tipovi proizvoda</FormLabel>
                  <p className="text-sm text-slate-500">
                    Podrazumevano koristis cene iznad. Klikni na Dodaj tip da uneses konfiguracije sa sopstvenim cenama.
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
                <p className="text-sm text-slate-500">Nisi dodao tipove – proizvod koristi osnovnu nabavnu/prodajnu cenu.</p>
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
                    </div>
                  ))}
                </div>
              )}
              {variantsError && normalizedVariants.length > 0 && (
                <p className="text-sm text-red-600">{variantsError}</p>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <FormLabel>Slike</FormLabel>
                <p className="text-sm text-slate-500">Dodaj vise slika i oznaci jednu kao glavnu.</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploadingImages}
                onChange={handleFilesSelected}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-60"
              />
              {isUploadingImages && <p className="text-sm text-blue-600">Otpremanje...</p>}
              {images.length === 0 ? (
                <p className="text-sm italic text-slate-500">Jos nema dodatih slika.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {images.map((image) => (
                    <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      {(() => {
                        const resolvedUrl = image.url ?? image.previewUrl;
                        return (
                          <div className="relative aspect-video overflow-hidden rounded-md bg-slate-100">
                            {resolvedUrl ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={resolvedUrl} alt={image.fileName ?? "Product image"} className="h-full w-full object-cover" />
                              </>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs uppercase text-slate-400">
                                Bez pregleda
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 font-medium text-slate-600">
                          <input
                            type="radio"
                            name="main-image"
                            checked={image.isMain}
                            onChange={() => handleSetMainImage(image.storageId)}
                          />
                          Glavna
                        </label>
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

      <Card>
        <CardHeader>
          <CardTitle>Lista proizvoda ({items.length})</CardTitle>
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
                    <TableRow key={product._id}>
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
                        <TableCell className="font-medium text-slate-700">{product.name}</TableCell>
                        <TableCell className="max-w-sm text-sm text-slate-600">
                          {variantsList.length === 0 ? (
                            "-"
                          ) : (
                            <div className="space-y-1">
                              {variantsList.map((variant) => (
                                <div key={variant.id} className="flex items-center justify-between gap-2">
                                  <span className={variant.isDefault ? "font-semibold text-slate-800" : "text-slate-600"}>
                                    {variant.label}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {formatCurrency(variant.prodajnaCena, "EUR")}
                                  </span>
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
                            <Button variant="outline" size="sm" onClick={() => handleStartEdit(product)}>
                              Izmeni
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(product._id)}>
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
    </div>
  );
}
