# WhatsApp → Narudžbine (uvoz na dugme) — README

Poluautomatski uvoz porudžbina iz jednog WhatsApp chata, **na dugme**, lokalno.
Stranica: **`/narudzbine/wa-uvoz`** → dugme „Povuci iz WhatsApp-a" → tabela za pregled →
„Potvrdi i upiši sve". Ništa se ne upisuje u bazu bez ljudske potvrde.

Spec: `docs/wa-intake-spec.md` (izvor istine).

## Arhitektura ukratko

```
dugme → POST /api/wa-intake
  1. orders.lastImportedWa            → dokle smo stali (max waTimestamp)
  2. whatsapp-web.js (LocalAuth)      → poruke posle toga (+ 10 min overlap; slike → base64)
  3. Gemini — Stage A                 → segmentacija: grupe {messageIndexes[], tip: licno|slanje|nije}
  4. Gemini — Stage B                 → ekstrakcija po grupi: ime/telefon/adresa/proizvod/link/cene
  5. productMatch                     → fuzzy naziv → katalog (products.name/kpName)
  6. KP (Playwright CDP)              → prodajna cena (link ili pretraga prodavnice)
  7. pricing                          → čista pravila cena + izvor + warnings
  → DraftOrder[] stranici (confidence + warnings)
stranica → orders.createBatchFromWa   → upis (dedup po waMessageId), stage "poruceno", upsertCustomer
```

**Vision ide preko Gemini API-ja** (`GEMINI_API_KEY` u `.env.local`, poziv u `lib/gemini.ts`) —
**Ollama više nije potrebna** ni za AKS priznanice ni za WhatsApp uvoz. WhatsApp (LocalAuth,
headless) i KP čitač (CDP Chrome) i dalje rade **lokalno** (`npm run dev`).

Svi spoljni servisi su iza interfejsa (`lib/waIntake/types.ts`) sa fake implementacijama
(`FakeWhatsApp`, `FakeVision`, `FakeKp`) — build i testovi ih nikad ne zovu uživo.

## Env (`.env.local`, sa podrazumevanim vrednostima)

