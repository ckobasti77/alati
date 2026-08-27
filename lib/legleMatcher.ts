// legleMatcher.ts
// Cist, dependency-free matcher: povezuje red AKS "Specifikacije" (Platilac + NalogID)
// sa postojecom narudzbinom radi oznacavanja "legle pare".
//
// Dizajn se razlikuje od receiptMatcher-a: ovde je BROJ POSILJKE (NalogID) primarni
// kljuc — egzaktno, po ciframa (NalogID == orders.brojPosiljke upisan pri slanju).
// IME (Platilac == customerName) je sekundarna potvrda / rezerva kad broj ne poklopi.
//
// Vazna razlika: kandidati NISU filtrirani po stanju. Pare legu za vec poslate
// narudzbine (stanja "poslato"/"stiglo"), koja receiptMatcher tretira kao "zavrsena".

import { nameSimilarity } from "./receiptMatcher";
import type { CandidateOrder, MatchResult, MatchStatus } from "./receiptMatcher";

export type { CandidateOrder, MatchResult, MatchStatus } from "./receiptMatcher";

export type LegleData = {
  platilac?: string;
  nalogId?: string;
};

// Pragovi za name-only rezervu (kad NalogID ne poklopi nijednu narudzbinu).
const NAME_HIGH = 0.9;
const NAME_MARGIN = 0.08;
const NAME_REVIEW = 0.74;
// Ispod ovoga: broj poklopio, ali ime bitno odstupa -> upozorenje (ne blokira).
const NAME_CONFIRM_MIN = 0.55;
// Stanja u kojima pare legitimno mogu da legnu (vec poslato).
const SENT_STAGES = new Set(["poslato", "stiglo"]);

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");
const round = (n: number) => Math.round(n * 1000) / 1000;

type Ranked = { order: CandidateOrder; score: number };

function rankByName(orders: CandidateOrder[], name: string): Ranked[] {
  return orders
    .map((order) => ({ order, score: name ? nameSimilarity(name, order.customerName) : 0 }))
    .sort((a, b) => b.score - a.score);
}

const toAlts = (ranked: Ranked[]) =>
  ranked.map((r) => ({ orderId: r.order.id, name: r.order.customerName, score: round(r.score) }));

// Upozorenja koja vaze bez obzira na nacin poklapanja (ne blokiraju potvrdu).
function stageWarnings(c: CandidateOrder): string[] {
  const warnings: string[] = [];
  if (c.stage === "legle_pare") {
    warnings.push("Narudžbina je već u stanju LEGLE PARE.");
  } else if (!SENT_STAGES.has(c.stage)) {
    warnings.push("Narudžbina još nije označena kao poslato — proveri.");
  }
  return warnings;
}

export function matchLegle(row: LegleData, candidates: CandidateOrder[]): MatchResult {
  const broj = digitsOnly(row.nalogId);
  const name = (row.platilac ?? "").trim();

  // 1) NALOGID (broj posiljke) PRVO — egzaktno po ciframa.
  if (broj) {
    const hits = candidates.filter((c) => digitsOnly(c.brojPosiljke) === broj);

    if (hits.length === 1) {
      const c = hits[0];
      const nameSim = name ? nameSimilarity(name, c.customerName) : null;
      const warnings = stageWarnings(c);
      let status: MatchStatus = "high";
      let reason = "NalogID jedinstveno pogađa broj pošiljke narudžbine.";
      let score = nameSim !== null ? Math.max(0.95, nameSim) : 0.98;
      if (nameSim !== null && nameSim < NAME_CONFIRM_MIN) {
        warnings.push(`Ime platioca („${name}") bitno odstupa od narudžbine („${c.customerName}") — proveri.`);
        status = "review";
        reason = "NalogID pogađa, ali ime platioca odstupa — proveri.";
        score = nameSim;
      }
      if (c.stage === "legle_pare") status = "review";
      return { status, orderId: c.id, score: round(score), reason, warnings, alternatives: [] };
    }

    if (hits.length > 1) {
      const ranked = rankByName(hits, name);
      const c = ranked[0].order;
      return {
        status: "review",
        orderId: c.id,
        score: 0.9,
        reason: "Više narudžbina ima isti broj pošiljke — izaberi tačnu.",
        warnings: ["Isti NalogID postoji na više narudžbina."],
        alternatives: toAlts(ranked.slice(1, 3)),
      };
    }
    // broj ne poklapa nijednu -> padni na ime
  }

  // 2) SAMO IME (rezerva kada NalogID ne poklopi)
  if (name && candidates.length > 0) {
    const ranked = rankByName(candidates, name);
    const best = ranked[0];
    const margin = best.score - (ranked[1]?.score ?? 0);
    let status: MatchStatus;
    if (best.score >= NAME_HIGH && margin >= NAME_MARGIN) status = "high";
    else if (best.score >= NAME_REVIEW) status = "review";
    else status = "none";

    const brojNote = broj
      ? "NalogID ne pogađa nijedan broj pošiljke; "
      : "NalogID nije pročitan; ";

    if (status === "none") {
      return {
        status,
        score: round(best.score),
        reason: `${brojNote}nema dovoljno slične narudžbine po imenu.`,
        warnings: broj ? ["NalogID sa specifikacije ne postoji ni na jednoj narudžbini."] : [],
        alternatives: toAlts(ranked.slice(0, 3)),
      };
    }

    const c = best.order;
    const warnings = stageWarnings(c);
    if (broj) warnings.push("Poklapanje je samo po imenu (NalogID ne pogađa broj pošiljke) — proveri.");
    // Name-only poklapanje nikad nije auto-high dok broj ne potvrdi: spusti na review.
    if (status === "high") status = "review";
    return {
      status,
      orderId: c.id,
      score: round(best.score),
      reason: `${brojNote}ime platioca slično — potvrdi ili izaberi.`,
      warnings,
      alternatives: toAlts(ranked.slice(1, 3)),
    };
  }

  return {
    status: "none",
    score: 0,
    reason: broj
      ? "NalogID ne pogađa nijednu narudžbinu, a ime nije pročitano."
      : "Nedovoljno podataka (nema ni NalogID-a ni imena).",
    warnings: [],
    alternatives: [],
  };
}

// Batch: resi konflikte kada dva reda specifikacije pokazuju na istu narudzbinu.
export function matchLegleBatch(rows: LegleData[], candidates: CandidateOrder[]): MatchResult[] {
  const results = rows.map((r) => matchLegle(r, candidates));
  const byOrder = new Map<string, number[]>();
  results.forEach((res, i) => {
    if (res.orderId && res.status !== "none") {
      const arr = byOrder.get(res.orderId) ?? [];
      arr.push(i);
      byOrder.set(res.orderId, arr);
    }
  });
  for (const [, idxs] of byOrder) {
    if (idxs.length > 1) {
      for (const i of idxs) {
        results[i] = {
          ...results[i],
          status: "review",
          warnings: [...results[i].warnings, "Ista narudžbina predložena za više redova — razreši ručno."],
        };
      }
    }
  }
  return results;
}
