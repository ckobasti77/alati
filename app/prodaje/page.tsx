"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { ukupnoNabavno, ukupnoProdajno, profit } from "@/lib/calc";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { Product, ProductVariant, Sale, SaleListResponse } from "@/types/sale";

const saleSchema = z.object({
  productId: z
    .string({ required_error: "Proizvod je obavezan." })
    .min(1, "Proizvod je obavezan."),
  variantId: z.string().optional(),
  buyerName: z.string().min(2, "Ime kupca je obavezno."),
});

type SaleFormValues = z.infer<typeof saleSchema>;

const getProductVariants = (product?: Product): ProductVariant[] => {
  if (!product) return [];
  return product.variants ?? [];
};

export default function SalesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const list = useConvexQuery<SaleListResponse>("sales:list", {
    search: search.trim() ? search.trim() : undefined,
    page,
    pageSize: 50,
  });
  const deleteSale = useConvexMutation<{ id: string }>("sales:remove");
  const createSale = useConvexMutation("sales:create");
  const updateSale = useConvexMutation("sales:update");
  const products = useConvexQuery<Product[]>("products:list", {});

  const items = useMemo<Sale[]>(() => list?.items ?? [], [list]);
  const saleEntries = useMemo(
    () =>
      items.map((sale) => {
        const prodajnoUkupno = ukupnoProdajno(sale.kolicina, sale.prodajnaCena);
        const nabavnoUkupno = ukupnoNabavno(sale.kolicina, sale.nabavnaCena);
        const prof = profit(prodajnoUkupno, nabavnoUkupno);
        return { sale, prodajnoUkupno, nabavnoUkupno, prof };
      }),
    [items],
  );
  const pagination = list?.pagination ?? { page: 1, pageSize: 50, total: 0, totalPages: 1 };
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((product) => {
      if (product.name.toLowerCase().includes(needle)) return true;
      const opis = product.opis?.toLowerCase() ?? "";
      if (opis.includes(needle)) return true;
      return (product.variants ?? []).some((variant) => variant.label.toLowerCase().includes(needle));
    });
  }, [products, productSearch]);
  const isProductsLoading = products === undefined;

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      productId: "",
      variantId: "",
      buyerName: "",
    },
    mode: "onBlur",
  });
  const productIdValue = useWatch({ control: form.control, name: "productId" });
  const variantIdValue = useWatch({ control: form.control, name: "variantId" });
  const selectedProduct = useMemo(
    () => (products ?? []).find((item) => item._id === productIdValue),
    [products, productIdValue],
  );
  const selectedVariants = useMemo(() => getProductVariants(selectedProduct), [selectedProduct]);
  useEffect(() => {
    if (!productIdValue || !selectedProduct || selectedVariants.length === 0) {
      if (variantIdValue) {
        form.setValue("variantId", "", { shouldDirty: true, shouldValidate: true });
      }
      return;
    }
    if (!selectedVariants.some((variant) => variant.id === variantIdValue)) {
      const fallback = selectedVariants.find((variant) => variant.isDefault) ?? selectedVariants[0];
      form.setValue("variantId", fallback.id, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, productIdValue, selectedProduct, selectedVariants, variantIdValue]);

  const resetSaleForm = () => {
    form.reset({ productId: "", variantId: "", buyerName: "" });
    setProductInput("");
    setProductSearch("");
    setProductMenuOpen(false);
    setEditingSale(null);
  };

  const handleSubmitSale = async (values: SaleFormValues) => {
    const product = (products ?? []).find((item) => item._id === values.productId);
    if (!product) {
      toast.error("Nije moguce pronaci izabran proizvod.");
      return;
    }

    try {
      const variantsList = product.variants ?? [];
      let variant = variantsList.find((item) => item.id === values.variantId);
      if (variantsList.length > 0 && !variant) {
        variant = variantsList.find((item) => item.isDefault) ?? variantsList[0];
      }
      const payload = {
        productId: product._id,
        variantId: variant?.id,
        variantLabel: variant?.label,
        title: product.name,
        kolicina: 1,
        nabavnaCena: variant?.nabavnaCena ?? product.nabavnaCena,
        prodajnaCena: variant?.prodajnaCena ?? product.prodajnaCena,
        buyerName: values.buyerName.trim(),
      };

      if (editingSale) {
        await updateSale({ id: editingSale._id, ...payload });
        toast.success("Prodaja je azurirana.");
      } else {
        await createSale(payload);
        toast.success("Prodaja je dodata.");
      }
      resetSaleForm();
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce sacuvati prodaju.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSale({ id });
      toast.success("Prodaja je obrisana.");
      if (editingSale?._id === id) {
        resetSaleForm();
      }
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    }
  };

  const handleStartSaleEdit = (sale: Sale) => {
    setEditingSale(sale);
    const product = sale.productId ? (products ?? []).find((item) => item._id === sale.productId) : undefined;
    const productVariants = getProductVariants(product);
    let resolvedVariantId: string | undefined = sale.variantId ?? "";
    if (productVariants.length === 0) {
      resolvedVariantId = "";
    } else if (!resolvedVariantId) {
      resolvedVariantId = productVariants.find((variant) => variant.isDefault)?.id ?? productVariants[0].id;
    } else if (!productVariants.some((variant) => variant.id === resolvedVariantId)) {
      resolvedVariantId = productVariants.find((variant) => variant.isDefault)?.id ?? productVariants[0].id;
    }
    form.reset({
      productId: sale.productId ?? "",
      variantId: resolvedVariantId ?? "",
      buyerName: sale.buyerName ?? "",
    });
    if (sale.productId) {
      setProductInput(product ? product.name : sale.title);
    } else {
      setProductInput(sale.title);
    }
    setProductSearch("");
    setProductMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prodaje</h1>
          <p className="text-sm text-slate-500">Zabelezi svaku prodaju i vidi koliki je profit.</p>
        </div>
      </header>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{editingSale ? "Izmeni prodaju" : "Nova prodaja"}</CardTitle>
          {editingSale && (
            <p className="text-sm text-slate-500">
              Menjas prodaju za: <span className="font-medium text-slate-700">{editingSale.title}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={handleSubmitSale} className="space-y-4">
            <FormField
              name="productId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Proizvod</FormLabel>
                  <div className="relative">
                    <Input
                      value={productInput}
                      placeholder={isProductsLoading ? "Ucitavanje..." : "Pretrazi proizvod"}
                      disabled={isProductsLoading || (products?.length ?? 0) === 0}
                      onChange={(event) => {
                        const value = event.target.value;
                        setProductInput(value);
                        setProductSearch(value);
                        setProductMenuOpen(true);
                        if (!value) {
                          field.onChange("");
                          form.setValue("variantId", "", { shouldDirty: true, shouldValidate: true });
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
                        // Delay closing so onMouseDown in list can run first.
                        setTimeout(() => setProductMenuOpen(false), 150);
                      }}
                    />
                    {productMenuOpen && (
                      <div className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {isProductsLoading ? (
                          <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                        ) : filteredProducts.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                        ) : (
                          filteredProducts.map((product) => (
                            <button
                              key={product._id}
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                field.onChange(product._id);
                                setProductInput(product.name);
                                setProductSearch("");
                                setProductMenuOpen(false);
                                const productVariants = getProductVariants(product);
                                const defaultVariant = productVariants.find((variant) => variant.isDefault) ?? productVariants[0];
                                form.setValue("variantId", defaultVariant ? defaultVariant.id : "", {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              {(() => {
                                const images = product.images ?? [];
                                const mainImage = images.find((image) => image.isMain) ?? images[0];
                                if (mainImage?.url) {
                                  return (
                                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={mainImage.url} alt={product.name} className="h-full w-full object-cover" />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                                    N/A
                                  </div>
                                );
                              })()}
                              <div className="flex flex-1 flex-col gap-0.5">
                                <span className="font-medium">{product.name}</span>
                                {product.opis && <span className="text-xs text-slate-500">{product.opis}</span>}
                                <span className="text-xs text-slate-500">
                                  Nabavna {formatCurrency(product.nabavnaCena, "EUR")} / Prodajna {formatCurrency(product.prodajnaCena, "EUR")}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            {selectedVariants.length > 0 && (
              <FormField
                name="variantId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Tip proizvoda</FormLabel>
                    <div className="grid gap-2">
                      {selectedVariants.map((variant) => {
                        const isSelected = field.value === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-900"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                            onClick={() => field.onChange(variant.id)}
                          >
                            <div>
                              <p className="font-medium">{variant.label}</p>
                              <p className="text-xs text-slate-500">
                                Nabavna {formatCurrency(variant.nabavnaCena, "EUR")} / Prodajna{" "}
                                {formatCurrency(variant.prodajnaCena, "EUR")}
                              </p>
                            </div>
                            {isSelected && <span className="text-xs font-semibold uppercase text-blue-600">izabrano</span>}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            )}
            <FormField
              name="buyerName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Ime kupca</FormLabel>
                  <Input placeholder="npr. Marko Markovic" {...field} />
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={resetSaleForm}
              >
                {editingSale ? "Otkazi izmene" : "Ponisti"}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingSale ? "Azuriraj" : "Sacuvaj"}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Lista prodaja</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Pretraga naslova"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="sm:w-60"
            />
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>
                {pagination.total === 0
                  ? "Nema podataka"
                  : `${(pagination.page - 1) * pagination.pageSize + 1} - ${Math.min(
                      pagination.page * pagination.pageSize,
                      pagination.total,
                    )} od ${pagination.total}`}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Naslov</TableHead>
                    <TableHead>Kupac</TableHead>
                    <TableHead>Kolicina</TableHead>
                    <TableHead className="text-right">Prodajno (EUR)</TableHead>
                    <TableHead className="text-right">Nabavno (EUR)</TableHead>
                    <TableHead className="text-right">Profit (EUR)</TableHead>
                    <TableHead>Napomena</TableHead>
                    <TableHead>Akcije</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-slate-500">
                        Jos nema prodaja.
                      </TableCell>
                    </TableRow>
                  ) : (
                    saleEntries.map(({ sale, prodajnoUkupno, nabavnoUkupno, prof }) => (
                      <TableRow key={sale._id}>
                        <TableCell>{formatDate(sale.kreiranoAt)}</TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {sale.title}
                          {sale.variantLabel && (
                            <span className="block text-xs font-normal text-slate-500">{sale.variantLabel}</span>
                          )}
                        </TableCell>
                        <TableCell>{sale.buyerName ?? "-"}</TableCell>
                        <TableCell>{sale.kolicina}</TableCell>
                        <TableCell className="text-right">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={prof < 0 ? "text-red-600" : ""}>{formatCurrency(prof, "EUR")}</span>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm text-slate-500">
                          {sale.napomena || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleStartSaleEdit(sale)}>
                              Izmeni
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(sale._id)}>
                              Obrisi
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-4 md:hidden">
            {saleEntries.length === 0 ? (
              <p className="text-center text-sm text-slate-500">Jos nema prodaja.</p>
            ) : (
              saleEntries.map(({ sale, prodajnoUkupno, nabavnoUkupno, prof }) => (
                <div key={sale._id} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase text-slate-400">{formatDate(sale.kreiranoAt)}</p>
                      <h3 className="text-base font-semibold text-slate-800">{sale.title}</h3>
                      {sale.variantLabel && (
                        <p className="text-xs font-medium text-slate-500">{sale.variantLabel}</p>
                      )}
                    </div>
                    <div className="text-right text-sm font-semibold">
                      <span className={prof < 0 ? "text-red-600" : "text-emerald-600"}>
                        {formatCurrency(prof, "EUR")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-slate-500">Kupac</p>
                      <p className="font-medium text-slate-700">{sale.buyerName ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Kolicina</p>
                      <p className="font-medium text-slate-700">{sale.kolicina}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Prodajno</p>
                      <p className="font-medium text-slate-700">{formatCurrency(prodajnoUkupno, "EUR")}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Nabavno</p>
                      <p className="font-medium text-slate-700">{formatCurrency(nabavnoUkupno, "EUR")}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-slate-500">Napomena</p>
                      <p className="text-sm text-slate-600">{sale.napomena || "-"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleStartSaleEdit(sale)}>
                      Izmeni
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(sale._id)}>
                      Obrisi
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


