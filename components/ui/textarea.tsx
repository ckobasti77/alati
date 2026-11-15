"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoResize?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ className, autoResize = false, onInput, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    const resizeToFitContent = useCallback((node?: HTMLTextAreaElement | null) => {
      const target = node ?? innerRef.current;
      if (!autoResize || !target) return;
      target.style.height = "auto";
      target.style.height = `${target.scrollHeight}px`;
    }, [autoResize]);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    useEffect(() => {
      resizeToFitContent();
    }, [resizeToFitContent, props.value, props.defaultValue]);

    const handleInput: NonNullable<Props["onInput"]> = (event) => {
      resizeToFitContent(event.currentTarget);
      onInput?.(event);
    };

    return (
      <textarea
        ref={innerRef}
        className={cn(
          "flex w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm max-md:text-base text-text shadow-sm transition placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        onInput={handleInput}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
