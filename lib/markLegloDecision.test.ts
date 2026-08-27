import { describe, it, expect } from "vitest";
import { decideMarkLeglo } from "./markLegloDecision";

describe("decideMarkLeglo", () => {
  it("update za narudzbinu koja nije legle_pare", () => {
    expect(decideMarkLeglo({ stage: "poslato" })).toEqual({ action: "update" });
    expect(decideMarkLeglo({ stage: "stiglo" })).toEqual({ action: "update" });
    expect(decideMarkLeglo({ stage: "aks" })).toEqual({ action: "update" });
  });

  it("skip (idempotencija) ako je vec legle_pare", () => {
    const decision = decideMarkLeglo({ stage: "legle_pare" });
    expect(decision.action).toBe("skip");
  });
});
