"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        ghost: "text-text-muted hover:bg-surface-2 hover:text-text active:bg-surface-3",
        outline: "bg-surface text-text ring-1 ring-inset ring-border-strong hover:bg-surface-2 active:bg-surface-3",
        solid: "bg-accent text-accent-fg hover:bg-accent-hover",
        danger: "text-danger hover:bg-danger-soft",
      },
      size: {
        /** 44px na telefonu, 36px od md. */
        md: "size-11 md:size-9",
        /** Uvek 44px (donja navigacija, sheet header na telefonu). */
        lg: "size-11",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    /** Obavezno: dugme nema vidljiv tekst. */
    "aria-label": string;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";

export { iconButtonVariants };
