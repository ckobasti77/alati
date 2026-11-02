import { describe, expect, it } from "vitest";
import { ORDER_STAGES, STAGE_FLOW, STAGE_OPTIONS, STAGES, getStage, isOrderStage } from "./stages";

describe("stages", () => {
  it("prati redosled iz convex/orders.ts", () => {
    expect(ORDER_STAGES).toEqual(["poruceno", "aks", "na_stanju", "poslato", "stiglo", "legle_pare", "vraceno"]);
    expect(STAGE_OPTIONS.map((stage) => stage.value)).toEqual([...ORDER_STAGES]);
  });

  it("ima labelu sa dijakritikom, boju i ikonicu za svaki stage", () => {
    for (const value of ORDER_STAGES) {
      const stage = STAGES[value];
      expect(stage.value).toBe(value);
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.longLabel.length).toBeGreaterThan(0);
      expect(stage.tone).toMatch(/bg-stage-/);
      expect(stage.dotClass).toMatch(/^bg-stage-/);
      expect(stage.icon).toBeTruthy();
    }
    expect(STAGES.poruceno.label).toBe("Poručeno");
    expect(STAGES.vraceno.label).toBe("Vraćeno");
    expect(STAGES.legle_pare.label).toBe("Leglo");
    expect(STAGES.legle_pare.longLabel).toBe("Legle pare");
  });

  it("glavni tok ne sadrži Vraćeno", () => {
    expect(STAGE_FLOW.map((stage) => stage.value)).not.toContain("vraceno");
    expect(STAGE_FLOW).toHaveLength(6);
  });

  it("nepoznata vrednost pada na Poručeno", () => {
    expect(getStage("nesto").value).toBe("poruceno");
    expect(getStage(undefined).value).toBe("poruceno");
    expect(getStage("stiglo").label).toBe("Stiglo");
    expect(isOrderStage("aks")).toBe(true);
    expect(isOrderStage("AKS")).toBe(false);
  });
});
