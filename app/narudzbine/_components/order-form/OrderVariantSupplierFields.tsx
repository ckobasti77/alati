"use client";

import { RichTextSnippet } from "../RichTextSnippet";
import { FormLabel } from "@/components/ui/form";
import { formatCurrency } from "@/lib/format";
import { composeVariantLabel, resolveVariantPurchasePrice } from "../../_lib/helpers";
import type { useOrderForm } from "../../_hooks/useOrderForm";

type OrderVariantSupplierFieldsProps = {
  orderForm: ReturnType<typeof useOrderForm>;
};

export function OrderVariantSupplierFields({ orderForm }: OrderVariantSupplierFieldsProps) {
  const { setProductInput, setProductMenuOpen, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, selectedProduct, selectedVariants, supplierOptionsWithNames, bestSupplierOption } = orderForm;
  return (
    <>
      {selectedVariants.length > 0 ? (
        <div className="space-y-2">
          <FormLabel>Tip / varijanta</FormLabel>
          <p className="text-xs text-slate-500">
            Odaberi tacno koji tip proizvoda dodajes. Podrazumevani tip se popunjava automatski, ali mozes da ga promenis.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {selectedVariants.map((variant) => {
              const isActive = itemVariantId === variant.id;
              const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
              const purchasePrice = selectedProduct ? resolveVariantPurchasePrice(selectedProduct, variant) : variant.nabavnaCena;
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
                  <span
                    className={`font-medium ${
                      isActive ? "text-blue-800 dark:text-blue-50" : "text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {composedLabel}
                  </span>
                  <span className={`text-xs ${isActive ? "text-blue-700 dark:text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>
                    Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna {formatCurrency(variant.prodajnaCena, "EUR")}
                  </span>
                  <RichTextSnippet
                    text={variant.opis || selectedProduct?.opisFbInsta || selectedProduct?.opisKp || selectedProduct?.opis}
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

      {selectedProduct && supplierOptionsWithNames.length > 0 ? (
        <div>
          <FormLabel>Dobavljac</FormLabel>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
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
    </>
  );
}
