// waIntake/providers/whatsapp.ts
// WhatsApp izvor poruka: real (whatsapp-web.js, lenjo-inicijalizovan singleton
// po nalogu na globalThis da prezivi Next dev reload) + FakeWhatsApp za testove.
// whatsapp-web.js se ucitava iskljucivo dinamicki, tek na prvi klik "Povuci" -
// build/testovi ga nikad ne diraju.
//
// Dva naloga: "porudzbine" (uvoz porudzbina) i "papirici" (AKS priznanice).
// Svaki nalog koristi LocalAuth sesiju (clientId wa-porudzbine / wa-papirici,
// dataPath .wwebjs_auth) sa headless puppeteer browserom: QR se skenira JEDNOM
// po nalogu (ispisuje se u konzoli servera preko qrcode-terminal), posle toga
// LocalAuth pamti sesiju. Chat se bira po IMENU iz env-a (exact pa fuzzy,
// lib/waIntake/chatPick), ne po @c.us id-u.

import type { WaAccount, WaChatSummary, WaMessage, WhatsAppSource } from "../types";
import { pickChatIdByName } from "../chatPick";

const FETCH_LIMIT = 300;
// Overlap: poruke malo pre poslednjeg uvezenog ts se ponovo povlace da grupa
// koja je bila presecena izmedju dva uvoza bude kompletna (dedup po waMessageId
// svejedno sprecava dupli upis).
const OVERLAP_MS = 10 * 60 * 1000;
// Prvi uvoz (jos nema waTimestamp u bazi): ne vuci celu istoriju, samo poslednja 48h.
const FIRST_RUN_WINDOW_MS = 48 * 60 * 60 * 1000;

// Konfiguracija po nalogu: LocalAuth clientId + env sa imenom pracenog chata.
const ACCOUNTS: Record<WaAccount, { clientId: string; chatEnv: string; chatDefault: string }> = {
  porudzbine: {
    clientId: "wa-porudzbine",
    chatEnv: "WA_PORUDZBINE_CHAT",
    chatDefault: "Cale",
  },
  papirici: {
    clientId: "wa-papirici",
    chatEnv: "WA_PAPIRICI_CHAT",
    chatDefault: "Omer Aks",
  },
};

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
type WwebChat = {
  id?: { _serialized?: string };
  name?: string;
  isGroup?: boolean;
  timestamp?: number; // sekunde, poslednja poruka
  fetchMessages: (opts: { limit: number }) => Promise<WwebMessage[]>;
};
type WwebClient = {
  initialize: () => Promise<void>;
  destroy?: () => Promise<void>;
  getChatById: (id: string) => Promise<WwebChat>;
  getChats: () => Promise<WwebChat[]>;
  on: (event: string, cb: (payload: unknown) => void) => void;
};
type WwebModule = {
  Client: new (opts: unknown) => WwebClient;
  LocalAuth: new (opts: { clientId: string; dataPath: string }) => unknown;
};

// Sesija vec postoji: ceka se samo headless start + restore.
const READY_TIMEOUT_MS = 120_000;
// QR prikazan (prvo logovanje naloga): korisnik mora da stigne da ga skenira.
const QR_SCAN_TIMEOUT_MS = 300_000;

// Pokusaj ASCII ispisa QR-a u konzoli. qrcode-terminal ume da pukne na dugackom
// WhatsApp payloadu (zato je browser QR — /api/wa-intake/qr — primarni nacin);
// tada NAMERNO ne dumpujemo sirov string (neupotrebljiv i zatrpava konzolu).
async function printQr(qr: string): Promise<void> {
  try {
    const mod = (await import("qrcode-terminal")) as typeof import("qrcode-terminal") & {
      default?: typeof import("qrcode-terminal");
    };
    (mod.generate ?? mod.default?.generate)?.(qr, { small: true });
  } catch {
    // Bez fallbacka na sirov string — koristi QR iz browsera.
  }
}

