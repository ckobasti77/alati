"use client";

import { createContext, useContext } from "react";
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type UseFormReturn,
} from "react-hook-form";
import { cn } from "@/lib/utils";

const FormContext = createContext<UseFormReturn<FieldValues> | null>(null);

interface FormProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  children: React.ReactNode;
  className?: string;
  onSubmit?: Parameters<UseFormReturn<TFieldValues>["handleSubmit"]>[0];
}

export function Form<TFieldValues extends FieldValues>({
  form,
  children,
  className,
  onSubmit,
}: FormProps<TFieldValues>) {
  const providerValue = form as unknown as UseFormReturn<FieldValues>;
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit ?? (() => undefined))}
        className={className}
      >
        <FormContext.Provider value={providerValue}>
          {children}
        </FormContext.Provider>
      </form>
    </FormProvider>
  );
}

export function useFormContext<TFieldValues extends FieldValues>() {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error("useFormContext mora biti koriscen unutar Form komponente.");
  }
  return ctx as unknown as UseFormReturn<TFieldValues>;
}

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  name: TName;
  control?: UseFormReturn<TFieldValues>["control"];
  render: (params: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
  }) => React.ReactElement;
}

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: FormFieldProps<TFieldValues, TName>,
) {
  const form = useFormContext<TFieldValues>();
  return (
    <Controller
      control={props.control ?? form.control}
      name={props.name}
      render={({ field, fieldState }) => props.render({ field, fieldState })}
    />
  );
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex w-full flex-col gap-1", className)} {...props} />
  );
}

export function FormLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />
  );
}

export function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null;
  return (
    <p className={cn("text-sm text-red-600", className)} {...props}>
      {children}
    </p>
  );
}
