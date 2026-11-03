"use client";

import { RichTextSnippet } from "../RichTextSnippet";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { getProductDisplayName } from "../../_lib/helpers";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useOrderForm } from "../../_hooks/useOrderForm";

type OrderProductPickerProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  catalog: ReturnType<typeof useOrderCatalog>;
};

export function OrderProductPicker({ orderForm, catalog }: OrderProductPickerProps) {
  const { productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, setItemVariantId, setItemSupplierId, setItemQuantity, setUseManualSalePrice, setManualSalePrice, productInputRef, filteredProducts, selectedProduct, selectedVariantForPreview } = orderForm;
  const { products, isProductsLoading } = catalog;
  return (
    <>
      <div className="relative">
        <Input
          ref={productInputRef}
          name="productSearch"
          value={productInput}
          placeholder={isProductsLoading ? "Ucitavanje..." : "Pretrazi proizvod"}
          disabled={isProductsLoading || (products?.length ?? 0) === 0}
          onChange={(event) => {
            const value = event.target.value;
            setProductInput(value);
            setProductSearch(value);
            setProductMenuOpen(true);
            if (!value) {
              setItemProductId("");
              setItemVariantId("");
              setItemSupplierId("");
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
                const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
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
                        setItemProductId(product._id);
                        setProductInput(getProductDisplayName(product));
                        setItemVariantId(defaultVariant?.id ?? "");
                        setItemSupplierId("");
                        setUseManualSalePrice(false);
                        setManualSalePrice("");
                        setItemQuantity(1);
                        setProductMenuOpen(false);
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
                        return <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200 dark:border-slate-700/70" />;
                      })()}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{getProductDisplayName(product)}</p>
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

      {selectedProduct ? (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3">
            {(() => {
              const images = selectedProduct.images ?? [];
              const mainImage = images.find((image) => image.isMain) ?? images[0];
              const displayName = getProductDisplayName(selectedProduct);
              if (mainImage?.url) {
                return (
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                  </div>
                );
              }
              return (
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] uppercase text-slate-400 dark:border-slate-600 dark:text-slate-300">
                  N/A
                </div>
              );
            })()}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{getProductDisplayName(selectedProduct)}</p>
              {selectedVariantForPreview ? <p className="text-xs text-slate-600 dark:text-slate-300">{selectedVariantForPreview.label}</p> : null}
            </div>
          </div>
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Prodajna cena</p>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {formatCurrency(selectedVariantForPreview?.prodajnaCena ?? selectedProduct.prodajnaCena, "EUR")}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
