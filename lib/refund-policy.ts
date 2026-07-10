export const ORDER_REFUND_TIME_ZONE = "Europe/Belgrade";

const REFUND_POLICY_START = { year: 2026, month: 8, day: 1 };

type BusinessDate = {
  year: number;
  month: number;
  day: number;
};

export type RefundCalculationInput = {
  orderCreatedAt: number;
  totalNabavno: number;
  profit: number;
  transport: number;
  myProfitPercent?: number;
};

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ORDER_REFUND_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const compareBusinessDates = (left: BusinessDate, right: BusinessDate) => {
  if (left.year !== right.year) return left.year - right.year;
  if (left.month !== right.month) return left.month - right.month;
  return left.day - right.day;
};

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

export const isFirstFullRefundWeek = (orderCreatedAt: number) => {
  const date = getBusinessDate(orderCreatedAt);
  if (!date || compareBusinessDates(date, REFUND_POLICY_START) < 0) return false;

  // This is the weekday for the calendar date itself, independent of the runtime time zone.
  const firstDayWeekday = new Date(Date.UTC(date.year, date.month - 1, 1)).getUTCDay();
  const firstMonday = ((8 - firstDayWeekday) % 7) + 1;

  return date.day >= firstMonday && date.day <= firstMonday + 6;
};

const resolveProfitPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 100;

export const calculateOrderRefund = ({
  orderCreatedAt,
  totalNabavno,
  profit,
  transport,
  myProfitPercent,
}: RefundCalculationInput) => {
  const isFullRefundWeek = isFirstFullRefundWeek(orderCreatedAt);

  if (isFullRefundWeek) {
    return {
      isFullRefundWeek: true,
      profitForRefund: profit,
      profitForRefundPercent: 100,
      refundAmount: totalNabavno + profit - transport,
    };
  }

  const profitForRefund = profit * (resolveProfitPercent(myProfitPercent) / 100) * 0.5;
  return {
    isFullRefundWeek: false,
    profitForRefund,
    profitForRefundPercent: resolveProfitPercent(myProfitPercent) * 0.5,
    refundAmount: totalNabavno + transport + profitForRefund,
  };
};
