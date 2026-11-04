"use client";

import { ChevronDown, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
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

/** Proizvod: pretraga → tip/dobavljač → količina → Dodaj. Dodate stavke su ispod. */
export function OrderItemsSection({ orderForm, formActions, catalog }: OrderItemsSectionProps) {
  const { setProductInput, draftItems, setItemProductId, setItemVariantId, setItemSupplierId, itemQuantity, setItemQuantity, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, selectedProduct } = orderForm;
  const { handleAddItem, handleRemoveItem, draftTotals } = formActions;

  const resetSelection = () => {
    setItemProductId("");
    setItemVariantId("");
    setItemSupplierId("");
    setProductInput("");
    setUseManualSalePrice(false);
    setManualSalePrice("");
    setUseManualPurchasePrice(false);
    setManualPurchasePrice("");
    setItemQuantity(1);
  };

  return (
    <section aria-labelledby="order-items-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <FormLabel id="order-items-title" htmlFor="order-product">
          Proizvod
        </FormLabel>
        {draftItems.length > 0 ? (
          <span className="text-[13px] text-text-muted">
            {draftItems.length} {draftItems.length === 1 ? "stavka" : draftItems.length < 5 ? "stavke" : "stavki"}
          </span>
        ) : null}
      </div>

      {draftItems.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl ring-1 ring-border" aria-label="Dodate stavke">
          {draftItems.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-1.5 pr-1 pl-3">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-text">{item.title}</p>
                <p className="text-xs text-text-muted">
                  <span className="num">{item.kolicina}×</span> · Prodajna <Money value={item.prodajnaCena} trimZeroCents /> · Nabavna{" "}
                  <Money value={item.nabavnaCena} trimZeroCents />
                  {item.manualNabavna || item.manualProdajna ? " · ručno" : ""}
                </p>
              </div>
              <IconButton aria-label={`Ukloni ${item.title}`} variant="danger" onClick={() => handleRemoveItem(item.id)}>
                <Trash2 />
              </IconButton>
            </li>
          ))}
          {draftItems.length > 1 ? (
            <li className="flex justify-between px-3 py-2 text-[13px] text-text-muted">
              <span>Ukupno</span>
              <span>
                Prodajno <Money value={draftTotals.totalProdajno} trimZeroCents className="font-medium text-text" /> · Nabavno{" "}
                <Money value={draftTotals.totalNabavno} trimZeroCents />
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}

      <OrderProductPicker orderForm={orderForm} catalog={catalog} />
      <OrderVariantSupplierFields orderForm={orderForm} />

      {selectedProduct ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <FormLabel htmlFor="order-qty">Količina</FormLabel>
              <div className="inline-flex items-center rounded-xl ring-1 ring-inset ring-border-strong">
                <IconButton aria-label="Manje" onClick={() => setItemQuantity(Math.max(itemQuantity - 1, 1))} disabled={itemQuantity <= 1}>
                  <Minus />
                </IconButton>
                <input
                  id="order-qty"
                  name="itemQuantity"
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={itemQuantity}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/\D/g, ""));
                    setItemQuantity(Number.isFinite(next) && next > 0 ? Math.round(next) : 1);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddItem();
                    }
                  }}
                  className="num h-11 w-12 bg-transparent text-center text-base text-text outline-none md:h-10 md:text-sm"
                />
                <IconButton aria-label="Više" onClick={() => setItemQuantity(itemQuantity + 1)}>
                  <Plus />
                </IconButton>
              </div>
            </div>
            <Button type="button" onClick={handleAddItem} className="flex-1 gap-2">
              <Plus className="size-4" aria-hidden />
              Dodaj u narudžbinu
            </Button>
          </div>

          <details className="group rounded-xl ring-1 ring-border" open={useManualPurchasePrice || useManualSalePrice || undefined}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm text-text-muted [&::-webkit-details-marker]:hidden">
              Ručne cene
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
              {(
                [
                  ["nabavnu", useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, "manualPurchasePrice", "npr. 80"],
                  ["prodajnu", useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, "manualSalePrice", "npr. 120"],
                ] as const
              ).map(([kind, enabled, setEnabled, value, setValue, name, placeholder]) => (
                <div key={name} className="flex flex-col gap-1.5">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-text md:min-h-8">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => {
                        setEnabled(event.target.checked);
                        if (!event.target.checked) setValue("");
                      }}
                      className="size-5 cursor-pointer accent-accent md:size-4"
                    />
                    Ručno unosim {kind} cenu
                  </label>
                  <Input
                    name={name}
                    type="text"
                    inputMode="decimal"
                    aria-label={`Ručna ${kind === "nabavnu" ? "nabavna" : "prodajna"} cena`}
                    disabled={!enabled}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </details>

          <button
            type="button"
            onClick={resetSelection}
            className="inline-flex min-h-11 cursor-pointer items-center self-start text-[13px] font-medium text-text-muted hover:text-text md:min-h-8"
          >
            Poništi izbor
          </button>
        </div>
      ) : null}
    </section>
  );
}
