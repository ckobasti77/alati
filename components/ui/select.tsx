"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Value
    ref={ref}
    className={cn(
      "flex-1 text-left text-sm text-inherit data-[placeholder]:text-slate-500",
      className,
    )}
    {...props}
  />
));

SelectValue.displayName = SelectPrimitive.Value.displayName;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-inherit shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900",
      className,
    )}
    {...props}
  >
    <span className="flex flex-1 items-center gap-2 overflow-hidden text-inherit">
      {children ?? <SelectValue />}
    </span>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white text-inherit shadow-lg animate-in fade-in-80 data-[state=closed]:animate-out data-[state=open]:zoom-in-90 data-[state=closed]:zoom-out-95 dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));

SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors focus:bg-blue-50 focus:text-blue-700 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-slate-800 dark:focus:text-slate-50 dark:data-[highlighted]:bg-slate-800 dark:data-[highlighted]:text-slate-50",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
      <Check className="h-4 w-4 text-blue-600" />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText className="ml-6 flex w-full items-center justify-between gap-2">
      {children}
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));

SelectItem.displayName = SelectPrimitive.Item.displayName;
