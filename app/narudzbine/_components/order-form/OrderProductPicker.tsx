"use client";

import { Package, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { getProductDisplayName } from "../../_lib/helpers";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { Product } from "@/types/order";

type OrderProductPickerProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  catalog: ReturnType<typeof useOrderCatalog>;
};

function ProductImage({ product, className }: { product: Product; className?: string }) {
  const images = product.images ?? [];
  const main = images.find((image) => image.isMain) ?? images[0];
  return main?.url ? (
    // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL
    <img src={main.url} alt="" loading="lazy" className={cn("shrink-0 rounded-lg bg-surface-2 object-cover ring-1 ring-border", className)} />
  ) : (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted ring-1 ring-border", className)}>
      <Package className="size-4" aria-hidden />
    </span>
  );
}

/** Pretraga proizvoda (combobox) i izabrani proizvod. Logika izbora je ista kao ranije. */
export function OrderProductPicker({ orderForm, catalog }: OrderProductPickerProps) {
  const { productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, setItemVariantId, setItemSupplierId, setItemQuantity, setUseManualSalePrice, setManualSalePrice, productInputRef, filteredProducts, selectedProduct, selectedVariantForPreview } = orderForm;
  const { products, isProductsLoading } = catalog;

  const selectProduct = (product: Product) => {
    const variants = product.variants ?? [];
    const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
    setItemProductId(product._id);
    setProductInput(getProductDisplayName(product));
    setItemVariantId(defaultVariant?.id ?? "");
    setItemSupplierId("");
    setUseManualSalePrice(false);
    setManualSalePrice("");
    setItemQuantity(1);
    setProductMenuOpen(false);
  };

  const clear = () => {
    setProductInput("");
    setProductSearch("");
    setItemProductId("");
    setItemVariantId("");
    setItemSupplierId("");
    productInputRef.current?.focus();
  };

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
        <Input
          id="order-product"
          ref={productInputRef}
          name="productSearch"
          value={productInput}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={productMenuOpen}
          aria-controls="order-product-options"
          aria-autocomplete="list"
          placeholder={isProductsLoading ? "Učitavanje…" : "Pretraži proizvod"}
          disabled={isProductsLoading || (products?.length ?? 0) === 0}
          className="pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
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
          onKeyDown={(event) => {
            // Enter ne šalje formu: bira prvi rezultat.
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (productMenuOpen && filteredProducts[0]) selectProduct(filteredProducts[0]);
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
        {productInput ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            aria-label="Obriši izbor proizvoda"
            className="absolute top-0 right-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-text-muted hover:text-text md:size-10"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        {productMenuOpen ? (
          <div
            id="order-product-options"
            role="listbox"
            aria-label="Proizvodi"
            className="absolute inset-x-0 top-full z-(--z-raised) mt-1 max-h-80 overflow-y-auto rounded-xl bg-raised p-1 shadow-(--shadow-popover) ring-1 ring-border"
          >
            {isProductsLoading ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">Učitavanje…</p>
            ) : filteredProducts.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-text-muted">Nema rezultata</p>
            ) : (
              filteredProducts.map((product) => {
                const variants = product.variants ?? [];
                const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                return (
                  <button
                    key={product._id}
                    type="button"
                    role="option"
                    aria-selected={selectedProduct?._id === product._id}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectProduct(product);
                    }}
                  >
                    <ProductImage product={product} className="size-10" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-text">{getProductDisplayName(product)}</span>
                      {variants.length > 0 ? (
                        <span className="text-xs text-text-muted">
                          {variants.length} {variants.length === 1 ? "tip" : "tipa"}
                        </span>
                      ) : null}
                    </span>
                    <Money value={defaultVariant?.prodajnaCena ?? product.prodajnaCena} trimZeroCents className="shrink-0 text-sm font-medium" />
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {selectedProduct ? (
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2 pr-3">
          <ProductImage product={selectedProduct} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium text-text">{getProductDisplayName(selectedProduct)}</p>
            {selectedVariantForPreview ? <p className="truncate text-xs text-text-muted">{selectedVariantForPreview.label}</p> : null}
          </div>
          <Money value={selectedVariantForPreview?.prodajnaCena ?? selectedProduct.prodajnaCena} trimZeroCents className="shrink-0 font-semibold" />
        </div>
      ) : null}
    </>
  );
}