| Promenljiva | Default | Napomena |
|---|---|---|
| `GEMINI_API_KEY` | — (obavezno) | Google Gemini API ključ za vision ekstrakciju (AKS priznanice + WhatsApp Stage A/B) |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Gemini model za vision pozive |
| `WA_PORUDZBINE_CHAT` | `Cale` | IME chata za uvoz porudžbina (nalog „porudzbine") |
| `WA_PAPIRICI_CHAT` | `Omer Aks` | IME chata za AKS priznanice (nalog „papirici") |
| `KP_CDP_URL` | `http://127.0.0.1:9222` | CDP port već prijavljenog Chrome-a |
| `KP_STORE_URL` | `https://www.kupujemprodajem.com/alati-beograd/svi-oglasi/5006381/1` | prodavnica za pretragu cena |

## Preduslovi (pre prvog klika)

1. **`GEMINI_API_KEY` u `.env.local`** — bez njega ekstrakcija vraća 503 sa porukom.
   Ollama/qwen više NISU potrebni.
2. **WhatsApp (LocalAuth, po nalogu)**: dva naloga — „porudzbine" i „papirici" —
   svaki sa svojom LocalAuth sesijom u `.wwebjs_auth/` (gitignored);
   whatsapp-web.js sam diže headless browser. Na PRVI klik za nalog QR se
   ispisuje u konzoli dev servera (`qrcode-terminal`) — skeniraj telefonom
   (WhatsApp → Povezani uređaji → Poveži uređaj) i klikni ponovo ako je zahtev
   u međuvremenu istekao. Posle prvog skeniranja sesija je zapamćena, QR više
   ne treba. Nema više CDP-a ni ručnog pokretanja Chrome-a za WhatsApp.
3. **KP Chrome na :9222**: pokrenut Chrome sa profilom prijavljenim na KP („kod Majstora"),
   sa `--remote-debugging-port=9222` (isti obrazac kao `kp-poster/post_kzubr_ads.py`).
   Bez njega uvoz i dalje radi — samo prodajna cena ostaje prazna uz warning.
4. Imena chatova u `.env.local` (`WA_PORUDZBINE_CHAT` / `WA_PAPIRICI_CHAT`) — chat se
   bira po IMENU (exact pa fuzzy, prag 0.8); za proveru imena služi dev-helper
   „Izlistaj WhatsApp chatove" na `/narudzbine/wa-uvoz` (`GET /api/wa-intake/chats?account=...`).

Prvi uvoz (kad još nijedna narudžbina nema `waTimestamp`) povlači samo poslednjih **48h**
poruka; svaki sledeći ide od poslednjeg uvezenog `waTimestamp` uz 10 min preklopa.

## Idempotentnost / dedup

- Ključ je `waMessageId` = **prva poruka grupe**; `waTimestamp` = najnovija poruka grupe.
- `orders.createBatchFromWa` preskače stavku ako `waMessageId` već postoji (index
  `by_waMessageId`), i duplikate unutar istog batcha. Odluka je čist modul
  `lib/waIntake/dedup.ts` (testiran bez Convex-a).
- Ponovni identičan batch → sve `skipped`, nijedan dupli upis.

## Pravila cena (lib/waIntake/pricing.ts)

- **Nabavna**: eksplicitna iz poruke (`nabavnaManual=true`) → katalog (najjeftinija
  `supplierOffers` bazna ponuda, pa `nabavnaCena`) → nepoznata + warning.
- **Prodajna**: eksplicitna iz poruke → KP link (`readByLink`) → KP pretraga prodavnice
  (`searchStoreAndRead`) → nepoznata + warning. Izvor cene se prikazuje u tabeli
  (`poruka` / `kp-link` / `kp-pretraga` / `katalog`).

## Testovi

`npm run test` — čisti moduli: `segment` (parsiranje JSON izlaza modela), `pricing`,
`productMatch`, `dedup` + postojeći `receiptMatcher` (fuzzy jezgro je refaktorisano
u zajednički `lib/textMatch.ts`).

## Šta ostaje da se štimuje/istestira UŽIVO (jutarnji zadatak)

1. **Imena chatova** — proveriti da `WA_PORUDZBINE_CHAT` / `WA_PAPIRICI_CHAT` tačno
   pogađaju chatove (dev-helper „Izlistaj WhatsApp chatove" na `/narudzbine/wa-uvoz`).
2. **KP selektori** — best-guess su i za oglas i za kartice prodavnice:
   - oglas: lista `PRICE_SELECTORS` u `lib/waIntake/providers/kp.ts`
     (`[class*="AdViewInfo_price"]` itd.) — otvoriti pravi oglas i proveriti šta pogađa cenu;
   - prodavnica: `a[href*="oglas"]` + regex za cenu u kartici (`collectStoreCards`) —
     proveriti da vraća naslove i cene, i da paginacija `.../svi-oglasi/5006381/<n>` važi.
   Svaki KP fejl je samo warning na draftu — uvoz ne puca.
3. **Vision promptovi (Gemini)** — `buildSegmentationPrompt` / `buildExtractionPrompt` u
   `lib/waIntake/segment.ts`. Na pravim porukama proveriti: da li dobro spaja
   screenshot+tekst u jednu grupu, da li „nije" hvata ćaskanje, i koliko dobro čita
   telefon sa screenshota. Parsiranje je robusno na višak teksta, ali sadržaj
   promptova će verovatno trebati doterivanje.
4. **Pragovi** — `PRODUCT_MATCH_THRESHOLD` (0.8) u `productMatch.ts` i
   `KP_CARD_MATCH_THRESHOLD` (0.55) u `kp.ts` po potrebi korigovati na pravim podacima.
5. **Prozor prvog uvoza** — ako 48h nije dovoljno za prvi run, privremeno povećati
   `FIRST_RUN_WINDOW_MS` u `providers/whatsapp.ts`.

## Napomena o lint okruženju

ESLint 10 je uklonio `context.getFilename`, a `eslint-plugin-react` (unutar
`eslint-config-next`) ga još zove pri detekciji React verzije — zato je u
`eslint.config.mjs` React verzija navedena eksplicitno (`settings.react.version`),
inače ceo `npm run lint` puca sa TypeError-om.
