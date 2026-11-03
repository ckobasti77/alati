"use client";

import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { STAGE_OPTIONS } from "@/lib/stages";

export function OrderPickupStageSection() {
  return (
    <>
      <FormField
        name="pickup"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="space-y-0.5">
              <FormLabel htmlFor="pickup" className="m-0 cursor-pointer">
                Licno preuzimanje
              </FormLabel>
              <p className="text-xs text-slate-500">Bez adrese i bez slanja.</p>
            </div>
            <input
              id="pickup"
              ref={field.ref}
              name={field.name}
              type="checkbox"
              checked={!!field.value}
              onChange={(event) => field.onChange(event.target.checked)}
              onBlur={field.onBlur}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </FormItem>
        )}
      />
      <FormField
        name="stage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Stage</FormLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-left text-sm font-medium transition ${
                    field.value === option.value
                      ? `${option.tone} border-2`
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  onClick={() => field.onChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </FormItem>
        )}
      />
    </>
  );
}
