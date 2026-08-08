// waIntake/segment.ts
// Stage A (segmentacija) i Stage B (ekstrakcija): builderi promptova za Qwen
// + robusno parsiranje njegovog JSON odgovora. Cist modul bez zavisnosti na
// providere -> testira se vitest-om sa uzorcima Qwen izlaza.

import type { ExtractedFields, SegmentGroup, SegmentTip, WaMessage } from "./types";
import { parsePriceText } from "./pricing";

const belgradeTime = (ts: number) =>
  new Date(ts).toLocaleString("sv-SE", { timeZone: "Europe/Belgrade" });

// --- Stage A: segmentacija ---

export const SEGMENT_TIPS: SegmentTip[] = ["licno", "slanje"];

// Vraca prompt + slike u redosledu na koji se prompt poziva ([SLIKA n] = n-ta prilozena).
export function buildSegmentationPrompt(messages: WaMessage[]): { prompt: string; images: string[] } {
  const images: string[] = [];
  const lines = messages.map((message) => {
    const markers = message.images.map((image) => {
      images.push(image);
      return `[SLIKA ${images.length}]`;
    });
    const parts = [...markers];
    if (message.text.trim()) parts.push(message.text.trim());
    if (parts.length === 0) parts.push("(prazna poruka)");
    return `#${message.index} [${belgradeTime(message.ts)}] ${parts.join(" ")}`;
  });

  const prompt = `Ti citas poruke iz jednog WhatsApp chata u kome majstor prima porudzbine alata.
Poruke su hronoloske; jedna porudzbina je obicno 1-3 uzastopne poruke (npr. screenshot
telefona + tekst sa imenom, ili tekst sa imenom/adresom/telefonom za slanje).

Grupisi poruke u porudzbine. Za svaku grupu odredi tip:
- "licno": kupac dolazi licno (obicno screenshot sa telefonom + link/tekst; treba telefon, ponekad ime)
- "slanje": salje se kurirom (ime, prezime, telefon, adresa - u tekstu ili na slici)
- "nije": caskanje/ostalo, nije porudzbina

Poruke:
${lines.join("\n")}

Prilozene slike su numerisane redom: [SLIKA 1] je prva prilozena slika, [SLIKA 2] druga, itd.

Vrati STROGO JSON, bez ikakvog dodatnog teksta, tacno u ovom obliku:
{"grupe":[{"messageIndexes":[0,1],"tip":"licno"}]}
- messageIndexes: indeksi poruka (brojevi posle #) koje cine jednu porudzbinu
- tip: "licno" ili "slanje" ili "nije"
- Svaku poruku svrstaj u tacno jednu grupu.`;

  return { prompt, images };
}

// Izvuce prvi JSON objekat/niz iz sadrzaja, tolerantno na visak teksta oko njega.
function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

// Parsira Qwen odgovor Stage A u grupe. Odbacuje: grupe tipa "nije" (caskanje),
// nepoznate tipove, indekse van [0, messageCount) i prazne grupe.
export function parseSegmentation(content: string, messageCount: number): SegmentGroup[] {
  const parsed = parseModelJson(content);
  const root = asRecord(parsed);
  const rawGroups = Array.isArray(parsed)
    ? parsed
    : root && Array.isArray(root.grupe)
      ? root.grupe
      : root && Array.isArray(root.groups)
        ? root.groups
        : null;
  if (!rawGroups) return [];

  const groups: SegmentGroup[] = [];
  for (const raw of rawGroups) {
    const record = asRecord(raw);
    if (!record) continue;
    const tipRaw = typeof record.tip === "string" ? record.tip.trim().toLowerCase() : "";
    if (!(SEGMENT_TIPS as string[]).includes(tipRaw)) continue; // "nije" i nepoznato se odbacuju
    const rawIndexes = Array.isArray(record.messageIndexes)
      ? record.messageIndexes
      : Array.isArray(record.indexes)
        ? record.indexes
        : [];
    const indexes = [...new Set(
      rawIndexes
        .map((value) => (typeof value === "string" ? Number(value) : value))
        .filter((value): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < messageCount),
    )].sort((a, b) => a - b);
    if (indexes.length === 0) continue;
    groups.push({ messageIndexes: indexes, tip: tipRaw as SegmentTip });
  }
  return groups;
}

// --- Stage B: ekstrakcija ---

export function buildExtractionPrompt(tip: SegmentTip, text: string): string {
  const tipOpis =
    tip === "licno"
      ? `Ovo je porudzbina za LICNO preuzimanje: obicno screenshot ekrana telefona
(kontakt/poziv) + link ili tekst proizvoda. Najvaznije: telefon kupca (sa slike ili iz teksta)
i ime ako postoji. Adresa obicno ne postoji - ostavi prazno.`
      : `Ovo je porudzbina za SLANJE kurirom: ime i prezime, telefon i adresa
(u tekstu ili na slici). Izvuci sve sto postoji.`;

  return `Ti citas jednu porudzbinu iz WhatsApp chata majstora koji prodaje alate u Srbiji.
${tipOpis}

Tekst poruka:
${text.trim() || "(nema teksta, gledaj slike)"}

Ako su prilozene slike, procitaj i njih (screenshot telefona, slika adrese...).

Vrati STROGO JSON, bez dodatnog teksta, tacno sa ovim kljucevima:
{"customerName":"","phone":"","address":"","productText":"","kpLink":"","nabavnaExplicit":null,"prodajnaExplicit":null}
- customerName: ime (i prezime) kupca, "" ako nema
- phone: telefon kupca kao sto pise, "" ako nema
- address: puna adresa za slanje (ulica, broj, mesto), "" ako nema
- productText: naziv/opis proizvoda koji se porucuje, "" ako nema
- kpLink: link ka kupujemprodajem oglasu ako postoji u tekstu, inace ""
- nabavnaExplicit: nabavna cena ako je EKSPLICITNO napisana u poruci (npr. "55"), inace null
- prodajnaExplicit: prodajna cena ako je EKSPLICITNO napisana u poruci, inace null
- Ne izmisljaj vrednosti; ako nisi siguran, ostavi prazno/null.`;
}

const asTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export function parseExtraction(content: string): ExtractedFields {
  const record = asRecord(parseModelJson(content));
  if (!record) return {};
  return {
    customerName: asTrimmedString(record.customerName),
    phone: asTrimmedString(record.phone),
    address: asTrimmedString(record.address),
    productText: asTrimmedString(record.productText),
    kpLink: asTrimmedString(record.kpLink),
    nabavnaExplicit: parsePriceText(record.nabavnaExplicit),
    prodajnaExplicit: parsePriceText(record.prodajnaExplicit),
  };
}
