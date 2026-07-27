export const ORDER_REFUND_TIME_ZONE = "Europe/Belgrade";

type BusinessDate = {
  year: number;
  month: number;
  day: number;
};

export type OrderRefundPeriod = {
  startDate: string;
  endDate: string;
};

export type RefundCalculationInput = {
  orderCreatedAt: number;
  totalNabavno: number;
  profit: number;
  transport: number;
  myProfitPercent?: number;
  refundPeriod?: OrderRefundPeriod | null;
  povratVracen?: boolean;
};

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ORDER_REFUND_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export const getBusinessDate = (timestamp: number): BusinessDate | null => {
  if (!Number.isFinite(timestamp)) return null;

  const parts = businessDateFormatter.formatToParts(new Date(timestamp));
  const values = parts.reduce<Record<string, number>>((result, part) => {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      result[part.type] = Number(part.value);
    }
    return result;
  }, {});

  if (!values.year || !values.month || !values.day) return null;
  return { year: values.year, month: values.month, day: values.day };
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

export const getBusinessDateKey = (timestamp: number) => {
  const date = getBusinessDate(timestamp);
  if (!date) return null;
  return `${date.year}-${padDatePart(date.month)}-${padDatePart(date.day)}`;
};

export const isValidRefundDateKey = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const isOrderInRefundPeriod = (
  orderCreatedAt: number,
  refundPeriod?: OrderRefundPeriod | null,
) => {
  if (!refundPeriod) return false;
  if (!isValidRefundDateKey(refundPeriod.startDate) || !isValidRefundDateKey(refundPeriod.endDate)) {
    return false;
  }
  if (refundPeriod.startDate > refundPeriod.endDate) return false;

  const orderDate = getBusinessDateKey(orderCreatedAt);
  if (!orderDate) return false;

  return orderDate >= refundPeriod.startDate && orderDate <= refundPeriod.endDate;
};

const resolveProfitPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 100;

export const calculateOrderRefund = ({
  orderCreatedAt,
  totalNabavno,
  profit,
  transport,
  myProfitPercent,
  refundPeriod,
  povratVracen,
}: RefundCalculationInput) => {
  const isInRefundPeriod = isOrderInRefundPeriod(orderCreatedAt, refundPeriod);

  if (isInRefundPeriod) {
    const refundAmount = totalNabavno + profit - transport;
    const isExcludedBecauseReturned = Boolean(povratVracen);
    return {
      isInRefundPeriod: true,
      isExcludedBecauseReturned,
      profitForRefund: profit,
      outstandingProfitForRefund: isExcludedBecauseReturned ? 0 : profit,
      profitForRefundPercent: 100,
      refundAmount,
      outstandingRefundAmount: isExcludedBecauseReturned ? 0 : refundAmount,
    };
  }

  const profitForRefund = profit * (resolveProfitPercent(myProfitPercent) / 100) * 0.5;
  const refundAmount = totalNabavno + transport + profitForRefund;
  return {
    isInRefundPeriod: false,
    isExcludedBecauseReturned: false,
    profitForRefund,
    outstandingProfitForRefund: profitForRefund,
    profitForRefundPercent: resolveProfitPercent(myProfitPercent) * 0.5,
    refundAmount,
    outstandingRefundAmount: refundAmount,
  };
};
