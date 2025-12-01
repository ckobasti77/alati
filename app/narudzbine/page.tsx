"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { myProfitShare, profit, ukupnoNabavno, ukupnoProdajno } from "@/lib/calc";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { cn } from "@/lib/utils";
import type { Order, OrderListResponse, OrderStage, Product, ProductVariant } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";

const stageOptions: { value: OrderStage; label: string; tone: string }[] = [
  { value: "poruceno", label: "Poruceno", tone: "border-amber-200 bg-amber-50 text-amber-800" },
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
  stage: z.enum(["poruceno", "poslato", "stiglo", "legle_pare"]),
  productId: z
    .string({ required_error: "Proizvod je obavezan." })
    .min(1, "Proizvod je obavezan."),
  variantId: z.string().optional(),
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
    z.number().min(0, "Transport mora biti 0 ili vise.").optional(),
  ),
  transportMode: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      return typeof value === "string" ? value : undefined;
    },
    z.enum(transportModes).optional(),
  ),
  pickup: z.boolean().optional(),
  myProfitPercent: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    z.number().min(0, "Minimalno 0%").max(100, "Maksimalno 100%").optional(),
  ),
  note: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const defaultFormValues: OrderFormValues = {
  stage: "poruceno",
  productId: "",
  variantId: "",
  customerName: "",
  address: "",
  phone: "",
  transportCost: undefined,
  transportMode: undefined,
  pickup: false,
  myProfitPercent: undefined,
  note: "",
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
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const list = useConvexQuery<OrderListResponse>("orders:list", {
    token: sessionToken,
    search: search.trim() ? search.trim() : undefined,
    page,
    pageSize: 50,
  });
  const deleteOrder = useConvexMutation<{ id: string; token: string }>("orders:remove");
  const createOrder = useConvexMutation("orders:create");
  const updateOrder = useConvexMutation("orders:update");
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });

  const items = useMemo<Order[]>(() => list?.items ?? [], [list]);
  const orderEntries = useMemo(
    () =>
      items.map((order) => {
        const prodajnoUkupno = ukupnoProdajno(order.kolicina, order.prodajnaCena);
        const nabavnoUkupno = ukupnoNabavno(order.kolicina, order.nabavnaCena);
        const transport = order.transportCost ?? 0;
        const prof = profit(prodajnoUkupno, nabavnoUkupno, transport);
        const mojDeo = myProfitShare(prof, order.myProfitPercent ?? 0);
        return { order, prodajnoUkupno, nabavnoUkupno, transport, prof, mojDeo };
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
  const isProductsLoading = products === undefined;
  const isOrdersLoading = list === undefined;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: defaultFormValues,
    mode: "onBlur",
  });
  const productIdValue = useWatch({ control: form.control, name: "productId" });
  const variantIdValue = useWatch({ control: form.control, name: "variantId" });
  const selectedProduct = useMemo(
    () => (products ?? []).find((item) => item._id === productIdValue),
    [products, productIdValue],
  );
  const selectedVariants = useMemo(() => getProductVariants(selectedProduct), [selectedProduct]);
  const selectedVariantForPreview = useMemo(() => {
    if (!selectedProduct) return undefined;
    const variants = selectedProduct.variants ?? [];
    if (variants.length === 0) return undefined;
    if (variantIdValue) {
      const match = variants.find((variant) => variant.id === variantIdValue);
      if (match) return match;
    }
    return variants.find((variant) => variant.isDefault) ?? variants[0];
  }, [selectedProduct, variantIdValue]);

  useEffect(() => {
    if (!productIdValue || !selectedProduct || selectedVariants.length === 0) {
      if (variantIdValue) {
        form.setValue("variantId", "", { shouldDirty: false, shouldValidate: true });
      }
      return;
    }
    const selectedExists = selectedVariants.some((variant) => variant.id === variantIdValue);
    if (!selectedExists) {
      const fallbackVariant = selectedVariants.find((variant) => variant.isDefault) ?? selectedVariants[0];
      if (fallbackVariant) {
        form.setValue("variantId", fallbackVariant.id, { shouldDirty: false, shouldValidate: true });
        setProductInput(composeVariantLabel(selectedProduct, fallbackVariant));
      }
    }
  }, [form, productIdValue, selectedProduct, selectedVariants, setProductInput, variantIdValue]);

  const resetOrderForm = (options?: { closeModal?: boolean }) => {
    form.reset(defaultFormValues);
    setProductInput("");
    setProductSearch("");
    setProductMenuOpen(false);
    setExpandedProductId(null);
    setEditingOrder(null);
    if (options?.closeModal) {
      setIsModalOpen(false);
    }
  };

  const openCreateModal = () => {
    resetOrderForm();
    setIsModalOpen(true);
  };

  const handleSubmitOrder = async (values: OrderFormValues) => {
    const product = (products ?? []).find((item) => item._id === values.productId);
    if (!product) {
      toast.error("Nije moguce pronaci izabran proizvod.");
      return;
    }
    if ((product.variants ?? []).length > 0 && !values.variantId) {
      toast.error("Odaberi tip proizvoda.");
      return;
    }

    try {
      const variantsList = product.variants ?? [];
      let variant = variantsList.find((item) => item.id === values.variantId);
      if (variantsList.length > 0 && !variant) {
        variant = variantsList.find((item) => item.isDefault) ?? variantsList[0];
      }
      const resolvedTitle = composeVariantLabel(product, variant);
      const pickup = Boolean(values.pickup);
      const payload = {
        stage: values.stage,
        productId: product._id,
        variantId: variant?.id,
        variantLabel: variant ? composeVariantLabel(product, variant) : undefined,
        title: resolvedTitle,
        kolicina: 1,
        nabavnaCena: variant?.nabavnaCena ?? product.nabavnaCena,
        prodajnaCena: variant?.prodajnaCena ?? product.prodajnaCena,
        transportCost: pickup ? 0 : values.transportCost,
        transportMode: pickup ? undefined : values.transportMode,
        customerName: values.customerName.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        pickup,
        myProfitPercent: values.myProfitPercent,
        napomena: values.note?.trim() || undefined,
        token: sessionToken,
      };

      if (editingOrder) {
        await updateOrder({ id: editingOrder._id, ...payload });
        toast.success("Narudzbina je azurirana.");
      } else {
        await createOrder(payload);
        toast.success("Narudzbina je dodata.");
      }
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
        myProfitPercent: order.myProfitPercent,
        pickup: order.pickup,
        napomena: order.napomena,
      });
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
                            const isExpanded = expandedProductId === product._id;
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
                                    field.onChange(product._id);
                                    setProductInput(product.name);
                                    if (hasVariants) {
                                      setExpandedProductId((prev) => (prev === product._id ? null : product._id));
                                      form.setValue("variantId", "", { shouldDirty: true, shouldValidate: true });
                                    } else {
                                      setExpandedProductId(null);
                                      form.setValue("variantId", "", { shouldDirty: true, shouldValidate: true });
                                      setProductMenuOpen(false);
                                    }
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
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800 dark:text-slate-100">{product.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Nabavna {formatCurrency(product.nabavnaCena, "EUR")} / Prodajna {formatCurrency(product.prodajnaCena, "EUR")}
                                    </p>
                                    {hasVariants ? (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                                      </p>
                                    ) : (
                                      <RichTextSnippet text={product.opisFbInsta || product.opisKp || product.opis} />
                                    )}
                                  </div>
                                  {hasVariants && (
                                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                      {isExpanded ? "Zatvori" : "Tipovi"}
                                    </span>
                                  )}
                                </button>
                                {hasVariants && isExpanded && (
                                  <div className="space-y-1 border-t border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800">
                                    {variants.map((variant) => (
                                      <button
                                        key={variant.id}
                                        type="button"
                                        className="flex w-full flex-col gap-0.5 rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-400 hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          field.onChange(product._id);
                                          form.setValue("variantId", variant.id, { shouldDirty: true, shouldValidate: true });
                                          setProductInput(composeVariantLabel(product, variant));
                                          setProductMenuOpen(false);
                                          setExpandedProductId(null);
                                        }}
                                      >
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                          {composeVariantLabel(product, variant)}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                          Nabavna {formatCurrency(variant.nabavnaCena, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
                                        </span>
                                        {variant.opis ? (
                                          <RichTextSnippet text={variant.opis} className="text-[11px]" />
                                        ) : (
                                          <RichTextSnippet
                                            text={product.opisFbInsta || product.opisKp || product.opis}
                                            className="text-[11px]"
                                          />
                                        )}
                                        {variant.isDefault && (
                                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                            Podrazumevani tip
                                          </span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            {selectedProduct ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-3">
                  {(() => {
                    const images = selectedProduct.images ?? [];
                    const mainImage = images.find((image) => image.isMain) ?? images[0];
                    if (mainImage?.url) {
                      return (
                        <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mainImage.url} alt={selectedProduct.name} className="h-full w-full object-cover" />
                        </div>
                      );
                    }
                    return (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] uppercase text-slate-400">
                        N/A
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedProduct.name}</p>
                    {selectedVariantForPreview ? (
                      <p className="text-xs text-slate-600">{selectedVariantForPreview.label}</p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Prodajna cena</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrency(selectedVariantForPreview?.prodajnaCena ?? selectedProduct.prodajnaCena, "EUR")}
                  </p>
                </div>
              </div>
            ) : null}

            {selectedVariants.length > 0 && (
              <FormField
                name="variantId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Tip / varijanta</FormLabel>
                    <p className="text-xs text-slate-500">
                      Odaberi tacno koji tip proizvoda je prodat. Podrazumevani tip se popunjava automatski, ali mozes da ga promenis.
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {selectedVariants.map((variant) => {
                        const isActive = field.value === variant.id;
                        const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
                        return (
                          <label
                            key={variant.id}
                            className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                              isActive ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="variantId"
                              value={variant.id}
                              checked={isActive}
                              onChange={() => {
                                field.onChange(variant.id);
                                if (selectedProduct) {
                                  setProductInput(composedLabel);
                                }
                                setProductMenuOpen(false);
                                setExpandedProductId(null);
                              }}
                              className="sr-only"
                            />
                            <span className="font-medium text-slate-800">{composedLabel}</span>
                            <span className="text-xs text-slate-500">
                              Nabavna {formatCurrency(variant.nabavnaCena, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
                            </span>
                            <RichTextSnippet text={variant.opis || selectedProduct?.opisFbInsta || selectedProduct?.opisKp || selectedProduct?.opis} />
                            {variant.isDefault ? (
                              <span className="text-[11px] font-semibold text-emerald-600">Podrazumevano</span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="customerName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Ime i prezime porucioca</FormLabel>
                    <Input placeholder="npr. Marko Markovic" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Broj telefona</FormLabel>
                    <Input placeholder="npr. +381 6x xxx xxxx" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Adresa</FormLabel>
                    <Input placeholder="Ulica, broj, mesto" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                name="myProfitPercent"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Moj procenat profita</FormLabel>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="npr. 40"
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                        }
                      />
                      <span className="text-sm text-slate-500">%</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Racuna se od profita (prodajna - nabavna). Unesi koliko % ide tebi.
                    </p>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="transportCost"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Trosak transporta</FormLabel>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 15 ili 15.5"
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
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(event.target.value || undefined)}
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
                  <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 md:col-span-3">
                    <input
                      id="pickup"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="space-y-0.5">
                      <FormLabel htmlFor="pickup" className="m-0 cursor-pointer">
                        Lično preuzimanje
                      </FormLabel>
                      <p className="text-xs text-slate-500">Oznaci ako kupac preuzima bez kurira.</p>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                name="note"
                render={({ field }) => (
                  <FormItem className="md:col-span-3">
                    <FormLabel>Napomena</FormLabel>
                    <Textarea rows={3} placeholder="Dodatne napomene" {...field} />
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
            {pagination.total} narudzbina
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
                setPage(1);
              }}
              className="sm:w-72"
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Naslov</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Kolicina</TableHead>
                <TableHead className="text-right">Prodajno (EUR)</TableHead>
                <TableHead className="text-right">Nabavno (EUR)</TableHead>
                <TableHead className="text-right">Transport (EUR)</TableHead>
                <TableHead className="text-right">Profit (EUR)</TableHead>
                <TableHead className="text-right">Moj deo (EUR)</TableHead>
                <TableHead>Napomena</TableHead>
                <TableHead>Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isOrdersLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-slate-500">
                    Ucitavanje...
                  </TableCell>
                </TableRow>
              ) : orderEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-slate-500">
                    Jos nema narudzbina.
                  </TableCell>
                </TableRow>
              ) : (
                orderEntries.map(({ order, prodajnoUkupno, nabavnoUkupno, transport, prof, mojDeo }) => (
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
                      <span className="inline-flex items-center gap-1">
                        {order.title}
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="font-medium text-slate-800">{order.customerName}</p>
                      <p className="text-xs text-slate-500">{order.phone}</p>
                    </TableCell>
                    <TableCell>{order.kolicina}</TableCell>
                    <TableCell className="text-right">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(transport, "EUR")}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={prof < 0 ? "text-red-600" : ""}>{formatCurrency(prof, "EUR")}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {order.myProfitPercent !== undefined ? (
                        <span>{formatCurrency(mojDeo, "EUR")}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
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
        </CardContent>
      </Card>
    </div>
  );
}
