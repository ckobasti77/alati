const currencyFormatters = new Map<string, Intl.NumberFormat>();

export const formatCurrency = (
  value: number,
  currency: string = "EUR",
) => {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("sr-RS", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }),
    );
  }
  return currencyFormatters.get(currency)!.format(value);
};

export const formatDate = (timestamp?: number) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleDateString("sr-RS");
};
