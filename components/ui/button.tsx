"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary:
          "bg-surface-2 text-text hover:bg-surface-3",
        ghost:
          "bg-transparent text-text hover:bg-surface-2",
        outline:
          "border border-border-strong bg-surface hover:bg-surface-2",
        destructive:
          "bg-danger-solid text-accent-fg hover:bg-danger-solid/90",
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
