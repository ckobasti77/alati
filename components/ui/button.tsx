"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-fg hover:bg-accent-hover focus-visible:ring-ring",
        secondary:
          "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-[var(--accent-soft)]",
        ghost:
          "bg-transparent text-slate-900 hover:bg-slate-100 focus-visible:ring-[var(--border-soft)]",
        outline:
          "border border-slate-300 bg-white hover:bg-slate-50 focus-visible:ring-[var(--border-soft)]",
        destructive:
          "bg-danger-solid text-white hover:bg-danger-solid/90 focus-visible:ring-danger-solid",
      },
      size: {
        // max-md: tap meta 44px na telefonu, desktop ostaje isti
        default: "h-10 px-4 py-2 max-md:h-11",
        sm: "h-9 px-3 max-md:h-11",
        lg: "h-11 px-5 text-base max-md:h-12",
        icon: "size-10 max-md:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
