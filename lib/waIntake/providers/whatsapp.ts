// waIntake/providers/whatsapp.ts
// WhatsApp izvor poruka: real (whatsapp-web.js, lenjo-inicijalizovan singleton
// na globalThis da prezivi Next dev reload) + FakeWhatsApp za testove.
// whatsapp-web.js se ucitava iskljucivo dinamicki, tek na prvi klik "Povuci" -
// build/testovi ga nikad ne diraju.

import type { WaMessage, WhatsAppSource } from "../types";

const FETCH_LIMIT = 300;
// Overlap: poruke malo pre poslednjeg uvezenog ts se ponovo povlace da grupa
// koja je bila presecena izmedju dva uvoza bude kompletna (dedup po waMessageId
// svejedno sprecava dupli upis).
const OVERLAP_MS = 10 * 60 * 1000;
// Prvi uvoz (jos nema waTimestamp u bazi): ne vuci celu istoriju, samo poslednja 48h.
const FIRST_RUN_WINDOW_MS = 48 * 60 * 60 * 1000;

// Minimalni strukturni tipovi za whatsapp-web.js runtime objekte
// (bez uvoza njihovih tipova, da tsc ne zavisi od kvaliteta d.ts fajlova).
type WwebMedia = { data: string; mimetype?: string };
type WwebMessage = {
  id?: { _serialized?: string };
  timestamp?: number; // sekunde
  body?: string;
  hasMedia?: boolean;
  type?: string;
  downloadMedia: () => Promise<WwebMedia | null | undefined>;
};
type WwebChat = { fetchMessages: (opts: { limit: number }) => Promise<WwebMessage[]> };
type WwebClient = {
  initialize: () => Promise<void>;
  getChatById: (id: string) => Promise<WwebChat>;
  on: (event: string, cb: (payload: unknown) => void) => void;
};
type WwebModule = {
  Client: new (opts: unknown) => WwebClient;
  LocalAuth: new (opts: unknown) => unknown;
};

const READY_TIMEOUT_MS = 180_000; // dovoljno da se skenira QR pri prvom pokretanju

export class RealWhatsApp implements WhatsAppSource {
  private clientPromise: Promise<WwebClient> | null = null;

  private ensureClient(): Promise<WwebClient> {
    if (!this.clientPromise) {
      this.clientPromise = this.createClient().catch((error) => {
        // Neuspela inicijalizacija ne sme trajno da zaglavi singleton.
        this.clientPromise = null;
        throw error;
      });
    }
    return this.clientPromise;
  }

  private async createClient(): Promise<WwebClient> {
    const wwebRaw = (await import("whatsapp-web.js")) as unknown as WwebModule & { default?: WwebModule };
    const wweb = wwebRaw.default ?? wwebRaw;
    const qrRaw = (await import("qrcode-terminal")) as unknown as {
      generate: (qr: string, opts: { small: boolean }) => void;
      default?: { generate: (qr: string, opts: { small: boolean }) => void };
    };
    const qrcode = qrRaw.default ?? qrRaw;

    const client = new wweb.Client({
      authStrategy: new wweb.LocalAuth({ clientId: "wa-intake" }),
      puppeteer: { headless: true, args: ["--no-sandbox"] },
    });

    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("WhatsApp klijent nije postao spreman u roku (skeniraj QR u konzoli servera i probaj ponovo).")),
        READY_TIMEOUT_MS,
      );
      client.on("ready", () => {
        clearTimeout(timer);
        console.log("[wa-intake] WhatsApp klijent spreman.");
        resolve();
      });
      client.on("auth_failure", (message) => {
        clearTimeout(timer);
        reject(new Error(`WhatsApp autentifikacija nije uspela: ${String(message)}`));
      });
    });
    client.on("qr", (qr) => {
      console.log("[wa-intake] Skeniraj QR kod telefonom (WhatsApp > Povezani uredjaji):");
      qrcode.generate(String(qr), { small: true });
    });

    await client.initialize();
    await ready;
    return client;
  }

  async fetchMessagesSince(sinceTs: number | null): Promise<WaMessage[]> {
    const chatId = process.env.WA_CHAT_ID?.trim();
    if (!chatId) {
      throw new Error("WA_CHAT_ID nije podesen u .env.local (npr. 3816XXXXXXX@c.us).");
    }
    const client = await this.ensureClient();
    const chat = await client.getChatById(chatId);
    const fetched = await chat.fetchMessages({ limit: FETCH_LIMIT });

    const cutoff = sinceTs === null ? Date.now() - FIRST_RUN_WINDOW_MS : sinceTs - OVERLAP_MS;
    const relevant = fetched
      .map((raw) => ({ raw, ts: (raw.timestamp ?? 0) * 1000 }))
      .filter((entry) => entry.ts > cutoff)
      .sort((a, b) => a.ts - b.ts);

    const messages: WaMessage[] = [];
    for (const [index, entry] of relevant.entries()) {
      const images: string[] = [];
      if (entry.raw.hasMedia && entry.raw.type === "image") {
        try {
          const media = await entry.raw.downloadMedia();
          if (media?.data && (media.mimetype ?? "image/").startsWith("image/")) {
            images.push(media.data);
          }
        } catch (error) {
          console.error("[wa-intake] downloadMedia nije uspeo, poruka ide bez slike", error);
        }
      }
      messages.push({
        index,
        id: entry.raw.id?._serialized ?? `wa-ts-${entry.ts}`,
        ts: entry.ts,
        text: entry.raw.body ?? "",
        images,
      });
    }
    return messages;
  }
}

// Fake za testove i rad bez zivog WhatsApp-a: vraca unapred zadate poruke.
export class FakeWhatsApp implements WhatsAppSource {
  constructor(private readonly messages: WaMessage[]) {}

  async fetchMessagesSince(sinceTs: number | null): Promise<WaMessage[]> {
    return this.messages
      .filter((message) => sinceTs === null || message.ts > sinceTs)
      .map((message, index) => ({ ...message, index }));
  }
}

const globalStore = globalThis as unknown as { __waIntakeWhatsApp?: RealWhatsApp };

export function getWhatsAppSource(): WhatsAppSource {
  if (!globalStore.__waIntakeWhatsApp) {
    globalStore.__waIntakeWhatsApp = new RealWhatsApp();
  }
  return globalStore.__waIntakeWhatsApp;
}
