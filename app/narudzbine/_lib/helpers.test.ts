import { describe, expect, it } from "vitest";
import { resolveOrderTitle } from "./helpers";

describe("resolveOrderTitle (Q10)", () => {
  it("vraća validan naziv stavke", () => {
    expect(resolveOrderTitle("Bučica 5kg")).toBe("Bučica 5kg");
  });

  it("prazan string → fallback 'Narudzbina' umesto ''", () => {
    expect(resolveOrderTitle("")).toBe("Narudzbina");
  });

  it("whitespace-only → fallback 'Narudzbina'", () => {
    expect(resolveOrderTitle("   ")).toBe("Narudzbina");
    expect(resolveOrderTitle("\t\n ")).toBe("Narudzbina");
  });

  it("undefined/null → fallback 'Narudzbina'", () => {
    expect(resolveOrderTitle(undefined)).toBe("Narudzbina");
    expect(resolveOrderTitle(null)).toBe("Narudzbina");
  });

  it("preservira unutrašnji whitespace validnog naziva", () => {
    expect(resolveOrderTitle("Bučica  5kg")).toBe("Bučica  5kg");
  });
});
