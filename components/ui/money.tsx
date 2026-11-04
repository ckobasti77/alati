import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MoneyProps = {
  value: number | null | undefined;
  currency?: string;
  /** `profit`: zeleno za plus, crveno za minus, prigušeno za nulu. */
  tone?: "default" | "muted" | "profit";
  /** Dodaje "+" ispred pozitivnih iznosa. */
  signed?: boolean;
  /** Ceo iznos bez ",00" (uže kolone u tabeli). Tačan iznos ostaje u `title`. */
  trimZeroCents?: boolean;
  className?: string;
};

export function Money({ value, currency = "EUR", tone = "default", signed = false, trimZeroCents = false, className }: MoneyProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("num text-text-muted", className)}>—</span>;
  }
  const full = formatCurrency(value, currency);
  const formatted = trimZeroCents ? full.replace(/,00(?=\s|$)/, "") : full;
  const toneClass =
    tone === "muted"
      ? "text-text-muted"
      : tone === "profit"
        ? value > 0
          ? "text-success"
          : value < 0
            ? "text-danger"
            : "text-text-muted"
        : undefined;
  return (
    <span className={cn("num whitespace-nowrap", toneClass, className)} title={formatted !== full ? full : undefined}>
      {signed && value > 0 ? "+" : ""}
      {formatted}
    </span>
  );
}
