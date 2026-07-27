import { describe, expect, it } from "vitest";
import { calculateOrderRefund, isOrderInRefundPeriod, isValidRefundDateKey } from "./refund-policy";

const atBelgradeNoon = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day, 12);

describe("refund policy", () => {
  const period = { startDate: "2026-08-03", endDate: "2026-08-12" };

  it("prepoznaje ukljucive granice rucno izabranog perioda", () => {
    expect(isOrderInRefundPeriod(atBelgradeNoon(2026, 8, 2), period)).toBe(false);
    expect(isOrderInRefundPeriod(atBelgradeNoon(2026, 8, 3), period)).toBe(true);
    expect(isOrderInRefundPeriod(atBelgradeNoon(2026, 8, 12), period)).toBe(true);
    expect(isOrderInRefundPeriod(atBelgradeNoon(2026, 8, 13), period)).toBe(false);
    expect(isOrderInRefundPeriod(atBelgradeNoon(2027, 1, 4), { startDate: "2027-01-04", endDate: "2027-01-04" })).toBe(true);
  });

  it("granice dana racuna u vremenskoj zoni Europe/Belgrade", () => {
    const oneDayPeriod = { startDate: "2026-08-03", endDate: "2026-08-03" };
    expect(isOrderInRefundPeriod(Date.UTC(2026, 7, 2, 21, 59), oneDayPeriod)).toBe(false);
    expect(isOrderInRefundPeriod(Date.UTC(2026, 7, 2, 22, 0), oneDayPeriod)).toBe(true);
    expect(isOrderInRefundPeriod(Date.UTC(2026, 7, 3, 21, 59), oneDayPeriod)).toBe(true);
    expect(isOrderInRefundPeriod(Date.UTC(2026, 7, 3, 22, 0), oneDayPeriod)).toBe(false);
  });

  it("odbija neispravne datume i obrnut raspon", () => {
    expect(isValidRefundDateKey("2026-02-29")).toBe(false);
    expect(isValidRefundDateKey("2026-08-03")).toBe(true);
    expect(isOrderInRefundPeriod(atBelgradeNoon(2026, 8, 5), { startDate: "2026-08-12", endDate: "2026-08-03" })).toBe(false);
  });

  it("u izabranom periodu koristi nabavno plus ceo profit minus transport", () => {
    expect(
      calculateOrderRefund({
        orderCreatedAt: atBelgradeNoon(2026, 8, 3),
        totalNabavno: 80,
        profit: 30,
        transport: 10,
        myProfitPercent: 40,
        refundPeriod: period,
      }),
    ).toEqual({
      isInRefundPeriod: true,
      isExcludedBecauseReturned: false,
      profitForRefund: 30,
      outstandingProfitForRefund: 30,
      profitForRefundPercent: 100,
      refundAmount: 100,
      outstandingRefundAmount: 100,
    });
  });

  it("ne racuna vec vracenu porudzbinu iz izabranog perioda", () => {
    expect(
      calculateOrderRefund({
        orderCreatedAt: atBelgradeNoon(2026, 8, 5),
        totalNabavno: 80,
        profit: 30,
        transport: 10,
        refundPeriod: period,
        povratVracen: true,
      }),
    ).toMatchObject({
      isInRefundPeriod: true,
      isExcludedBecauseReturned: true,
      refundAmount: 100,
      outstandingRefundAmount: 0,
      outstandingProfitForRefund: 0,
    });
  });

  it("zadrzava postojeci obracun van izabranog perioda", () => {
    expect(
      calculateOrderRefund({
        orderCreatedAt: atBelgradeNoon(2026, 8, 13),
        totalNabavno: 80,
        profit: 30,
        transport: 10,
        myProfitPercent: 40,
        refundPeriod: period,
      }),
    ).toEqual({
      isInRefundPeriod: false,
      isExcludedBecauseReturned: false,
      profitForRefund: 6,
      outstandingProfitForRefund: 6,
      profitForRefundPercent: 20,
      refundAmount: 96,
      outstandingRefundAmount: 96,
    });
  });
});
