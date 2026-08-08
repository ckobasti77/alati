import { describe, it, expect } from "vitest";
import { decideWaImport } from "./dedup";

describe("decideWaImport", () => {
  it("nov waMessageId -> insert", () => {
    expect(decideWaImport("wa-1", new Set())).toEqual({ action: "insert" });
  });

  it("ponovljen waMessageId -> skip sa razlogom", () => {
    const decision = decideWaImport("wa-1", new Set(["wa-1"]));
    expect(decision.action).toBe("skip");
    if (decision.action === "skip") {
      expect(decision.reason).toContain("waMessageId");
    }
  });

  it("prazan/nedostajuci id -> skip (idempotentnost se ne sme zaobici)", () => {
    expect(decideWaImport(undefined, new Set()).action).toBe("skip");
    expect(decideWaImport("", new Set()).action).toBe("skip");
    expect(decideWaImport("   ", new Set()).action).toBe("skip");
  });

  it("duplikat unutar istog batcha: posle upisa caller dodaje id u set", () => {
    const seen = new Set<string>();
    const first = decideWaImport("wa-2", seen);
    expect(first.action).toBe("insert");
    seen.add("wa-2");
    const second = decideWaImport("wa-2", seen);
    expect(second.action).toBe("skip");
  });

  it("idempotentno: ponovni identican batch je sve skip", () => {
    const alreadyInDb = new Set(["wa-1", "wa-2", "wa-3"]);
    for (const id of ["wa-1", "wa-2", "wa-3"]) {
      expect(decideWaImport(id, alreadyInDb).action).toBe("skip");
    }
  });
});