export class RealWhatsApp implements WhatsAppSource {
  private clientPromise: Promise<WwebClient> | null = null;
  // Kes rezolucije ime -> chat id, po nalogu; kljucan po imenu da promena
  // env-a (uz restart) ne vrati stari id.
  private chatCache: { name: string; id: string } | null = null;
  // Generacija klijenta: auth_failure/disconnected starog klijenta ne sme da
  // obori novi klijent koji je u medjuvremenu krenuo da se pravi.
  private generation = 0;
  // Login stanje za browser QR (/api/wa-intake/qr): poslednji QR string (dok
  // ceka skeniranje) i da li je sesija spremna. Cita ih getLoginState().
  private lastQr: string | null = null;
  private ready = false;

  constructor(private readonly account: WaAccount) {}

  // Neblokirajuce pokretanje logina: QR endpoint ovim pokrece klijenta a da ne
  // visi do skeniranja (greske se gutaju — vide se kroz getLoginState/log).
  beginLogin(): void {
    this.ensureClient().catch(() => undefined);
  }

  // Trenutno login stanje za browser QR stranicu.
  getLoginState(): { ready: boolean; qr: string | null } {
    return { ready: this.ready, qr: this.lastQr };
  }

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

  // Reset singletona (auth_failure/disconnected): sledeci klik pravi nov klijent.
  private resetFor(generation: number, client: WwebClient): void {
    if (this.generation !== generation) return;
    this.clientPromise = null;
    this.chatCache = null;
    this.ready = false;
    this.lastQr = null;
    client.destroy?.().catch(() => undefined);
  }

