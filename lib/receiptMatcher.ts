// receiptMatcher.ts
// Pure, dependency-free matcher: povezuje podatke sa AKS priznanice
// (ime primaoca, telefon, broj posiljke iz bar-koda) sa narudzbinom koja ceka slanje.
//
// Dizajn: TELEFON je primarni kljuc (skoro jedinstven, vec ga normalizujes u bazi),
// IME je sekundarna potvrda (fuzzy, Jaro-Winkler + token-set, otporno na "Stefaan").
// Broj posiljke ide iz bar-koda pa se ovde koristi samo za upozorenja (duplikat).
//
// Nema Convex zavisnosti -> moze da stoji u lib/ i da se koristi i na klijentu i na serveru,
// i lako se testira vitest-om. foldName je superset tvog normalizeSearchText
// (isti dj/dijakritike) + cirilica->latinica.
//
// Fuzzy jezgro (foldName/jaro/jaroWinkler/token-set) zivi u lib/textMatch.ts
// (deli se sa WhatsApp uvozom); ovde se re-exportuje radi kompatibilnosti.

import { tokenSetSimilarity } from "./textMatch";

export { foldName, jaro, jaroWinkler } from "./textMatch";

export type CandidateOrder = {
  id: string;
  customerName: string;
  phone: string;
  stage: string; // "poruceno" | "aks" | "na_stanju" | "poslato" | ...
  slanjeMode?: string; // "Aks" | "Posta" | "Bex"
  brojPosiljke?: string;
};

export type ReceiptData = {
  name?: string;
  phone?: string;
  brojPosiljke?: string;
};

export type MatchStatus = "high" | "review" | "none";

export type MatchResult = {
  status: MatchStatus;
  orderId?: string;
  score: number; // 0..1 pouzdanost izabrane narudzbine
  reason: string;
  warnings: string[];
  alternatives: { orderId: string; name: string; score: number }[];
};

// --- konfiguracija pragova ---
// Priznanica sme da poklopi BILO KOJU postojecu narudzbinu, bez obzira na stanje
// (ukljucujuci "licno"/pickup i bilo koji nacin slanja). Zavrsena stanja ne blokiraju
// poklapanje, ali dobijaju upozorenje da se narudzbina ne pomeri unazad slucajno.
const COMPLETED_STAGES = new Set(["poslato", "stiglo", "legle_pare", "vraceno"]);
const NAME_HIGH = 0.9; // ime dovoljno slicno za "high" (uz jasnu prednost)
const NAME_MARGIN = 0.08; // prednost nad drugim kandidatom
const NAME_REVIEW = 0.74; // ispod ovoga za name-only -> "none"
const NAME_SANITY_MIN = 0.55; // telefon pogadja ali ime bitno odstupa -> review

// Slicnost imena: red reci nebitan (tokeni sortirani),
// token-set (za nedostajuce srednje ime) + cela niska.
export function nameSimilarity(a?: string, b?: string): number {
  return tokenSetSimilarity(a, b);
}

// --- normalizacija telefona (kanonski nacionalni broj) ---
export function canonicalPhone(raw?: string): string {
  if (!raw) return "";
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("381")) d = d.slice(3);
  d = d.replace(/^0+/, ""); // skini nacionalnu nulu / vodece nule
  return d;
}

function phoneEq(candidateRaw: string, receiptCanonical: string): boolean {
  const cc = canonicalPhone(candidateRaw);
  if (!cc || !receiptCanonical) return false;
  if (cc === receiptCanonical) return true;
  // labava rezerva: poklapanje poslednjih 8 cifara
  if (cc.length >= 8 && receiptCanonical.length >= 8) {
    return cc.slice(-8) === receiptCanonical.slice(-8);
  }
  return false;
}

const digitsOnly = (s?: string) => (s ?? "").replace(/\D/g, "");
// Bilo koja postojeca narudzbina je kandidat (bilo koje stanje, i "licno").
const isSendable = (_o: CandidateOrder) => true;

const COMPLETED_LABEL: Record<string, string> = {
  poslato: "POSLATO",
  stiglo: "STIGLO",
  legle_pare: "LEGLE PARE",
  vraceno: "VRAĆENO",
};

function orderWarnings(c: CandidateOrder, receipt: ReceiptData): { warnings: string[]; blocking: boolean } {
  const warnings: string[] = [];
  let blocking = false;
  if (COMPLETED_STAGES.has(c.stage)) {
    warnings.push(`Narudžbina je već u stanju ${COMPLETED_LABEL[c.stage] ?? c.stage.toUpperCase()}.`);
    blocking = true;
  }
  if (c.brojPosiljke && receipt.brojPosiljke && digitsOnly(c.brojPosiljke) !== digitsOnly(receipt.brojPosiljke)) {
    warnings.push(`Narudžbina već ima broj pošiljke ${c.brojPosiljke}.`);
    blocking = true;
  }
  if (!receipt.brojPosiljke) {
    warnings.push("Broj pošiljke nije pročitan sa bar-koda — proveri/unesi ručno.");
  }
  return { warnings, blocking };
}

type Ranked = { order: CandidateOrder; score: number };

