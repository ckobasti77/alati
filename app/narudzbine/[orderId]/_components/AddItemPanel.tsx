"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { composeVariantLabel, getProductDisplayName, resolveVariantPurchasePrice } from "../../_lib/helpers";
import type { useOrderDetailData } from "../_hooks/useOrderDetailData";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";
import type { useOrderItemDraft } from "../_hooks/useOrderItemDraft";

type AddItemPanelProps = {
  products: ReturnType<typeof useOrderDetailData>["products"];
  productInput: ReturnType<typeof useOrderItemDraft>["productInput"];
  setProductInput: ReturnType<typeof useOrderItemDraft>["setProductInput"];
  setProductSearch: ReturnType<typeof useOrderItemDraft>["setProductSearch"];
  productMenuOpen: ReturnType<typeof useOrderItemDraft>["productMenuOpen"];
  setProductMenuOpen: ReturnType<typeof useOrderItemDraft>["setProductMenuOpen"];
  setItemProductId: ReturnType<typeof useOrderItemDraft>["setItemProductId"];
  itemVariantId: ReturnType<typeof useOrderItemDraft>["itemVariantId"];
  setItemVariantId: ReturnType<typeof useOrderItemDraft>["setItemVariantId"];
  itemSupplierId: ReturnType<typeof useOrderItemDraft>["itemSupplierId"];
  setItemSupplierId: ReturnType<typeof useOrderItemDraft>["setItemSupplierId"];
  itemQuantity: ReturnType<typeof useOrderItemDraft>["itemQuantity"];
  setItemQuantity: ReturnType<typeof useOrderItemDraft>["setItemQuantity"];
  useManualPurchasePrice: ReturnType<typeof useOrderItemDraft>["useManualPurchasePrice"];
  setUseManualPurchasePrice: ReturnType<typeof useOrderItemDraft>["setUseManualPurchasePrice"];
  manualPurchasePrice: ReturnType<typeof useOrderItemDraft>["manualPurchasePrice"];
  setManualPurchasePrice: ReturnType<typeof useOrderItemDraft>["setManualPurchasePrice"];
  useManualSalePrice: ReturnType<typeof useOrderItemDraft>["useManualSalePrice"];
  setUseManualSalePrice: ReturnType<typeof useOrderItemDraft>["setUseManualSalePrice"];
  manualSalePrice: ReturnType<typeof useOrderItemDraft>["manualSalePrice"];
  setManualSalePrice: ReturnType<typeof useOrderItemDraft>["setManualSalePrice"];
  productInputRef: ReturnType<typeof useOrderItemDraft>["productInputRef"];
  filteredProducts: ReturnType<typeof useOrderItemDraft>["filteredProducts"];
  selectedProduct: ReturnType<typeof useOrderItemDraft>["selectedProduct"];
  selectedVariants: ReturnType<typeof useOrderItemDraft>["selectedVariants"];
  selectedVariantForPreview: ReturnType<typeof useOrderItemDraft>["selectedVariantForPreview"];
  supplierOptionsWithNames: ReturnType<typeof useOrderItemDraft>["supplierOptionsWithNames"];
  bestSupplierOption: ReturnType<typeof useOrderItemDraft>["bestSupplierOption"];
  resetItemDraft: ReturnType<typeof useOrderItemDraft>["resetItemDraft"];
  isAddingItem: ReturnType<typeof useOrderDetailUpdates>["isAddingItem"];
  handleAddItem: ReturnType<typeof useOrderDetailUpdates>["handleAddItem"];
};

