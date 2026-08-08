import { describe, it, expect } from "vitest";
import { decideMarkPoslato } from "./markPoslatoDecision";

describe("decideMarkPoslato", () => {
  it("1. vec poslato sa istim brojem -> skip 'vec oznacena' (idempotentan ponovni run)", () => {
    const d = decideMarkPoslato({ stage: "poslato", brojPosiljke: "92044002798488" }, "92044002798488");
    expect(d.action).toBe("skip");
    expect(d.action === "skip" && d.reason).toMatch(/vec oznacena kao poslato/i);
  });

  it("2. vec poslato sa DRUGIM brojem -> skip, ali poruka je 'vec oznacena' (ne konflikt)", () => {
    const d = decideMarkPoslato({ stage: "poslato", brojPosiljke: "92076002798552" }, "92044002798488");
    expect(d.action).toBe("skip");
    expect(d.action === "skip" && d.reason).toMatch(/vec oznacena kao poslato/i);
  });

  it("3. aks + isti broj drugacije formatiran -> update (cifre jednake, nema laznog konflikta)", () => {
    const d = decideMarkPoslato({ stage: "aks", brojPosiljke: "92031111111111" }, "9203 1111 1111 11");
    expect(d).toEqual({ action: "update", brojPosiljke: "9203 1111 1111 11" });
  });

  it("4. aks + postojeci DRUGI broj -> skip konflikt", () => {
    const d = decideMarkPoslato({ stage: "aks", brojPosiljke: "92031111111111" }, "92099999999999");
    expect(d.action).toBe("skip");
    expect(d.action === "skip" && d.reason).toMatch(/vec ima drugi broj posiljke/i);
    expect(d.action === "skip" && d.reason).toContain("92031111111111");
  });

  it("5. prazan / whitespace / undefined broj -> skip", () => {
    for (const broj of ["", "   ", undefined]) {
      const d = decideMarkPoslato({ stage: "aks" }, broj);
      expect(d.action).toBe("skip");
      expect(d.action === "skip" && d.reason).toMatch(/prazan/i);
    }
  });

  it("6. stage van {aks, na_stanju} -> skip (ne vracaj unazad na poslato)", () => {
    for (const stage of ["stiglo", "legle_pare", "vraceno", "poruceno"]) {
      const d = decideMarkPoslato({ stage }, "92044002798488");
      expect(d.action).toBe("skip");
      expect(d.action === "skip" && d.reason).toContain(stage);
    }
  });

  it("7. happy path: na_stanju bez postojeceg broja -> update sa trimovanom vrednoscu", () => {
    const d = decideMarkPoslato({ stage: "na_stanju" }, "  92044002798488  ");
    expect(d).toEqual({ action: "update", brojPosiljke: "92044002798488" });
  });

  it("8. aks sa vec upisanim ISTIM brojem -> update (dozvoljeno, nista se ne gazi)", () => {
    const d = decideMarkPoslato({ stage: "aks", brojPosiljke: "92044002798488" }, "92044002798488");
    expect(d).toEqual({ action: "update", brojPosiljke: "92044002798488" });
  });
});