function rankByName(orders: CandidateOrder[], name: string): Ranked[] {
  return orders
    .map((order) => ({ order, score: name ? nameSimilarity(name, order.customerName) : 0 }))
    .sort((a, b) => b.score - a.score);
}

const toAlts = (ranked: Ranked[]) =>
  ranked.map((r) => ({ orderId: r.order.id, name: r.order.customerName, score: round(r.score) }));

const round = (n: number) => Math.round(n * 1000) / 1000;

export function matchReceipt(receipt: ReceiptData, candidates: CandidateOrder[]): MatchResult {
  const sendable = candidates.filter(isSendable);
  const rPhone = canonicalPhone(receipt.phone);
  const rName = (receipt.name ?? "").trim();

  // 1) TELEFON PRVO (u okviru narudzbina koje cekaju slanje)
  if (rPhone) {
    const hits = sendable.filter((c) => phoneEq(c.phone, rPhone));

    if (hits.length === 1) {
      const c = hits[0];
      const nameSim = rName ? nameSimilarity(rName, c.customerName) : null;
      const ow = orderWarnings(c, receipt);
      let status: MatchStatus = "high";
      let reason = "Telefon primaoca jedinstveno pogađa narudžbinu.";
      let score = nameSim !== null ? Math.max(0.9, nameSim) : 0.98;
      if (nameSim !== null && nameSim < NAME_SANITY_MIN) {
        status = "review";
        reason = "Telefon pogađa, ali ime bitno odstupa — proveri.";
        score = nameSim;
      }
      if (ow.blocking) status = "review";
      const others = rankByName(sendable.filter((o) => o.id !== c.id), rName).slice(0, 2);
      return { status, orderId: c.id, score: round(score), reason, warnings: ow.warnings, alternatives: toAlts(others) };
    }

    if (hits.length > 1) {
      const ranked = rankByName(hits, rName);
      const best = ranked[0];
      const margin = best.score - (ranked[1]?.score ?? 0);
      const c = best.order;
      const ow = orderWarnings(c, receipt);
      let status: MatchStatus =
        rName && best.score >= NAME_HIGH && margin >= NAME_MARGIN ? "high" : "review";
      if (ow.blocking) status = "review";
      const reason =
        status === "high"
          ? "Više narudžbina na isti telefon; ime jasno bira jednu."
          : "Više narudžbina na isti telefon — izaberi tačnu.";
      return {
        status,
        orderId: c.id,
        score: round(best.score || 0.9),
        reason,
        warnings: ow.warnings,
        alternatives: toAlts(ranked.slice(1, 3)),
      };
    }

    // nema pogotka medju "za slanje" -> da li je mozda vec poslata (duplikat)?
    const sentHit = candidates.find((c) => c.stage === "poslato" && phoneEq(c.phone, rPhone));
    if (sentHit) {
      return {
        status: "review",
        orderId: sentHit.id,
        score: 0.9,
        reason: "Telefon pogađa narudžbinu koja je VEĆ poslata.",
        warnings: ["Narudžbina je već označena kao POSLATO."],
        alternatives: [],
      };
    }
    // inace padni na ime
  }

  // 2) SAMO IME (u okviru narudzbina koje cekaju slanje)
  if (rName && sendable.length > 0) {
    const ranked = rankByName(sendable, rName);
    const best = ranked[0];
    const margin = best.score - (ranked[1]?.score ?? 0);
    let status: MatchStatus;
    if (best.score >= NAME_HIGH && margin >= NAME_MARGIN) status = "high";
    else if (best.score >= NAME_REVIEW) status = "review";
    else status = "none";

    if (status === "none") {
      return {
        status,
        score: round(best.score),
        reason: "Nema dovoljno slične narudžbine (telefon nije pomogao).",
        warnings: receipt.brojPosiljke ? [] : ["Broj pošiljke nije pročitan sa bar-koda."],
        alternatives: toAlts(ranked.slice(0, 3)),
      };
    }

    const c = best.order;
    const ow = orderWarnings(c, receipt);
    if (ow.blocking) status = "review";
    return {
      status,
      orderId: c.id,
      score: round(best.score),
      reason:
        status === "high"
          ? "Telefon nije pročitan; ime je jedinstveno i vrlo slično."
          : "Telefon nije pročitan; ime slično — potvrdi ili izaberi.",
      warnings: ow.warnings,
      alternatives: toAlts(ranked.slice(1, 3)),
    };
  }

  return {
    status: "none",
    score: 0,
    reason: rPhone
      ? "Telefon ne pogađa nijednu narudžbinu koja čeka slanje."
      : "Nedovoljno podataka (nema ni telefona ni imena).",
    warnings: receipt.brojPosiljke ? [] : ["Broj pošiljke nije pročitan sa bar-koda."],
    alternatives: [],
  };
}

// Batch: resi konflikte kada dve priznanice pokazuju na istu narudzbinu.
export function matchBatch(receipts: ReceiptData[], candidates: CandidateOrder[]): MatchResult[] {
  const results = receipts.map((r) => matchReceipt(r, candidates));
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
          warnings: [...results[i].warnings, "Ista narudžbina predložena za više priznanica — razreši ručno."],
        };
      }
    }
  }
  return results;
}
