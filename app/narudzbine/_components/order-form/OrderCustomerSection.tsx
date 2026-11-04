"use client";

import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { useOrderFormActions } from "../../_hooks/useOrderFormActions";

type OrderCustomerSectionProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  formActions: ReturnType<typeof useOrderFormActions>;
};

/** Ime → telefon → adresa (adresa se ne prikazuje za lično preuzimanje). */
export function OrderCustomerSection({ orderForm, formActions }: OrderCustomerSectionProps) {
  const { setCustomerQuery, customerMenuOpen, setCustomerMenuOpen, customers, pickupValue } = orderForm;
  const { handleCustomerSelect } = formActions;
  const showSuggestions = customerMenuOpen && (customers?.length ?? 0) > 0;
  return (
    <div className="flex flex-col gap-4">
      <FormField
        name="customerName"
        render={({ field, fieldState }) => (
          <FormItem className="gap-1.5">
            <FormLabel htmlFor="order-customer-name">
              Ime i prezime{pickupValue ? <span className="font-normal text-text-muted"> (neobavezno)</span> : null}
            </FormLabel>
            <div className="relative">
              <Input
                id="order-customer-name"
                autoComplete="name"
                autoCapitalize="words"
                enterKeyHint="next"
                placeholder="npr. Marko Marković"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls="order-customer-suggestions"
                aria-autocomplete="list"
                aria-invalid={fieldState.error ? true : undefined}
                aria-describedby={fieldState.error ? "order-customer-name-error" : undefined}
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  setCustomerQuery(event.target.value);
                  setCustomerMenuOpen(true);
                }}
                onFocus={() => setCustomerMenuOpen(true)}
                onBlur={() => {
                  field.onBlur();
                  setCustomerMenuOpen(false);
                }}
              />
              {showSuggestions ? (
                <div
                  id="order-customer-suggestions"
                  role="listbox"
                  aria-label="Raniji kupci"
                  className="absolute inset-x-0 top-full z-(--z-raised) mt-1 max-h-64 overflow-y-auto rounded-xl bg-raised p-1 shadow-(--shadow-popover) ring-1 ring-border"
                >
                  {customers?.map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="flex min-h-11 w-full cursor-pointer flex-col items-start justify-center gap-0.5 rounded-lg px-3 py-1.5 text-left hover:bg-surface-2"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleCustomerSelect(customer);
                      }}
                    >
                      <span className="text-sm font-medium text-text">{customer.name}</span>
                      <span className="text-[13px] text-text-muted">
                        {customer.phone}
                        {customer.address ? ` · ${customer.address}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <FormMessage id="order-customer-name-error">{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
      <FormField
        name="phone"
        render={({ field, fieldState }) => (
          <FormItem className="gap-1.5">
            <FormLabel htmlFor="order-phone">Telefon</FormLabel>
            <Input
              id="order-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              placeholder="npr. 064 123 4567"
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? "order-phone-error" : undefined}
              {...field}
            />
            <FormMessage id="order-phone-error">{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
      {!pickupValue ? (
        <FormField
          name="address"
          render={({ field, fieldState }) => (
            <FormItem className="gap-1.5">
              <FormLabel htmlFor="order-address">Adresa</FormLabel>
              <Input
                id="order-address"
                autoComplete="street-address"
                enterKeyHint="next"
                placeholder="Ulica i broj, mesto"
                aria-invalid={fieldState.error ? true : undefined}
                aria-describedby={fieldState.error ? "order-address-error" : undefined}
                {...field}
              />
              <FormMessage id="order-address-error">{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
