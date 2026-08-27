import { describe, it, expect } from "vitest";
import { matchLegle, matchLegleBatch, type CandidateOrder } from "./legleMatcher";

const order = (o: Partial<CandidateOrder> & { id: string }): CandidateOrder => ({
  customerName: "",
  phone: "",
  stage: "poslato",
  ...o,
});

const pool: CandidateOrder[] = [
  order({ id: "o_robert", customerName: "Robert Rešovski", brojPosiljke: "92023002791112" }),
  order({ id: "o_snezana", customerName: "Snežana Vidaković", brojPosiljke: "92079002791581" }),
  order({ id: "o_sofija", customerName: "Sofija Pajević", brojPosiljke: "92019002791574", stage: "stiglo" }),
];

describe("matchLegle — poklapanje po NalogID broju", () => {
  it("egzaktan pogodak po broju + ime potvrda -> high", () => {
    const res = matchLegle({ platilac: "ROBERT REŠOVSKI", nalogId: "92023002791112" }, pool);
    expect(res.status).toBe("high");
    expect(res.orderId).toBe("o_robert");
  });

  it("broj poklapa i uz razmake/nedigit karaktere (poredi po ciframa)", () => {
    const res = matchLegle({ platilac: "Snežana Vidaković", nalogId: "9207 9002 791581" }, pool);
    expect(res.status).toBe("high");
    expect(res.orderId).toBe("o_snezana");
  });

  it("broj poklapa ali ime bitno odstupa -> review + upozorenje", () => {
    const res = matchLegle({ platilac: "Ana Marković", nalogId: "92023002791112" }, pool);
    expect(res.orderId).toBe("o_robert");
    expect(res.status).toBe("review");
    expect(res.warnings.some((w) => w.toLowerCase().includes("ime"))).toBe(true);
  });

  it("broj ne postoji ni na jednoj narudzbini, ime nije slicno -> none", () => {
    const res = matchLegle({ platilac: "Nepoznati Kupac", nalogId: "92999999999999" }, pool);
    expect(res.status).toBe("none");
  });

  it("name-only rezerva (broj nije procitan) nikad nije auto-high", () => {
    const res = matchLegle({ platilac: "Sofija Pajević", nalogId: "" }, pool);
    expect(res.orderId).toBe("o_sofija");
    expect(res.status).toBe("review");
  });
});

describe("matchLegleBatch — konflikti", () => {
  it("dva reda na istu narudzbinu -> oba review", () => {
    const results = matchLegleBatch(
      [
        { platilac: "Robert Rešovski", nalogId: "92023002791112" },
        { platilac: "Robert Rešovski", nalogId: "92023002791112" },
      ],
      pool,
    );
    expect(results[0].status).toBe("review");
    expect(results[1].status).toBe("review");
  });
});
