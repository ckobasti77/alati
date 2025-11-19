import { describe, expect, it } from "vitest";
import { myProfitShare, profit, ukupnoNabavno, ukupnoProdajno } from "./calc";

describe("calc helpers", () => {
  it("racuna ukupno prodajno", () => {
    expect(ukupnoProdajno(2, 50)).toBe(100);
  });

  it("racuna ukupno nabavno", () => {
    expect(ukupnoNabavno(3, 30)).toBe(90);
  });

  it("racuna profit", () => {
    expect(profit(120, 80)).toBe(40);
    expect(profit(120, 80, 10)).toBe(30);
  });

  it("racuna moj procenat profita", () => {
    expect(myProfitShare(100, 40)).toBe(40);
    expect(myProfitShare(100, 0)).toBe(0);
    expect(myProfitShare(100, 150)).toBe(100);
  });
});