export function AddItemPanel({ products, productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, productInputRef, filteredProducts, selectedProduct, selectedVariants, selectedVariantForPreview, supplierOptionsWithNames, bestSupplierOption, resetItemDraft, isAddingItem, handleAddItem }: AddItemPanelProps) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">Dodaj jos proizvoda</p>
        <p className="text-xs text-slate-500">Odaberi proizvod, tip i kolicinu pa ga dodaj u narudzbinu.</p>
      </div>
      <div className="relative">
        <Input
          ref={productInputRef}
          name="productSearch"
          value={productInput}
          placeholder={products === undefined ? "Ucitavanje..." : "Pretrazi proizvod"}
          disabled={products === undefined || (products?.length ?? 0) === 0}
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
          <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {products === undefined ? (
              <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
            ) : (
              filteredProducts.map((product, productIndex) => {
                const variants = product.variants ?? [];
                const hasVariants = variants.length > 0;
                const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
                return (
                  <div
                    key={product._id}
                    className={`border-b border-slate-100 last:border-b-0 ${
                      productIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setItemProductId(product._id);
                        setProductInput(getProductDisplayName(product));
                        setItemVariantId(defaultVariant?.id ?? "");
                        setItemSupplierId("");
                        setUseManualPurchasePrice(false);
                        setManualPurchasePrice("");
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
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                            </div>
                          );
                        }
                        return <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200" />;
                      })()}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">{getProductDisplayName(product)}</p>
                          {hasVariants ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                              Tipski
                            </span>
                          ) : null}
                        </div>
                        {hasVariants ? (
                          <p className="text-[11px] text-slate-500">
                            {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Cena</p>
                        <p className="text-sm font-semibold text-slate-900">
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
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-3">
            {(() => {
              const images = selectedProduct.images ?? [];
              const mainImage = images.find((image) => image.isMain) ?? images[0];
              const displayName = getProductDisplayName(selectedProduct);
              if (mainImage?.url) {
                return (
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
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
              <p className="text-sm font-semibold text-slate-900">{getProductDisplayName(selectedProduct)}</p>
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

      {selectedVariants.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Tip / varijanta</p>
          <div className="grid gap-2 md:grid-cols-2">
            {selectedVariants.map((variant) => {
              const isActive = itemVariantId === variant.id;
              const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
              const purchasePrice = selectedProduct ? resolveVariantPurchasePrice(selectedProduct, variant) : variant.nabavnaCena;
              return (
                <label
                  key={variant.id}
                  className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                    isActive ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="variantId"
                    value={variant.id}
                    checked={isActive}
                    onChange={() => {
                      setItemVariantId(variant.id);
                      if (selectedProduct) {
                        setProductInput(composedLabel);
                      }
                      setProductMenuOpen(false);
                    }}
                    className="sr-only"
                  />
                  <span className={`font-medium ${isActive ? "text-blue-800" : "text-slate-800"}`}>
                    {composedLabel}
                  </span>
                  <span className={`text-xs ${isActive ? "text-blue-700" : "text-slate-500"}`}>
                    Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna{" "}
                    {formatCurrency(variant.prodajnaCena, "EUR")}
                  </span>
                  {variant.isDefault ? (
                    <span className="text-[11px] font-semibold text-emerald-600">Podrazumevano</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedProduct && supplierOptionsWithNames.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-700">Dobavljac</p>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
            name="supplierId"
            value={itemSupplierId}
            onChange={(event) => setItemSupplierId(event.target.value)}
          >
            <option value="">
              {bestSupplierOption
                ? `Najpovoljniji (${formatCurrency(bestSupplierOption.price, "EUR")})`
                : "Najpovoljniji"}
            </option>
            {supplierOptionsWithNames.map((option) => (
              <option key={option.supplierId} value={option.supplierId}>
                {(option.supplierName ?? "Dobavljac") + " - " + formatCurrency(option.price, "EUR")}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">Ako ne izaberes, racunamo najpovoljniju ponudu.</p>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-700">Kolicina</p>
            <Input
              name="itemQuantity"
              type="number"
              min={1}
              required
              value={itemQuantity}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) {
                  setItemQuantity(1);
                  return;
                }
                setItemQuantity(Math.max(Math.round(next), 1));
              }}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useManualPurchasePrice}
                onChange={(event) => {
                  setUseManualPurchasePrice(event.target.checked);
                  if (!event.target.checked) {
                    setManualPurchasePrice("");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Rucno unosim nabavnu cenu
            </label>
            <Input
              name="manualPurchasePrice"
              type="number"
              step="0.01"
              min={0}
              disabled={!useManualPurchasePrice}
              required={useManualPurchasePrice}
              value={manualPurchasePrice}
              onChange={(event) => setManualPurchasePrice(event.target.value)}
              placeholder="npr. 80"
              className={!useManualPurchasePrice ? "bg-slate-100" : undefined}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useManualSalePrice}
                onChange={(event) => {
                  setUseManualSalePrice(event.target.checked);
                  if (!event.target.checked) {
                    setManualSalePrice("");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Rucno unosim prodajnu cenu
            </label>
            <Input
              name="manualSalePrice"
              type="number"
              step="0.01"
              min={0}
              disabled={!useManualSalePrice}
              required={useManualSalePrice}
              value={manualSalePrice}
              onChange={(event) => setManualSalePrice(event.target.value)}
              placeholder="npr. 120"
              className={!useManualSalePrice ? "bg-slate-100" : undefined}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleAddItem} className="gap-2" disabled={isAddingItem}>
              <Plus className="h-4 w-4" />
              {isAddingItem ? "Dodavanje..." : "Dodaj u narudzbinu"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetItemDraft} disabled={isAddingItem}>
              Ponisti izbor
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
