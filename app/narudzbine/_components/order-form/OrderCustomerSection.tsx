"use client";

import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { useOrderFormActions } from "../../_hooks/useOrderFormActions";

type OrderCustomerSectionProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  formActions: ReturnType<typeof useOrderFormActions>;
};

export function OrderCustomerSection({ orderForm, formActions }: OrderCustomerSectionProps) {
  const { setCustomerQuery, customerMenuOpen, setCustomerMenuOpen, customers, pickupValue } = orderForm;
  const { handleCustomerSelect } = formActions;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        name="customerName"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Ime i prezime porucioca{pickupValue ? " (neobavezno)" : ""}</FormLabel>
            <div className="relative">
              <Input
                placeholder="npr. Marko Markovic"
                required={!pickupValue}
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  setCustomerQuery(event.target.value);
                  setCustomerMenuOpen(true);
                }}
                onFocus={() => setCustomerMenuOpen(true)}
                onBlur={(event) => {
                  field.onBlur();
                  setCustomerMenuOpen(false);
                }}
              />
              {customerMenuOpen && (customers?.length ?? 0) > 0 ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {customers?.map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleCustomerSelect(customer);
                      }}
                    >
                      <span className="font-medium text-slate-900">{customer.name}</span>
                      <span className="text-xs text-slate-500">
                        {customer.phone}
                        {customer.address ? ` - ${customer.address}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
      <FormField
        name="phone"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Broj telefona</FormLabel>
            <Input placeholder="npr. +381 6x xxx xxxx" required {...field} />
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
      {!pickupValue ? (
        <FormField
          name="address"
          render={({ field, fieldState }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Adresa</FormLabel>
              <Input placeholder="Ulica, broj, mesto" required {...field} />
              <FormMessage>{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
