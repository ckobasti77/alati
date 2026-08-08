// waIntake/providers/kp.ts
// KP citac cena: real (playwright-core connectOverCDP na vec prijavljeni Chrome
// "kod Majstora", isti obrazac kao kp-poster/post_kzubr_ads.py) + FakeKp za testove.
// Sve je resilientno: ako selektor/konekcija pukne, vraca se {price: undefined, warning}
// i loguje - jedan KP fejl NE rusi ceo uvoz. Selektori su best-guess i stimuju se uzivo.

import { tokenSetSimilarity } from "../../textMatch";
import { parsePriceText } from "../pricing";
import type { KpPrice, KpReader } from "../types";
import type { Browser, Page } from "playwright-core";

const DEFAULT_KP_CDP_URL = "http://127.0.0.1:9222";
const DEFAULT_KP_STORE_URL = "https://www.kupujemprodajem.com/alati-beograd/svi-oglasi/5006381/1";
const NAV_TIMEOUT_MS = 30_000;
const MAX_STORE_PAGES = 3;
// Prag za fuzzy izbor kartice iz nase prodavnice (nizi od kataloskog praga -
// oglasi su nasi pa je pogodak verovatan, a covek svakako pregleda).
export const KP_CARD_MATCH_THRESHOLD = 0.55;

// Best-guess selektori za cenu na stranici oglasa (React klase tipa AdViewInfo_price__xxx).
const PRICE_SELECTORS = [
  '[class*="AdViewInfo_price"]',
  '[data-testid="ad-price"]',
  'h2[class*="price"]',
  '[class*="PriceAndSubscribe"]',
  '[class*="price"]',
];

export type KpCard = { title: string; price?: number; link: string };

const cdpUrl = () => process.env.KP_CDP_URL ?? DEFAULT_KP_CDP_URL;
const storeUrl = () => process.env.KP_STORE_URL ?? DEFAULT_KP_STORE_URL;

// ".../svi-oglasi/5006381/1" -> ".../svi-oglasi/5006381/<n>"
const storePageUrl = (pageNo: number) => `${storeUrl().replace(/\/\d+$/, "")}/${pageNo}`;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export class RealKp implements KpReader {
  private browserPromise: Promise<Browser> | null = null;

  private ensureBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = (async () => {
        const { chromium } = await import("playwright-core");
        return chromium.connectOverCDP(cdpUrl());
      })().catch((error) => {
        this.browserPromise = null;
        throw new Error(
          `KP: ne mogu da se povezem na Chrome preko CDP (${cdpUrl()}). Pokreni Chrome sa --remote-debugging-port=9222. (${errorMessage(error)})`,
        );
      });
    }
    return this.browserPromise;
  }

  private async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const browser = await this.ensureBrowser();
    let context = browser.contexts()[0];
    if (!context) context = await browser.newContext();
    const page = await context.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async readByLink(url: string): Promise<KpPrice> {
    try {
      return await this.withPage(async (page) => {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        let title: string | undefined;
        try {
          title = (await page.locator("h1").first().textContent({ timeout: 3000 }))?.trim() || undefined;
        } catch {
          title = undefined;
        }
        for (const selector of PRICE_SELECTORS) {
          try {
            const text = await page.locator(selector).first().textContent({ timeout: 2500 });
            const price = parsePriceText(text ?? undefined);
            if (price !== undefined) {
              return { price, link: url, title };
            }
          } catch {
            // probaj sledeci selektor
          }
        }
        return { price: undefined, link: url, title, warning: "KP: cena nije procitana sa oglasa (selektor za stimovanje)." };
      });
    } catch (error) {
      console.error("[wa-intake] KP readByLink fejl", error);
      return { price: undefined, link: url, warning: `KP: ${errorMessage(error)}` };
    }
  }

  async searchStoreAndRead(text: string): Promise<KpPrice> {
    try {
      const cards = await this.collectStoreCards();
      if (cards.length === 0) {
        return { price: undefined, warning: "KP: nijedna kartica nije procitana iz prodavnice (selektor za stimovanje)." };
      }
      const best = pickBestCard(text, cards);
      if (!best) {
        return { price: undefined, warning: `KP: nijedan oglas u prodavnici ne lici na "${text}".` };
      }
      if (best.card.price === undefined) {
        return {
          price: undefined,
          link: best.card.link,
          title: best.card.title,
          warning: "KP: kartica pronadjena ali cena nije procitana.",
        };
      }
      return { price: best.card.price, link: best.card.link, title: best.card.title };
    } catch (error) {
      console.error("[wa-intake] KP searchStoreAndRead fejl", error);
      return { price: undefined, warning: `KP: ${errorMessage(error)}` };
    }
  }

  private async collectStoreCards(): Promise<KpCard[]> {
    const cards: KpCard[] = [];
    for (let pageNo = 1; pageNo <= MAX_STORE_PAGES; pageNo++) {
      const pageCards = await this.withPage(async (page) => {
        await page.goto(storePageUrl(pageNo), { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        await page.waitForTimeout(1500); // React render
        return page.evaluate(() => {
          // Best-guess: svaki oglas je link ka /oglas/; cena je u tekstu najblizeg kontejnera.
          const seen = new Set<string>();
          const results: { title: string; priceText: string; link: string }[] = [];
          const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="oglas"]'));
          for (const anchor of anchors) {
            const link = anchor.href;
            if (!link || seen.has(link)) continue;
            const container = anchor.closest("article, li, section, div") ?? anchor;
            const containerText = (container as HTMLElement).innerText ?? "";
            const priceMatch = containerText.match(/\d[\d.,\s]*\s*(din|€|eur)/i);
            const title = (anchor.innerText || anchor.getAttribute("aria-label") || "").trim();
            if (!title) continue;
            seen.add(link);
            results.push({ title, priceText: priceMatch ? priceMatch[0] : "", link });
          }
          return results;
        });
      });
      if (pageCards.length === 0) break;
      for (const card of pageCards) {
        cards.push({ title: card.title, price: parsePriceText(card.priceText), link: card.link });
      }
    }
    return cards;
  }
}

// Cist izbor najbolje kartice (deli ga real i fake; koristi zajednicki textMatch).
export function pickBestCard(text: string, cards: KpCard[]): { card: KpCard; score: number } | null {
  let best: { card: KpCard; score: number } | null = null;
  for (const card of cards) {
    const score = tokenSetSimilarity(text, card.title);
    if (!best || score > best.score) best = { card, score };
  }
  if (!best || best.score < KP_CARD_MATCH_THRESHOLD) return null;
  return best;
}

// Fake za testove: cene po linku + kartice "prodavnice" u memoriji.
export class FakeKp implements KpReader {
  constructor(
    private readonly byLink: Record<string, number> = {},
    private readonly cards: KpCard[] = [],
  ) {}

  async readByLink(url: string): Promise<KpPrice> {
    const price = this.byLink[url];
    if (price === undefined) {
      return { price: undefined, link: url, warning: "KP: cena nije procitana sa oglasa (fake)." };
    }
    return { price, link: url };
  }

  async searchStoreAndRead(text: string): Promise<KpPrice> {
    const best = pickBestCard(text, this.cards);
    if (!best) {
      return { price: undefined, warning: `KP: nijedan oglas u prodavnici ne lici na "${text}".` };
    }
    return { price: best.card.price, link: best.card.link, title: best.card.title };
  }
}

const globalStore = globalThis as unknown as { __waIntakeKp?: RealKp };

export function getKpReader(): KpReader {
  if (!globalStore.__waIntakeKp) {
    globalStore.__waIntakeKp = new RealKp();
  }
  return globalStore.__waIntakeKp;
}
