"use client";

import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { STAGE_OPTIONS } from "@/lib/stages";
import type { OrderStage } from "@/types/order";

/** Lično preuzimanje: na vrhu forme; uključeno sakriva adresu i slanje. */
export function OrderPickupSwitch() {
  return (
    <FormField
      name="pickup"
      render={({ field }) => (
        <div className="rounded-xl bg-surface-2 px-3">
          <Switch
            ref={field.ref}
            label="Lično preuzimanje"
            description="Bez adrese i bez slanja"
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => field.onChange(checked)}
            onBlur={field.onBlur}
          />
        </div>
      )}
    />
  );
}

/** Status nove narudžbine (podrazumevano Poručeno). */
export function OrderStageField() {
  return (
    <FormField
      name="stage"
      render={({ field }) => (
        <FormItem className="gap-2">
          <span className="text-sm font-medium text-text" aria-hidden>
            Status
          </span>
          <SegmentedControl<OrderStage>
            ariaLabel="Status"
            columns={4}
            value={field.value as OrderStage}
            onChange={(value) => field.onChange(value)}
            options={STAGE_OPTIONS.map((stage) => ({ value: stage.value, label: stage.label }))}
          />
        </FormItem>
      )}
    />
  );
}

export function OrderNoteField() {
  return (
    <FormField
      name="note"
      render={({ field, fieldState }) => (
        <FormItem className="gap-1.5">
          <FormLabel htmlFor="order-note">
            Napomena <span className="font-normal text-text-muted">(neobavezno)</span>
          </FormLabel>
          <Textarea id="order-note" rows={3} enterKeyHint="done" placeholder="Npr. zvati pre slanja" {...field} />
          <FormMessage>{fieldState.error?.message}</FormMessage>
        </FormItem>
      )}
    />
  );
}
