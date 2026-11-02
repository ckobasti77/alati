import { afterEach, describe, expect, it, vi } from "vitest";
import { DURATION, DURATION_MS, animateRouteIn, animateSheetOut, dur, prefersReducedMotion } from "./motion";

const mockReducedMotion = (reduce: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("motion", () => {
  it("trajanja su 150/220/320 ms", () => {
    expect(DURATION_MS).toEqual({ fast: 150, base: 220, slow: 320 });
    expect(DURATION.base * 1000).toBe(DURATION_MS.base);
  });

  it("reduced motion daje trajanje 0", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(dur(DURATION.slow)).toBe(0);
  });

  it("bez reduced motion trajanje ostaje", () => {
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(dur(DURATION.slow)).toBe(DURATION.slow);
  });

  it("uz reduced motion izlaz sheet-a je trenutan, a ruta se ne animira", () => {
    mockReducedMotion(true);
    const done = vi.fn();
    const panel = document.createElement("div");
    expect(animateSheetOut({ panel, overlay: null, fromBottom: true }, done)).toBeNull();
    expect(done).toHaveBeenCalledOnce();
    expect(animateRouteIn(panel)).toBeNull();
  });
});
