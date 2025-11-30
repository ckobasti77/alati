"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  withLabel?: boolean;
}

export function ThemeToggle({ className, withLabel = true }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={`Prebaci na ${isDark ? "svetli" : "tamni"} mod`}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 ring-1 ring-slate-200 shadow-sm backdrop-blur transition hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
        className,
      )}
    >
      <span className="relative flex h-7 w-12 items-center justify-between rounded-full bg-slate-100 ring-1 ring-slate-200 transition-colors duration-300">
        <span
          className={`absolute h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
            isDark ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
        <Sun
          className={cn(
            "z-10 h-3.5 w-3.5 text-amber-400 transition-all duration-300 ease-out absolute left-1",
            isDark ? "opacity-0 -translate-y-1 scale-90 rotate-45" : "opacity-100 translate-y-0 scale-100 rotate-0",
          )}
          aria-hidden
        />
        <Moon
          className={cn(
            "z-10 h-3.5 w-3.5 text-blue-600 transition-all duration-300 ease-out absolute right-1",
            isDark ? "opacity-100 translate-y-0 scale-100 rotate-0" : "opacity-0 translate-y-1 scale-90 -rotate-45",
          )}
          aria-hidden
        />
      </span>
      {withLabel ? (
        <span className="hidden text-[11px] font-semibold text-slate-500 sm:inline">
          {isDark ? "Tamni mod" : "Svetli mod"}
        </span>
      ) : null}
    </button>
  );
}
