"use client";

import { FormLabel } from "@/components/ui/form";
import { Money } from "@/components/ui/money";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { composeVariantLabel, resolveVariantPurchasePrice } from "../../_lib/helpers";
import type { useOrderForm } from "../../_hooks/useOrderForm";

type OrderVariantSupplierFieldsProps = {
  orderForm: ReturnType<typeof useOrderForm>;
};

/** Tip (varijanta) kao kartice-radio dugmad i dobavljač (native select). */
export function OrderVariantSupplierFields({ orderForm }: OrderVariantSupplierFieldsProps) {
  const { setProductInput, setProductMenuOpen, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, selectedProduct, selectedVariants, supplierOptionsWithNames, bestSupplierOption } = orderForm;
  return (
    <>
      {selectedVariants.length > 0 ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-text">Tip</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedVariants.map((variant) => {
              const isActive = itemVariantId === variant.id;
              const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
              const purchasePrice = selectedProduct ? resolveVariantPurchasePrice(selectedProduct, variant) : variant.nabavnaCena;
              return (
                <label
                  key={variant.id}
                  className={cn(
                    "flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-xl px-3 py-2 ring-1 ring-inset transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                    isActive ? "bg-accent-soft ring-accent/50" : "bg-surface ring-border hover:bg-surface-2",
                  )}
                >
                  <input
                    type="radio"
                    name="variantId"
                    value={variant.id}
                    checked={isActive}
                    onChange={() => {
                      setItemVariantId(variant.id);
                      if (selectedProduct) setProductInput(composedLabel);
                      setProductMenuOpen(false);
                    }}
                    className="sr-only"
                  />
                  <span className={cn("text-sm font-medium", isActive ? "text-accent-text" : "text-text")}>
                    {variant.label}
                    {variant.isDefault ? <span className="ml-1.5 text-xs font-normal text-text-muted">podrazumevano</span> : null}
                  </span>
                  <span className="text-xs text-text-muted">
                    Nabavna <Money value={purchasePrice} trimZeroCents /> · Prodajna <Money value={variant.prodajnaCena} trimZeroCents />
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {selectedProduct && supplierOptionsWithNames.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <FormLabel htmlFor="order-supplier">Dobavljač</FormLabel>
          <select
            id="order-supplier"
            className="h-11 w-full cursor-pointer rounded-xl bg-surface px-3 text-base text-text ring-1 ring-inset ring-border-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring md:h-10 md:text-sm"
            name="supplierId"
            value={itemSupplierId}
            onChange={(event) => setItemSupplierId(event.target.value)}
          >
            <option value="">{bestSupplierOption ? `Najpovoljniji (${formatCurrency(bestSupplierOption.price, "EUR")})` : "Najpovoljniji"}</option>
            {supplierOptionsWithNames.map((option) => (
              <option key={option.supplierId} value={option.supplierId}>
                {`${option.supplierName ?? "Dobavljač"} – ${formatCurrency(option.price, "EUR")}`}
              </option>
            ))}
          </select>
          <p className="text-[13px] text-text-muted">Bez izbora, računa se najpovoljnija ponuda.</p>
        </div>
      ) : null}
    </>
  );
}
