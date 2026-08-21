import { describe, it, expect } from "vitest";
import { resolveTrackingTarget, TRACK_HASH_KEY } from "./tracking";

const hasNum = (url: string, num: string) =>
  url.includes(`#${TRACK_HASH_KEY}=${encodeURIComponent(num)}`);

describe("resolveTrackingTarget", () => {
  it("1. PX...RS -> uvek Posta (nadjacava kolonu AKS)", () => {
    const t = resolveTrackingTarget("PX123456789RS", "Aks");
    expect(t?.carrier).toBe("posta");
    expect(t && hasNum(t.url, "PX123456789RS")).toBe(true);
  });

  it("2. PX...RS malim slovima -> Posta (case-insensitive)", () => {
    expect(resolveTrackingTarget("px000rs", undefined)?.carrier).toBe("posta");
  });

  it("3. Bex + cifre -> null (samo kopiraj, ne vodi na AKS)", () => {
    expect(resolveTrackingTarget("123456", "Bex")).toBeNull();
  });

  it("4. samo cifre -> AKS", () => {
    const t = resolveTrackingTarget("123456", undefined);
    expect(t?.carrier).toBe("aks");
    expect(t && hasNum(t.url, "123456")).toBe(true);
  });

  it("5. kolona Aks + slovni broj -> AKS", () => {
    expect(resolveTrackingTarget("ABC-1", "Aks")?.carrier).toBe("aks");
  });

  it("6. kolona Posta + slovni broj -> Posta", () => {
    expect(resolveTrackingTarget("ABC-1", "Posta")?.carrier).toBe("posta");
  });

  it("7. prazno / whitespace / undefined -> null", () => {
    for (const num of ["", "   ", undefined]) {
      expect(resolveTrackingTarget(num, "Aks")).toBeNull();
    }
  });

  it("8. nepoznat broj bez kolone -> null", () => {
    expect(resolveTrackingTarget("ABC-1", undefined)).toBeNull();
  });

  it("9. trim se primenjuje na broj", () => {
    const t = resolveTrackingTarget("  123  ", undefined);
    expect(t && hasNum(t.url, "123")).toBe(true);
  });
});
