"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { useOrderFormActions } from "../../_hooks/useOrderFormActions";
import { OrderProductPicker } from "./OrderProductPicker";
import { OrderVariantSupplierFields } from "./OrderVariantSupplierFields";

type OrderItemsSectionProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  formActions: ReturnType<typeof useOrderFormActions>;
  catalog: ReturnType<typeof useOrderCatalog>;
};

export function OrderItemsSection({ orderForm, formActions, catalog }: OrderItemsSectionProps) {
  const { setProductInput, draftItems, setItemProductId, setItemVariantId, setItemSupplierId, itemQuantity, setItemQuantity, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, selectedProduct } = orderForm;
  const { handleAddItem, handleRemoveItem, draftTotals } = formActions;
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <FormLabel className="text-base">Stavke narudzbine</FormLabel>
          <p className="text-xs text-slate-500">Dodaj jedan ili vise proizvoda i tip.</p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {draftItems.length} stavki
        </Badge>
      </div>
      <OrderProductPicker orderForm={orderForm} catalog={catalog} />
      <OrderVariantSupplierFields orderForm={orderForm} />

      {selectedProduct ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3 md:items-end">
            <div>
              <FormLabel>Kolicina</FormLabel>
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
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
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
              <FormLabel className="flex items-center gap-2">
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
              </FormLabel>
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleAddItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Dodaj u narudzbinu
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setItemProductId("");
                setItemVariantId("");
                setItemSupplierId("");
                setProductInput("");
                setUseManualSalePrice(false);
                setManualSalePrice("");
                setUseManualPurchasePrice(false);
                setManualPurchasePrice("");
                setItemQuantity(1);
              }}
            >
              Ponisti izbor
            </Button>
          </div>
        </div>
      ) : null}

      {draftItems.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Dodate stavke</p>
            <div className="text-center text-xs text-slate-500">
              <p>Prodajno: {formatCurrency(draftTotals.totalProdajno, "EUR")}</p>
              <p>Nabavno: {formatCurrency(draftTotals.totalNabavno, "EUR")}</p>
            </div>
          </div>
          <div className="space-y-2">
            {draftItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  {item.variantLabel ? <p className="text-xs text-slate-500">{item.variantLabel}</p> : null}
                  <p className="text-xs text-slate-500">
                    Kolicina: {item.kolicina} / Nabavna {formatCurrency(item.nabavnaCena, "EUR")} / Prodajna {formatCurrency(item.prodajnaCena, "EUR")}
                  </p>
                  {item.manualNabavna || item.manualProdajna ? (
                    <div className="flex flex-wrap gap-1">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(item.id)}
                  aria-label="Ukloni stavku"
                >
                  <Trash2 className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
