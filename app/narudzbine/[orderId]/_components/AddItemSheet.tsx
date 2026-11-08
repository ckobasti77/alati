"use client";

import { ChevronDown, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { OrderProductPicker } from "../../_components/order-form/OrderProductPicker";
import { OrderVariantSupplierFields } from "../../_components/order-form/OrderVariantSupplierFields";
import type { useOrderItemDraft } from "../_hooks/useOrderItemDraft";

type AddItemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ReturnType<typeof useOrderItemDraft>;
  products: unknown[] | undefined;
  isAddingItem: boolean;
  onAdd: () => Promise<boolean | undefined>;
};

/** „Dodaj stavku“: ista pretraga, tip i dobavljač kao u formi nove narudžbine; dodavanje je isto kao ranije. */
export function AddItemSheet({ open, onOpenChange, draft, products, isAddingItem, onAdd }: AddItemSheetProps) {
  const { itemQuantity, setItemQuantity, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, selectedProduct, resetItemDraft } = draft;

  // Izbor drugog proizvoda poništava i ručnu nabavnu (kao ranije na detalju), ne samo prodajnu.
  const pickerState = {
    ...draft,
    setUseManualSalePrice: (value: React.SetStateAction<boolean>) => {
      setUseManualSalePrice(value);
      if (value === false) {
        setUseManualPurchasePrice(false);
        setManualPurchasePrice("");
      }
    },
  };

  const submit = async () => {
    const added = await onAdd();
    if (added) onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Dodaj stavku"
      size="full"
      desktopWidth="md"
      closeSide="start"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        document.getElementById("order-product")?.focus({ preventScroll: true });
      }}
      footer={
        <Button type="button" className="w-full gap-2" disabled={!selectedProduct || isAddingItem} onClick={() => void submit()}>
          {isAddingItem ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          Dodaj u narudžbinu
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <OrderProductPicker orderForm={pickerState} catalog={{ products: products as never, isProductsLoading: products === undefined }} />
        <OrderVariantSupplierFields orderForm={draft} />

        {selectedProduct ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="detail-item-qty" className="text-sm font-medium text-text">
                Količina
              </label>
              <div className="inline-flex items-center self-start rounded-xl ring-1 ring-inset ring-border-strong">
                <IconButton aria-label="Manje" onClick={() => setItemQuantity(Math.max(itemQuantity - 1, 1))} disabled={itemQuantity <= 1}>
                  <Minus />
                </IconButton>
                <input
                  id="detail-item-qty"
                  type="text"
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={itemQuantity}
                  onChange={(event) => {
                    const next = Number(event.target.value.replace(/\D/g, ""));
                    setItemQuantity(Number.isFinite(next) && next > 0 ? Math.round(next) : 1);
                  }}
                  className="num h-11 w-12 bg-transparent text-center text-base text-text outline-none md:h-10 md:text-sm"
                />
                <IconButton aria-label="Više" onClick={() => setItemQuantity(itemQuantity + 1)}>
                  <Plus />
                </IconButton>
              </div>
            </div>

            <details className="group rounded-xl ring-1 ring-border" open={useManualPurchasePrice || useManualSalePrice || undefined}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm text-text-muted [&::-webkit-details-marker]:hidden">
                Ručne cene
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
                {(
                  [
                    ["nabavnu", "nabavna", useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, "npr. 80"],
                    ["prodajnu", "prodajna", useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, "npr. 120"],
                  ] as const
                ).map(([kind, noun, enabled, setEnabled, value, setValue, placeholder]) => (
                  <div key={kind} className="flex flex-col gap-1.5">
                    <Switch
                      label={`Ručna ${noun} cena`}
                      checked={enabled}
                      onCheckedChange={(checked) => {
                        setEnabled(checked);
                        if (!checked) setValue("");
                      }}
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Ručna ${noun} cena`}
                      disabled={!enabled}
                      value={value}
                      onChange={(event) => setValue(event.target.value)}
                      placeholder={placeholder}
                      className="num"
                    />
                  </div>
                ))}
              </div>
            </details>

            <button
              type="button"
              onClick={resetItemDraft}
              className="inline-flex min-h-11 cursor-pointer items-center self-start text-[13px] font-medium text-text-muted hover:text-text md:min-h-8"
            >
              Poništi izbor
            </button>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
