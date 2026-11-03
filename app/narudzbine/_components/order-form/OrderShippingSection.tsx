"use client";

import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import { slanjeSwitchModes } from "../../_lib/types";

type OrderShippingSectionProps = {
  orderForm: ReturnType<typeof useOrderForm>;
};

export function OrderShippingSection({ orderForm }: OrderShippingSectionProps) {
  const { slanjeModeValue, showShippingFields, slanjeOwnerLabel, slanjeOwnerPlaceholder, slanjeOwnerOptions, slanjeOwnerQuickOptions, normalizedSlanjeOwnerValue, isAksBexMode, selectedAksBexAccount, shouldAskForNewAccountStartingAmount } = orderForm;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField
        name="transportCost"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>Trosak transporta</FormLabel>
            <Input
              ref={field.ref}
              name={field.name}
              type="text"
              inputMode="decimal"
              placeholder="npr. 15 ili 15.5"
              required
              value={field.value ?? ""}
              onChange={(event) => {
                const normalized = event.target.value.replace(",", ".").trim();
                if (normalized === "") {
                  field.onChange(undefined);
                  return;
                }
                const parsed = Number(normalized);
                if (Number.isNaN(parsed)) return;
                field.onChange(parsed);
              }}
              onBlur={field.onBlur}
            />
            <p className="text-xs text-slate-500">Unesi trosak transporta u EUR (prihvata decimale).</p>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
      {showShippingFields ? (
        <>
          <FormField
            name="slanjeMode"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Slanje</FormLabel>
                <div
                  className="grid grid-cols-2 overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-1"
                  role="group"
                  aria-label="Slanje"
                >
                  {slanjeSwitchModes.map((mode) => {
                    const isActive = field.value === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={cn(
                          "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                          isActive
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-600 hover:text-slate-900",
                        )}
                        onClick={() => field.onChange(mode)}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            name="slanjeOwner"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{slanjeOwnerLabel}</FormLabel>
                <Input
                  className="disabled:cursor-not-allowed disabled:bg-slate-100"
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ""}
                  placeholder={slanjeOwnerPlaceholder}
                  disabled={!slanjeModeValue}
                  list={slanjeModeValue ? `slanje-owner-list-${slanjeModeValue.toLowerCase()}` : undefined}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                />
                {slanjeModeValue ? (
                  <datalist id={`slanje-owner-list-${slanjeModeValue.toLowerCase()}`}>
                    {slanjeOwnerOptions.map((option) => (
                      <option key={option.value} value={option.value} />
                    ))}
                  </datalist>
                ) : null}
                {slanjeModeValue && slanjeOwnerQuickOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {slanjeOwnerQuickOptions.map((option) => {
                      const isActive = normalizedSlanjeOwnerValue === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                            isActive
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-200",
                          )}
                          onClick={() => field.onChange(option.value)}
                        >
                          {option.value}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                {slanjeModeValue && slanjeOwnerOptions.length > slanjeOwnerQuickOptions.length ? (
                  <p className="text-[11px] text-slate-500">
                    Prikazano prvih {slanjeOwnerQuickOptions.length} od {slanjeOwnerOptions.length} sacuvanih.
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  {slanjeModeValue === "Posta"
                    ? slanjeOwnerOptions.length > 0
                      ? "Izaberi sacuvano ime ili unesi novo."
                      : "Unesi na ime kome posta isplacuje."
                    : slanjeModeValue
                      ? slanjeOwnerOptions.length > 0
                        ? "Izaberi sacuvan racun ili unesi novi."
                        : "Na ciji bankovni racun lezu pare preko Aksa."
                      : "Izaberi slanje da bi odabrao ime."}
                </p>
                {isAksBexMode && selectedAksBexAccount ? (
                  <p className="text-xs text-slate-500">
                    Pocetno stanje ovog racuna: {formatCurrency(selectedAksBexAccount.startingAmount ?? 0, "EUR")}
                  </p>
                ) : null}
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
          {shouldAskForNewAccountStartingAmount ? (
            <FormField
              name="slanjeOwnerStartingAmount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Pocetno stanje novog racuna</FormLabel>
                  <Input
                    ref={field.ref}
                    name={field.name}
                    type="text"
                    inputMode="decimal"
                    placeholder="npr. 1200"
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const normalized = event.target.value.replace(",", ".").trim();
                      if (normalized === "") {
                        field.onChange(undefined);
                        return;
                      }
                      const parsed = Number(normalized);
                      if (Number.isNaN(parsed)) return;
                      field.onChange(parsed);
                    }}
                    onBlur={field.onBlur}
                  />
                  <p className="text-xs text-slate-500">
                    Koliko je vec leglo na ovaj novi racun pre prvih narudzbina u aplikaciji.
                  </p>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          ) : null}
        </>
      ) : null}
      <FormField
        name="note"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Napomena (neobavezno)</FormLabel>
            <Textarea rows={3} placeholder="Dodatne napomene" {...field} />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
