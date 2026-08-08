import { describe, it, expect } from "vitest";
import { reconcileBroj } from "./receiptBarcode";

describe("reconcileBroj", () => {
  it("1. oba izvora se slazu -> bar-kod potvrdjen", () => {
    expect(reconcileBroj("92044002798488", "92044002798488")).toEqual({
      value: "92044002798488",
      barcodeConfirmed: true,
      mismatch: false,
      source: "both",
    });
  });

  it("2. slaganje uprkos razmacima/formatiranju u Qwen ciframa", () => {
    const r = reconcileBroj("9204 4002 7984 88", "92044002798488");
    expect(r.value).toBe("92044002798488");
    expect(r.barcodeConfirmed).toBe(true);
    expect(r.mismatch).toBe(false);
  });

  it("3. samo Qwen -> Qwen cifre, bez potvrde", () => {
    expect(reconcileBroj("92044002798488", null)).toEqual({
      value: "92044002798488",
      barcodeConfirmed: false,
      mismatch: false,
      source: "qwen",
    });
  });

  it("4. samo bar-kod (Qwen prazan) -> bar-kod vrednost, oznacen izvor 'barcode'", () => {
    expect(reconcileBroj("", "92044002798488")).toEqual({
      value: "92044002798488",
      barcodeConfirmed: true,
      mismatch: false,
      source: "barcode",
    });
    expect(reconcileBroj(undefined, "92044002798488").source).toBe("barcode");
  });

  it("5. mismatch -> Qwen pobedjuje, mismatch flag", () => {
    expect(reconcileBroj("92044002798488", "92076002798552")).toEqual({
      value: "92044002798488",
      barcodeConfirmed: false,
      mismatch: true,
      source: "both",
    });
  });

  it("6. oba prazna -> none", () => {
    expect(reconcileBroj("", null)).toEqual({
      value: "",
      barcodeConfirmed: false,
      mismatch: false,
      source: "none",
    });
    expect(reconcileBroj(undefined, null).source).toBe("none");
  });
});
