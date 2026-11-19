// imagePrep.test.ts — čisti delovi pripreme slike (dimenzije, provera fajla, ime).
// SAMO izmišljeni podaci; canvas/fetch se ovde ne diraju.
import { describe, expect, it } from "vitest";
import { computeResizeDimensions, isImageFile, JPEG_QUALITY, MAX_IMAGE_SIDE, uploadFileName } from "./imagePrep";

describe("computeResizeDimensions", () => {
  it("ne menja slike koje su već male", () => {
    expect(computeResizeDimensions(800, 600)).toEqual({ width: 800, height: 600, scale: 1 });
  });

  it("smanjuje horizontalnu sliku na najdužu stranu 1600", () => {
    expect(computeResizeDimensions(3200, 2400)).toEqual({ width: 1600, height: 1200, scale: 0.5 });
  });

  it("smanjuje vertikalnu sliku (telefon) na najdužu stranu 1600", () => {
    expect(computeResizeDimensions(1200, 3000)).toEqual({ width: 640, height: 1600, scale: 1600 / 3000 });
  });

  it("ne uvećava male slike", () => {
    expect(computeResizeDimensions(10, 20)).toEqual({ width: 10, height: 20, scale: 1 });
  });

  it("podržava drugu max stranu", () => {
    expect(computeResizeDimensions(4000, 2000, 800)).toEqual({ width: 800, height: 400, scale: 0.2 });
  });

  it("vraća nule za nultu dimenziju umesto NaN", () => {
    expect(computeResizeDimensions(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
  });
});

describe("isImageFile", () => {
  it("prepoznaje po MIME tipu", () => {
    expect(isImageFile({ type: "image/jpeg", name: "x" })).toBe(true);
    expect(isImageFile({ type: "image/png", name: "x" })).toBe(true);
  });

  it("prepoznaje po ekstenziji kada je type prazan (galerija na telefonu)", () => {
    expect(isImageFile({ type: "", name: "fotografija.JPG" })).toBe(true);
    expect(isImageFile({ type: "", name: "slika.webp" })).toBe(true);
  });

  it("odbija nefotografske fajlove", () => {
    expect(isImageFile({ type: "application/pdf", name: "racun.pdf" })).toBe(false);
    expect(isImageFile({ type: "", name: "docx" })).toBe(false);
  });
});

describe("uploadFileName", () => {
  it("zadržava osnovicu i menja ekstenziju u .jpg", () => {
    expect(uploadFileName({ name: "kp-poruka.png" })).toBe("kp-poruka.jpg");
  });

  it("radi i bez ekstenzije", () => {
    expect(uploadFileName({ name: "slika" })).toBe("slika.jpg");
  });

  it("fallback ime kada je prazno", () => {
    expect(uploadFileName({ name: "" })).toBe("slika.jpg");
  });
});

describe("konstante", () => {
  it("najduža strana 1600 i kvalitet 0.85 (pravilo iz zadatka)", () => {
    expect(MAX_IMAGE_SIDE).toBe(1600);
    expect(JPEG_QUALITY).toBe(0.85);
  });
});
