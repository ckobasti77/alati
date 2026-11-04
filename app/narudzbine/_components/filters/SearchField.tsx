"use client";

import { Search, X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Desktop: prikaži "/" kao prečicu. */
  showShortcut?: boolean;
};

/** Pretraga liste: 16px i 44px na telefonu, ✕ briše, Enter zatvara tastaturu. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, placeholder = "Pretraži narudžbine", className, showShortcut = false }, ref) => (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-text-muted" aria-hidden />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-label="Pretraga narudžbina (naslov, kupac, telefon, adresa)"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        className={cn(
          "h-11 w-full rounded-xl bg-surface pr-11 pl-9 text-base text-text ring-1 ring-inset ring-border-strong transition-shadow placeholder:text-text-muted md:h-9 md:text-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Obriši pretragu"
          className="absolute right-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-ring md:size-9"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : showShortcut ? (
        <kbd className="pointer-events-none absolute right-2.5 rounded-md bg-surface-2 px-1.5 text-[11px] leading-5 font-medium text-text-muted">/</kbd>
      ) : null}
    </div>
  ),
);

SearchField.displayName = "SearchField";
