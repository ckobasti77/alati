"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { InlineField } from "./LegacyFields";
import { AddItemPanel } from "./AddItemPanel";
import type { OrderWithProduct } from "@/types/order";
import type { useOrderDetailData } from "../_hooks/useOrderDetailData";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";
import type { useOrderItemDraft } from "../_hooks/useOrderItemDraft";

type ItemsCardProps = {
  products: ReturnType<typeof useOrderDetailData>["products"];
  order: OrderWithProduct;
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
  handleOrderFieldSave: ReturnType<typeof useOrderDetailUpdates>["handleOrderFieldSave"];
  handleAddItem: ReturnType<typeof useOrderDetailUpdates>["handleAddItem"];
  handleRemoveItem: ReturnType<typeof useOrderDetailUpdates>["handleRemoveItem"];
};

export function ItemsCard({ products, order, productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, productInputRef, filteredProducts, selectedProduct, selectedVariants, selectedVariantForPreview, supplierOptionsWithNames, bestSupplierOption, resetItemDraft, isAddingItem, handleOrderFieldSave, handleAddItem, handleRemoveItem }: ItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stavke narudzbine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <InlineField label="Naziv narudzbine" value={order.title} onSave={(val) => handleOrderFieldSave("title", val)} />
        {order.items && order.items.length > 0 ? (
          <div className="space-y-3">
            {order.items.map((item) => {
              const images = (item as any).product?.images ?? [];
              const mainImage = images.find((image: any) => image.isMain) ?? images[0];
              const isOnlyItem = (order.items?.length ?? 0) <= 1;
              const productMedia = mainImage?.url ? (
                <div className="h-14 w-14 overflow-hidden rounded-md border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mainImage.url} alt={item.title} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                  N/A
                </div>
              );
              const itemInfo = (
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  {item.variantLabel ? <p className="text-xs text-slate-500">{item.variantLabel}</p> : null}
                  <p className="text-xs text-slate-500">Kolicina: {item.kolicina}</p>
                </div>
              );
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  {item.productId ? (
                    <Link
                      href={`/proizvodi/${item.productId}`}
                      className="flex items-center gap-3 rounded-md p-1 -m-1 transition hover:bg-slate-50"
                    >
                      {productMedia}
                      {itemInfo}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3">
                      {productMedia}
                      {itemInfo}
                    </div>
                  )}
                  <div className="text-right text-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Prodajna</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(item.prodajnaCena, "EUR")}</p>
                    <p className="text-xs text-slate-500">Nabavna {formatCurrency(item.nabavnaCena, "EUR")}</p>
                      {item.manualNabavna || item.manualProdajna ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          {item.manualNabavna ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Rucno uneta nabavna
                            </span>
                          ) : null}
                          {item.manualProdajna ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                              Rucno uneta prodajna
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                  </div>
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isOnlyItem}
                      aria-label="Obrisi stavku"
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Narudzbina nema stavke.</p>
        )}
        <AddItemPanel products={products} productInput={productInput} setProductInput={setProductInput} setProductSearch={setProductSearch} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} setItemProductId={setItemProductId} itemVariantId={itemVariantId} setItemVariantId={setItemVariantId} itemSupplierId={itemSupplierId} setItemSupplierId={setItemSupplierId} itemQuantity={itemQuantity} setItemQuantity={setItemQuantity} useManualPurchasePrice={useManualPurchasePrice} setUseManualPurchasePrice={setUseManualPurchasePrice} manualPurchasePrice={manualPurchasePrice} setManualPurchasePrice={setManualPurchasePrice} useManualSalePrice={useManualSalePrice} setUseManualSalePrice={setUseManualSalePrice} manualSalePrice={manualSalePrice} setManualSalePrice={setManualSalePrice} productInputRef={productInputRef} filteredProducts={filteredProducts} selectedProduct={selectedProduct} selectedVariants={selectedVariants} selectedVariantForPreview={selectedVariantForPreview} supplierOptionsWithNames={supplierOptionsWithNames} bestSupplierOption={bestSupplierOption} resetItemDraft={resetItemDraft} isAddingItem={isAddingItem} handleAddItem={handleAddItem} />
      </CardContent>
    </Card>
  );
}
