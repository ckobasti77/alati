import { describe, expect, it } from "vitest";
import { profit, ukupnoNabavno, ukupnoProdajno } from "./calc";

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
});
