import { describe, it, expect } from "vitest";
import {
  matchReceipt,
  matchBatch,
  canonicalPhone,
  nameSimilarity,
  foldName,
  type CandidateOrder,
} from "./receiptMatcher";

const order = (o: Partial<CandidateOrder> & { id: string }): CandidateOrder => ({
  customerName: "",
  phone: "",
  stage: "aks",
  slanjeMode: "Aks",
  ...o,
});

// Realan skup: narudzbine koje cekaju slanje
const pool: CandidateOrder[] = [
  order({ id: "o_stefan", customerName: "Stefan Nikolić", phone: "065 903 31 10" }),
  order({ id: "o_marko", customerName: "Marko Petrović", phone: "060 111 22 33" }),
  order({ id: "o_jovana", customerName: "Jovana Ilić", phone: "062 555 44 33" }),
];

describe("normalizacija", () => {
  it("telefon: 0.. i +381.. daju isti kanonski broj", () => {
    expect(canonicalPhone("065 903 31 10")).toBe(canonicalPhone("+381 65 903 31 10"));
    expect(canonicalPhone("065 903 31 10")).toBe(canonicalPhone("0038165 9033110"));
  });
  it("ime: cirilica/latinica i dijakritike se izjednacavaju", () => {
    expect(foldName("Stefan Nikolić")).toBe(foldName("Стефан Николић"));
    expect(foldName("Đorđe Šarčević")).toBe("djordje sarcevic");
  });
  it("Stefaan ~ Stefan je vrlo slicno, a razlicito ime nije", () => {
    expect(nameSimilarity("Stefaan Nikolić", "Stefan Nikolić")).toBeGreaterThan(0.9);
    expect(nameSimilarity("Marko Petrović", "Stefan Nikolić")).toBeLessThan(0.6);
  });
});

