const currencyFormatter = new Intl.NumberFormat("sr-RS", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | undefined | null) {
  return currencyFormatter.format(Number(value ?? 0));
}

export function clampText(value: string | undefined, limit = 160) {
  if (!value) return "";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1)}…`;
}
