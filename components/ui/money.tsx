import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MoneyProps = {
  value: number | null | undefined;
  currency?: string;
  /** `profit`: zeleno za plus, crveno za minus, prigušeno za nulu. */
  tone?: "default" | "muted" | "profit";
  /** Dodaje "+" ispred pozitivnih iznosa. */
  signed?: boolean;
  className?: string;
};

export function Money({ value, currency = "EUR", tone = "default", signed = false, className }: MoneyProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("num text-text-muted", className)}>—</span>;
  }
  const formatted = formatCurrency(value, currency);
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
    <span className={cn("num whitespace-nowrap", toneClass, className)}>
      {signed && value > 0 ? "+" : ""}
      {formatted}
    </span>
  );
}