describe("matchReceipt", () => {
  it("1) telefon pogadja + progutano slovo u imenu (Stefaan) -> high, tacna narudzbina", () => {
    const r = matchReceipt(
      { name: "STEFAAN NIKOLIC", phone: "065 903 31 10", brojPosiljke: "92044002799487" },
      pool,
    );
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("o_stefan");
    expect(r.warnings).toHaveLength(0);
  });

  it("2) telefon u +381 formatu se svejedno poklapa -> high", () => {
    const r = matchReceipt(
      { name: "Stefan Nikolic", phone: "+381 65 903 31 10", brojPosiljke: "92044002799487" },
      pool,
    );
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("o_stefan");
  });

  it("3) obrnut redosled imena (Nikolic Stefan) uz telefon -> high", () => {
    const r = matchReceipt(
      { name: "NIKOLIC STEFAN", phone: "0659033110", brojPosiljke: "92044002799487" },
      pool,
    );
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("o_stefan");
  });

  it("4) dva kupca isto ime -> telefon razdvaja tacnu", () => {
    const dup: CandidateOrder[] = [
      order({ id: "a", customerName: "Nikola Nikolić", phone: "061 000 11 22" }),
      order({ id: "b", customerName: "Nikola Nikolić", phone: "063 999 88 77" }),
    ];
    const r = matchReceipt({ name: "Nikola Nikolic", phone: "063 999 88 77", brojPosiljke: "111" }, dup);
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("b");
  });

  it("5) dva kupca isto ime, telefon NEČITAK -> review + alternativa (bez auto-commita)", () => {
    const dup: CandidateOrder[] = [
      order({ id: "a", customerName: "Nikola Nikolić", phone: "061 000 11 22" }),
      order({ id: "b", customerName: "Nikola Nikolić", phone: "063 999 88 77" }),
    ];
    const r = matchReceipt({ name: "Nikola Nikolic", brojPosiljke: "111" }, dup);
    expect(r.status).toBe("review");
    expect(r.alternatives.length).toBeGreaterThanOrEqual(1);
  });

  it("6) telefon nečitak ali ime jedinstveno i jako -> high", () => {
    const r = matchReceipt({ name: "Jovana Ilic", brojPosiljke: "222" }, pool);
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("o_jovana");
  });

  it("7) jedini pogodak po telefonu je već POSLATA narudžbina -> review + upozorenje", () => {
    const withSent: CandidateOrder[] = [
      ...pool,
      order({ id: "o_sent", customerName: "Stefan Nikolić", phone: "065 903 31 10", stage: "poslato", brojPosiljke: "92044002799487" }),
    ];
    // izbaci aktivnu stefan narudzbinu da telefon pogadja samo poslatu
    const onlySent = withSent.filter((o) => o.id !== "o_stefan");
    const r = matchReceipt({ name: "Stefan Nikolic", phone: "065 903 31 10", brojPosiljke: "92044002799487" }, onlySent);
    expect(r.status).toBe("review");
    expect(r.orderId).toBe("o_sent");
    expect(r.warnings.join(" ")).toMatch(/POSLATO/i);
  });

  it("8) narudžbina već ima DRUGI broj pošiljke -> review + upozorenje", () => {
    const p: CandidateOrder[] = [
      order({ id: "o_stefan", customerName: "Stefan Nikolić", phone: "065 903 31 10", brojPosiljke: "99999999" }),
    ];
    const r = matchReceipt({ name: "Stefan Nikolic", phone: "065 903 31 10", brojPosiljke: "92044002799487" }, p);
    expect(r.status).toBe("review");
    expect(r.warnings.join(" ")).toMatch(/već ima broj pošiljke/i);
  });

  it("9) ćirilica na priznanici, latinica u bazi + telefon -> high", () => {
    const r = matchReceipt({ name: "Стефан Николић", phone: "0659033110", brojPosiljke: "92044002799487" }, pool);
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("o_stefan");
  });

  it("10) broj pošiljke NIJE pročitan (bar-kod) -> upozorenje, ali match ostaje", () => {
    const r = matchReceipt({ name: "Stefan Nikolic", phone: "065 903 31 10" }, pool);
    expect(r.orderId).toBe("o_stefan");
    expect(r.warnings.join(" ")).toMatch(/bar-koda/i);
  });

  it("11) nema poklapanja ni po telefonu ni po imenu -> none", () => {
    const r = matchReceipt({ name: "Nepoznato Ime", phone: "069 000 00 00", brojPosiljke: "555" }, pool);
    expect(r.status).toBe("none");
    expect(r.orderId).toBeUndefined();
  });

  it("12) završena narudžbina ('stiglo') se i dalje poklopi, ali ide na review + upozorenje", () => {
    const p: CandidateOrder[] = [
      order({ id: "x", customerName: "Stefan Nikolić", phone: "065 903 31 10", stage: "stiglo" }),
    ];
    const r = matchReceipt({ name: "Stefan Nikolic", phone: "065 903 31 10", brojPosiljke: "1" }, p);
    expect(r.status).toBe("review");
    expect(r.orderId).toBe("x");
    expect(r.warnings.join(" ")).toMatch(/STIGLO/i);
  });

  it("12b) 'lično'/pickup narudžbina (slanjeMode nije Aks) se svejedno poklopi po telefonu -> high", () => {
    const p: CandidateOrder[] = [
      order({ id: "licno", customerName: "Stefan Nikolić", phone: "065 903 31 10", stage: "poruceno", slanjeMode: "Licno" }),
    ];
    const r = matchReceipt({ name: "Stefan Nikolic", phone: "065 903 31 10", brojPosiljke: "1" }, p);
    expect(r.status).toBe("high");
    expect(r.orderId).toBe("licno");
  });
});

describe("matchBatch", () => {
  it("13) dve priznanice ciljaju istu narudžbinu -> obe idu na review (konflikt)", () => {
    const res = matchBatch(
      [
        { name: "Stefan Nikolic", phone: "065 903 31 10", brojPosiljke: "111" },
        { name: "Stefaan Nikolic", phone: "065 903 31 10", brojPosiljke: "222" },
      ],
      pool,
    );
    expect(res[0].status).toBe("review");
    expect(res[1].status).toBe("review");
    expect(res.every((r) => r.warnings.some((w) => /više priznanica/i.test(w)))).toBe(true);
  });

  it("14) dve različite priznanice -> dva čista high pogotka", () => {
    const res = matchBatch(
      [
        { name: "Stefan Nikolic", phone: "065 903 31 10", brojPosiljke: "111" },
        { name: "Marko Petrovic", phone: "060 111 22 33", brojPosiljke: "222" },
      ],
      pool,
    );
    expect(res[0].orderId).toBe("o_stefan");
    expect(res[1].orderId).toBe("o_marko");
    expect(res[0].status).toBe("high");
    expect(res[1].status).toBe("high");
  });
});
