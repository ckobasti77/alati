"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  /** Sa labelom ceo red (≥ 44px) je meta za tap. */
  label?: React.ReactNode;
  description?: React.ReactNode;
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(({ className, label, description, id, ...props }, ref) => {
  const autoId = useId();
  const switchId = id ?? autoId;
  const control = (
    <SwitchPrimitive.Root
      ref={ref}
      id={switchId}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-border-strong transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent",
        !label && "after:absolute after:-inset-2.5 after:content-['']",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-(--duration-fast) data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
  if (!label) return control;
  return (
    <label htmlFor={switchId} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-text">{label}</span>
        {description ? <span className="text-[13px] leading-5 text-text-muted">{description}</span> : null}
      </span>
      {control}
    </label>
  );
});

Switch.displayName = "Switch";