  private async createClient(): Promise<WwebClient> {
    const wwebRaw = (await import("whatsapp-web.js")) as unknown as WwebModule & { default?: WwebModule };
    const wweb = wwebRaw.default ?? wwebRaw;
    const generation = ++this.generation;
    const { clientId } = ACCOUNTS[this.account];

    // LocalAuth: sesija po nalogu u .wwebjs_auth/ (gitignored); whatsapp-web.js
    // sam dize headless browser - nema CDP-a ni spoljnjeg Chrome-a.
    const client = new wweb.Client({
      authStrategy: new wweb.LocalAuth({ clientId, dataPath: ".wwebjs_auth" }),
      puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
    });

    const ready = new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const fail = (error: Error) => {
        clearTimeout(timer);
        reject(error);
      };
      const arm = (ms: number, message: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => fail(new Error(message)), ms);
      };
      arm(
        READY_TIMEOUT_MS,
        `WhatsApp klijent (nalog "${this.account}") nije postao spreman u roku - probaj ponovo.`,
      );
      // Prvo logovanje naloga (LocalAuth jos nema sesiju): QR u konzoli servera,
      // skenira se telefonom jednom; posle toga sesija je zapamcena.
      client.on("qr", (payload) => {
        arm(
          QR_SCAN_TIMEOUT_MS,
          `QR za nalog "${this.account}" nije skeniran u roku - klikni ponovo za nov QR.`,
        );
        this.lastQr = String(payload);
        this.ready = false;
        console.log(
          `[wa-intake:${this.account}] Otvori QR u browseru i skeniraj telefonom: ` +
            `http://localhost:3000/api/wa-intake/qr?account=${this.account}  ` +
            `(WhatsApp > Povezani uredjaji > Povezi uredjaj).`,
        );
        void printQr(this.lastQr);
      });
      client.on("ready", () => {
        clearTimeout(timer);
        this.ready = true;
        this.lastQr = null;
        console.log(`[wa-intake:${this.account}] WhatsApp klijent spreman (LocalAuth "${clientId}").`);
        resolve();
      });
      client.on("auth_failure", (message) => {
        fail(new Error(`WhatsApp autentifikacija (nalog "${this.account}") nije uspela: ${String(message)}`));
      });
    });
    // Sekundarno odbijanje (npr. timer posle vec propalog initialize) ne sme da
    // ostane unhandled rejection.
    ready.catch(() => undefined);

    // Trajni reset handleri: i posle uspesnog starta pad sesije cisti singleton.
    client.on("auth_failure", () => this.resetFor(generation, client));
    client.on("disconnected", (reason) => {
      console.warn(`[wa-intake:${this.account}] WhatsApp diskonektovan: ${String(reason)} - sledeci klik pravi novu sesiju.`);
      this.resetFor(generation, client);
    });

    try {
      const init = client.initialize();
      init.catch(() => undefined); // guard, greska se hvata kroz race
      // race: initialize moze da visi dok se QR ne skenira, a "ready"/timeout/auth_failure
      // zive u `ready` - koji god prvi zavrsi, odlucuje.
      await Promise.race([init.then(() => ready), ready]);
    } catch (error) {
      client.destroy?.().catch(() => undefined);
      throw error;
    }
    return client;
  }

  // Ime pracenog chata za ovaj nalog (env, pa default).
  private chatName(): string {
    const cfg = ACCOUNTS[this.account];
    return process.env[cfg.chatEnv]?.trim() || cfg.chatDefault;
  }

  private async resolveChatIdByName(client: WwebClient, name: string): Promise<string> {
    if (this.chatCache?.name === name) return this.chatCache.id;
    const chats = await client.getChats();
    const id = pickChatIdByName(
      chats.map((chat) => ({ id: chat.id?._serialized ?? "", name: chat.name ?? "" })),
      name,
    );
    if (!id) {
      throw new Error(
        `Nije nađen chat po imenu: ${name} (nalog "${this.account}"). ` +
          `Proveri ${ACCOUNTS[this.account].chatEnv} u .env.local ili klikni "Izlistaj WhatsApp chatove".`,
      );
    }
    this.chatCache = { name, id };
    return id;
  }

  async fetchMessagesSince(sinceTs: number | null): Promise<WaMessage[]> {
    const client = await this.ensureClient();
    const name = this.chatName();
    const usedCache = this.chatCache?.name === name;
    let chat: WwebChat;
    try {
      chat = await client.getChatById(await this.resolveChatIdByName(client, name));
    } catch (error) {
      // Retry ima smisla samo ako je kesirani id mogao biti zastareo
      // (chat obrisan/ponovo kreiran); inace greska ide direktno korisniku.
      if (!usedCache) throw error;
      this.chatCache = null;
      chat = await client.getChatById(await this.resolveChatIdByName(client, name));
    }
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
          console.error(`[wa-intake:${this.account}] downloadMedia nije uspeo, poruka ide bez slike`, error);
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

  // Dev-helper za proveru imena chata: lista svih chatova naloga, najskorije prve.
  async listChats(): Promise<WaChatSummary[]> {
    const client = await this.ensureClient();
    const chats = await client.getChats();
    return chats
      .map((chat) => ({
        id: chat.id?._serialized ?? "",
        name: chat.name ?? "",
        isGroup: Boolean(chat.isGroup),
        lastMessageAt: chat.timestamp ? chat.timestamp * 1000 : undefined,
      }))
      .sort((a, b) => (b.lastMessageAt ?? -Infinity) - (a.lastMessageAt ?? -Infinity));
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

  async listChats(): Promise<WaChatSummary[]> {
    return [];
  }
}

// Po jedan singleton po nalogu (novi globalThis kljuc, da stari
// single-instance shape iz hot-reload procesa ne bude pogresno procitan).
const globalStore = globalThis as unknown as {
  __waIntakeWhatsAppByAccount?: Partial<Record<WaAccount, RealWhatsApp>>;
};

export function getWhatsAppSource(account: WaAccount): WhatsAppSource {
  const store = (globalStore.__waIntakeWhatsAppByAccount ??= {});
  return (store[account] ??= new RealWhatsApp(account));
}
