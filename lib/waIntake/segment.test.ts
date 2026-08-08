import { describe, it, expect } from "vitest";
import { buildSegmentationPrompt, parseSegmentation, buildExtractionPrompt, parseExtraction } from "./segment";
import type { WaMessage } from "./types";

const msg = (index: number, text: string, images: string[] = []): WaMessage => ({
  index,
  id: `wa-msg-${index}`,
  ts: 1754650000000 + index * 60_000,
  text,
  images,
});

describe("buildSegmentationPrompt", () => {
  it("numerise poruke po indeksu i slike globalno redom", () => {
    const { prompt, images } = buildSegmentationPrompt([
      msg(0, "", ["IMG_A"]),
      msg(1, "Marko Petrovic, Ulica 5, Nis, 0641112233"),
      msg(2, "moze i ovaj", ["IMG_B", "IMG_C"]),
    ]);
    expect(images).toEqual(["IMG_A", "IMG_B", "IMG_C"]);
    expect(prompt).toContain("#0 ");
    expect(prompt).toContain("[SLIKA 1]");
    expect(prompt).toContain("#2 ");
    expect(prompt).toContain("[SLIKA 2] [SLIKA 3]");
    expect(prompt).toContain("Marko Petrovic, Ulica 5, Nis, 0641112233");
    expect(prompt).toContain('{"grupe"');
  });
});

describe("parseSegmentation", () => {
  it("parsira uzorak Qwen JSON-a u grupe; slika+tekst = jedna grupa", () => {
    const sample = JSON.stringify({
      grupe: [
        { messageIndexes: [0, 1], tip: "slanje" },
        { messageIndexes: [2], tip: "licno" },
      ],
    });
    const groups = parseSegmentation(sample, 3);
    expect(groups).toEqual([
      { messageIndexes: [0, 1], tip: "slanje" },
      { messageIndexes: [2], tip: "licno" },
    ]);
  });

  it('grupe tipa "nije" (caskanje) se odbacuju', () => {
    const sample = JSON.stringify({
      grupe: [
        { messageIndexes: [0], tip: "nije" },
        { messageIndexes: [1], tip: "slanje" },
      ],
    });
    const groups = parseSegmentation(sample, 2);
    expect(groups).toEqual([{ messageIndexes: [1], tip: "slanje" }]);
  });

  it("robusno: visak teksta oko JSON-a, string indeksi, duplikati i indeksi van opsega", () => {
    const noisy = `Evo grupa:\n{"grupe":[{"messageIndexes":["1","1",5,-2,0],"tip":"LICNO"},{"messageIndexes":[9],"tip":"slanje"}]}\nKraj.`;
    const groups = parseSegmentation(noisy, 3);
    expect(groups).toEqual([{ messageIndexes: [0, 1], tip: "licno" }]);
  });

  it("prihvata i niz kao koren; nevalidan JSON vraca []", () => {
    expect(parseSegmentation('[{"messageIndexes":[0],"tip":"slanje"}]', 1)).toEqual([
      { messageIndexes: [0], tip: "slanje" },
    ]);
    expect(parseSegmentation("nije json", 3)).toEqual([]);
  });
});

describe("buildExtractionPrompt", () => {
  it("ukljucuje tekst grupe i strogu JSON schemu", () => {
    const prompt = buildExtractionPrompt("slanje", "Marko Petrovic 0641112233");
    expect(prompt).toContain("Marko Petrovic 0641112233");
    expect(prompt).toContain('"customerName"');
    expect(prompt).toContain('"nabavnaExplicit"');
    expect(prompt).toContain("SLANJE");
  });
});

describe("parseExtraction", () => {
  it("parsira polja; prazni stringovi i null postaju undefined", () => {
    const sample = JSON.stringify({
      customerName: " Marko Petrovic ",
      phone: "064 111 22 33",
      address: "",
      productText: "aku busilica 21V",
      kpLink: "",
      nabavnaExplicit: null,
      prodajnaExplicit: 5990,
    });
    expect(parseExtraction(sample)).toEqual({
      customerName: "Marko Petrovic",
      phone: "064 111 22 33",
      address: undefined,
      productText: "aku busilica 21V",
      kpLink: undefined,
      nabavnaExplicit: undefined,
      prodajnaExplicit: 5990,
    });
  });

  it("cene kao stringovi ('55', '5.990 din') se parsiraju u brojeve", () => {
    const sample = JSON.stringify({ nabavnaExplicit: "55", prodajnaExplicit: "5.990 din" });
    const fields = parseExtraction(sample);
    expect(fields.nabavnaExplicit).toBe(55);
    expect(fields.prodajnaExplicit).toBe(5990);
  });

  it("nevalidan JSON vraca prazan objekat", () => {
    expect(parseExtraction("model se zbunio")).toEqual({});
  });
});
