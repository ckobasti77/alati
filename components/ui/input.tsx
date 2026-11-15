"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full max-md:h-11 rounded-md border border-border-strong bg-surface px-3 py-2 text-sm max-md:text-base text-text shadow-sm transition placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
