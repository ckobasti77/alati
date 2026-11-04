"use client";

import { Loader2, PhoneCall, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/format";
import { composeVariantLabel, getProductDisplayName, resolveProductImageUrl, resolveVariantPurchasePrice } from "../../_lib/helpers";
import { RichTextSnippet } from "../RichTextSnippet";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useRestock } from "../../_hooks/useRestock";

type RestockDialogProps = {
  catalog: ReturnType<typeof useOrderCatalog>;
  restock: ReturnType<typeof useRestock>;
};

const labelClass = "text-[13px] text-text-muted";

export function RestockDialog({ catalog, restock }: RestockDialogProps) {
  const { isProductsLoading, products, productMap } = catalog;
  const { restockModalOpen, setRestockModalOpen, restockProductInputRef, restockProductInput, setRestockProductInput, setRestockProductSearch, setRestockProductMenuOpen, setRestockProductId, setRestockVariantId, restockProductMenuOpen, restockFilteredProducts, restockSelectedVariants, restockVariantId, restockSelectedProduct, restockName, setRestockName, restockPhone, setRestockPhone, resetRestockForm, isCreatingRestock, handleCreateRestockRequest, isRestockLoading, restockEntries, openRestockDeleteModal } = restock;
  return (
    <Sheet
      open={restockModalOpen}
      onOpenChange={setRestockModalOpen}
      title="Zahtevi za dopunu"
      description="Kupci koje treba kontaktirati kada se proizvod vrati."
      size="full"
      desktopWidth="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="restockProduct" className={labelClass}>
                Proizvod
              </label>
              <div className="relative">
                <Input
                  ref={restockProductInputRef}
                  id="restockProduct"
                  name="restockProductSearch"
                  value={restockProductInput}
                  placeholder={isProductsLoading ? "Učitavanje..." : "Pretraži proizvod"}
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
                  <div className="absolute left-0 right-0 z-(--z-raised) mt-1 max-h-72 divide-y divide-border overflow-y-auto rounded-xl bg-raised shadow-(--shadow-sheet) ring-1 ring-border">
                    {isProductsLoading ? (
                      <div className="px-3 py-2 text-sm text-text-muted">Učitavanje...</div>
                    ) : restockFilteredProducts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-text-muted">Nema rezultata</div>
                    ) : (
                      restockFilteredProducts.map((product) => {
                        const variants = product.variants ?? [];
                        const hasVariants = variants.length > 0;
                        const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                        const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
                        return (
                          <button
                            key={product._id}
                            type="button"
                            className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2"
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
                                  <div className="size-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                                  </div>
                                );
                              }
                              return <div className="size-12 shrink-0 rounded-lg bg-surface-2 ring-1 ring-border" />;
                            })()}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-text">{getProductDisplayName(product)}</p>
                                {hasVariants ? (
                                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">
                                    Tipski
                                  </span>
                                ) : null}
                              </div>
                              {hasVariants ? (
                                <p className="text-xs text-text-muted">
                                  {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                                </p>
                              ) : (
                                <RichTextSnippet
                                  text={product.opisFbInsta || product.opisKp || product.opis}
                                  className="text-xs text-text-muted"
                                />
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-text-muted">Cena</p>
                              <p className="num text-sm font-semibold text-text">{formatCurrency(displayPrice, "EUR")}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            {restockSelectedVariants.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className={labelClass}>Tip / varijanta</span>
                <p className="text-xs text-text-muted">
                  Odaberi tačno koji tip proizvoda traži. Podrazumevani tip je unapred izabran.
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
                        className={`flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2 text-sm transition-colors ring-1 ring-inset ${
                          isActive ? "bg-accent-soft ring-accent" : "bg-surface ring-border hover:bg-surface-2"
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
                        <span className={`font-medium ${isActive ? "text-accent-text" : "text-text"}`}>{composedLabel}</span>
                        <span className="num text-xs text-text-muted">
                          Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
                        </span>
                        <RichTextSnippet
                          text={variant.opis || restockSelectedProduct?.opisFbInsta || restockSelectedProduct?.opisKp || restockSelectedProduct?.opis}
                          className="text-xs text-text-muted"
                        />
                        {variant.isDefault ? (
                          <span className="text-xs font-medium text-success">Podrazumevano</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="restockName" className={labelClass}>
                  Ime
                </label>
                <Input
                  id="restockName"
                  value={restockName}
                  onChange={(event) => setRestockName(event.target.value)}
                  placeholder="Ime i prezime"
                  autoComplete="name"
                  enterKeyHint="next"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="restockPhone" className={labelClass}>
                  Telefon
                </label>
                <Input
                  id="restockPhone"
                  type="tel"
                  value={restockPhone}
                  onChange={(event) => setRestockPhone(event.target.value)}
                  placeholder="+381..."
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="done"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 md:justify-end">
            <Button type="button" variant="ghost" onClick={resetRestockForm} disabled={isCreatingRestock}>
              Odbaci
            </Button>
            <Button
              type="button"
              className="flex-1 md:flex-none"
              onClick={handleCreateRestockRequest}
              disabled={isCreatingRestock || isProductsLoading}
            >
              {isCreatingRestock ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Sačuvaj
            </Button>
          </div>
        </div>
        {isRestockLoading ? (
          <div className="rounded-2xl p-4 text-center text-sm text-text-muted ring-1 ring-border">Učitavanje...</div>
        ) : restockEntries.length === 0 ? (
          <div className="rounded-2xl p-4 text-center text-sm text-text-muted ring-1 ring-border">
            Trenutno nema zahteva.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {restockEntries.map((entry) => {
              const product = entry.productId ? productMap.get(entry.productId) : undefined;
              const productTitle = entry.productTitle || (product ? getProductDisplayName(product) : "Proizvod");
              const imageUrl = product ? resolveProductImageUrl(product) : null;
              return (
                <li key={entry._id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-border">
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={productTitle} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-medium text-text-muted">
                        —
                      </div>
                    )}
                  </div>
                  <a
                    href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}
                    className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-lg px-2 py-1 transition-colors hover:bg-surface-2"
                  >
                    <span className="truncate text-sm font-semibold text-text">{productTitle}</span>
                    {entry.variantLabel ? (
                      <span className="truncate text-xs text-text-muted">{entry.variantLabel}</span>
                    ) : null}
                    <span className="truncate text-sm text-text">{entry.name}</span>
                    <span className="num flex items-center gap-1 text-xs text-text-muted">
                      <PhoneCall className="size-4 text-accent-text" aria-hidden />
                      {entry.phone}
                    </span>
                  </a>
                  <IconButton variant="danger" aria-label={`Obriši zahtev: ${entry.name}`} onClick={() => openRestockDeleteModal(entry)}>
                    <Trash2 />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
