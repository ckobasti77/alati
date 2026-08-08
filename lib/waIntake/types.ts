// waIntake/types.ts
// Zajednicki tipovi za "WhatsApp -> Narudzbine (uvoz na dugme)".
// Sve eksterno (WhatsApp, Ollama, KP/Playwright) je iza interfejsa odavde,
// pa se orkestracija i cisti moduli testiraju sa fake implementacijama.

// Jedna WhatsApp poruka u prozoru za obradu. `index` je pozicija u prozoru
// (na nju se Qwen referise pri segmentaciji), `id` je waMessageId (dedup kljuc),
// `ts` je epoch ms, `images` su base64 (bez data: prefiksa) za Ollamu.
export type WaMessage = {
  index: number;
  id: string;
  ts: number;
  text: string;
  images: string[];
};

export type SegmentTip = "licno" | "slanje";

// Stage A rezultat: grupe poruka koje zajedno cine jednu porudzbinu.
// Grupe tipa "nije" (caskanje) se odbacuju vec u parseSegmentation.
export type SegmentGroup = {
  messageIndexes: number[];
  tip: SegmentTip;
};

// Stage B rezultat: polja koja je Qwen izvukao iz teksta + slika jedne grupe.
export type ExtractedFields = {
  customerName?: string;
  phone?: string;
  address?: string;
  productText?: string;
  kpLink?: string;
  nabavnaExplicit?: number;
  prodajnaExplicit?: number;
};

// Minimalan pogled na proizvod iz kataloga za fuzzy match i cene.
export type CatalogProduct = {
  id: string;
  name: string;
  kpName?: string;
  nabavnaCena: number;
  prodajnaCena: number;
  supplierOffers?: { price: number; variantId?: string }[];
};

export type NabavnaSource = "poruka" | "katalog";
export type ProdajnaSource = "poruka" | "kp-link" | "kp-pretraga";
export type PriceSource = NabavnaSource | ProdajnaSource;

// Draft koji API vraca stranici na pregled; nista se ne upisuje bez potvrde.
export type DraftOrder = {
  waMessageId: string;
  waTimestamp: number;
  tip: SegmentTip;
  customerName: string;
  phone: string;
  address: string;
  pickup: boolean;
  productText: string;
  productId?: string;
  title: string;
  kpLink?: string;
  nabavnaCena?: number;
  nabavnaSource?: NabavnaSource;
  prodajnaCena?: number;
  prodajnaSource?: ProdajnaSource;
  confidence: number; // 0..1
  warnings: string[];
};

// --- Provider interfejsi (real implementacije u providers/, fake za testove) ---

export interface WhatsAppSource {
  // Poruke iz pracenog chata sa timestamp > sinceTs (uz mali overlap);
  // sinceTs === null znaci "od pocetka prozora" (prvi uvoz).
  fetchMessagesSince(sinceTs: number | null): Promise<WaMessage[]>;
}

export interface VisionChat {
  // Jedan poziv Ollama /api/chat (format json, temperature 0); vraca message.content.
  chatJson(prompt: string, images: string[]): Promise<string>;
}

export type KpPrice = {
  price?: number;
  link?: string;
  title?: string;
  warning?: string;
};

export interface KpReader {
  readByLink(url: string): Promise<KpPrice>;
  searchStoreAndRead(text: string): Promise<KpPrice>;
}
