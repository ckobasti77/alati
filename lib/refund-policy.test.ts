import { describe, expect, it } from "vitest";
import { calculateOrderRefund, isFirstFullRefundWeek } from "./refund-policy";

const atBelgradeNoon = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day, 12);

describe("refund policy", () => {
  it("prepoznaje samo prvu punu nedelju u mesecu od avgusta 2026", () => {
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 7, 31))).toBe(false);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 8, 1))).toBe(false);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 8, 3))).toBe(true);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 8, 9))).toBe(true);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 8, 10))).toBe(false);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 9, 6))).toBe(false);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 9, 7))).toBe(true);
    expect(isFirstFullRefundWeek(atBelgradeNoon(2026, 9, 13))).toBe(true);
  });

  it("u posebnoj nedelji koristi nabavno plus ceo profit minus transport", () => {
    expect(
      calculateOrderRefund({
        orderCreatedAt: atBelgradeNoon(2026, 8, 3),
        totalNabavno: 80,
        profit: 30,
        transport: 10,
        myProfitPercent: 40,
      }),
    ).toEqual({
      isFullRefundWeek: true,
      profitForRefund: 30,
      profitForRefundPercent: 100,
      refundAmount: 100,
    });
  });

  it("zadrzava postojeci obracun van posebne nedelje", () => {
    expect(
      calculateOrderRefund({
        orderCreatedAt: atBelgradeNoon(2026, 8, 10),
        totalNabavno: 80,
        profit: 30,
        transport: 10,
        myProfitPercent: 40,
      }),
    ).toEqual({
      isFullRefundWeek: false,
      profitForRefund: 6,
      profitForRefundPercent: 20,
      refundAmount: 96,
    });
  });
});
