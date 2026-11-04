"use client";

import { forwardRef, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatCurrency } from "@/lib/format";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import { slanjeSwitchModes } from "../../_lib/types";

type OrderShippingSectionProps = {
  orderForm: ReturnType<typeof useOrderForm>;
};

const modeLabel = (mode: string) => (mode === "Posta" ? "Pošta" : mode);

const parseDecimal = (raw: string): number | undefined | null => {
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "") return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

type DecimalInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: number | undefined | null;
  onValueChange: (value: number | undefined) => void;
};

/** Broj sa zarezom ili tačkom: tekst se čuva dok se kuca ("15," ostaje "15,"), forma dobija broj. */
const DecimalInput = forwardRef<HTMLInputElement, DecimalInputProps>(({ value, onValueChange, onFocus, onBlur, ...props }, ref) => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined || value === null ? "" : String(value).replace(".", ","));
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={shown}
      onFocus={(event) => {
        setDraft(shown);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const parsed = parseDecimal(event.target.value);
        if (parsed === null) return;
        setDraft(event.target.value);
        onValueChange(parsed);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
      {...props}
    />
  );
});
DecimalInput.displayName = "DecimalInput";

/** Slanje (Aks/Pošta) → na čiji račun / ime (čipovi + unos) → početno stanje novog računa → transport. */
export function OrderShippingSection({ orderForm }: OrderShippingSectionProps) {
  const { slanjeModeValue, showShippingFields, slanjeOwnerOptions, slanjeOwnerQuickOptions, normalizedSlanjeOwnerValue, isAksBexMode, selectedAksBexAccount, shouldAskForNewAccountStartingAmount } = orderForm;
  const ownerLabel = slanjeModeValue === "Posta" ? "Na ime (Pošta)" : "Na čiji račun";
  const ownerHint =
    slanjeModeValue === "Posta"
      ? slanjeOwnerOptions.length > 0
        ? "Izaberi sačuvano ime ili upiši novo."
        : "Ime na koje Pošta isplaćuje."
      : slanjeOwnerOptions.length > 0
        ? "Izaberi sačuvan račun ili upiši novi."
        : "Račun na koji Aks uplaćuje.";

  return (
    <div className="flex flex-col gap-4">
      {showShippingFields ? (
        <>
          <FormField
            name="slanjeMode"
            render={({ field, fieldState }) => (
              <FormItem className="gap-1.5">
                <span className="text-sm font-medium text-text" aria-hidden>
                  Slanje
                </span>
                <SegmentedControl
                  ariaLabel="Slanje"
                  fullWidth
                  value={(field.value as string | undefined) ?? ""}
                  onChange={(value) => field.onChange(value)}
                  options={slanjeSwitchModes.map((mode) => ({ value: mode, label: modeLabel(mode) }))}
                />
                <FormMessage>{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            name="slanjeOwner"
            render={({ field, fieldState }) => (
              <FormItem className="gap-1.5">
                <FormLabel htmlFor="order-owner">{ownerLabel}</FormLabel>
                {slanjeModeValue && slanjeOwnerQuickOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`${ownerLabel}: sačuvani`}>
                    {slanjeOwnerQuickOptions.map((option) => (
                      <Chip
                        key={option.value}
                        label={option.value}
                        selected={normalizedSlanjeOwnerValue === option.value}
                        onClick={() => field.onChange(option.value)}
                      />
                    ))}
                  </div>
                ) : null}
                <Input
                  id="order-owner"
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ""}
                  placeholder={slanjeModeValue === "Posta" ? "Upiši ime" : "Upiši račun"}
                  disabled={!slanjeModeValue}
                  autoComplete="off"
                  enterKeyHint="next"
                  list={slanjeModeValue ? `slanje-owner-list-${slanjeModeValue.toLowerCase()}` : undefined}
                  aria-invalid={fieldState.error ? true : undefined}
                  aria-describedby={fieldState.error ? "order-owner-error" : "order-owner-hint"}
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
                <p id="order-owner-hint" className="text-[13px] text-text-muted">
                  {ownerHint}
                  {slanjeOwnerOptions.length > slanjeOwnerQuickOptions.length
                    ? ` Prikazano ${slanjeOwnerQuickOptions.length} od ${slanjeOwnerOptions.length}.`
                    : ""}
                  {isAksBexMode && selectedAksBexAccount
                    ? ` Početno stanje: ${formatCurrency(selectedAksBexAccount.startingAmount ?? 0, "EUR")}.`
                    : ""}
                </p>
                <FormMessage id="order-owner-error">{fieldState.error?.message}</FormMessage>
              </FormItem>
            )}
          />
          {shouldAskForNewAccountStartingAmount ? (
            <FormField
              name="slanjeOwnerStartingAmount"
              render={({ field, fieldState }) => (
                <FormItem className="gap-1.5">
                  <FormLabel htmlFor="order-owner-start">Početno stanje novog računa (€)</FormLabel>
                  <DecimalInput
                    id="order-owner-start"
                    ref={field.ref}
                    name={field.name}
                    enterKeyHint="next"
                    placeholder="npr. 1200"
                    value={field.value}
                    aria-invalid={fieldState.error ? true : undefined}
                    aria-describedby={fieldState.error ? "order-owner-start-error" : undefined}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                  <p className="text-[13px] text-text-muted">Koliko je već leglo na ovaj račun pre prvih narudžbina u aplikaciji.</p>
                  <FormMessage id="order-owner-start-error">{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          ) : null}
        </>
      ) : null}
      <FormField
        name="transportCost"
        render={({ field, fieldState }) => (
          <FormItem className="gap-1.5">
            <FormLabel htmlFor="order-transport">Transport (€)</FormLabel>
            <DecimalInput
              id="order-transport"
              ref={field.ref}
              name={field.name}
              enterKeyHint="next"
              placeholder="npr. 15 ili 15,5"
              value={field.value}
              aria-invalid={fieldState.error ? true : undefined}
              aria-describedby={fieldState.error ? "order-transport-error" : undefined}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            />
            <FormMessage id="order-transport-error">{fieldState.error?.message}</FormMessage>
          </FormItem>
        )}
      />
    </div>
  );
}
