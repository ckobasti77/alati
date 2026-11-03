"use client";

import { PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { composeVariantLabel, getProductDisplayName, resolveProductImageUrl, resolveVariantPurchasePrice } from "../../_lib/helpers";
import { RichTextSnippet } from "../RichTextSnippet";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useRestock } from "../../_hooks/useRestock";

type RestockDialogProps = {
  catalog: ReturnType<typeof useOrderCatalog>;
  restock: ReturnType<typeof useRestock>;
};

export function RestockDialog({ catalog, restock }: RestockDialogProps) {
  const { isProductsLoading, products, productMap } = catalog;
  const { restockModalOpen, setRestockModalOpen, restockProductInputRef, restockProductInput, setRestockProductInput, setRestockProductSearch, setRestockProductMenuOpen, setRestockProductId, setRestockVariantId, restockProductMenuOpen, restockFilteredProducts, restockSelectedVariants, restockVariantId, restockSelectedProduct, restockName, setRestockName, restockPhone, setRestockPhone, resetRestockForm, isCreatingRestock, handleCreateRestockRequest, isRestockLoading, restockEntries, openRestockDeleteModal } = restock;
  return (
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
  );
}
