# WhatsApp → Narudžbine (uvoz na dugme) — README

Poluautomatski uvoz porudžbina iz jednog WhatsApp chata, **na dugme**, lokalno.
Stranica: **`/narudzbine/wa-uvoz`** → dugme „Povuci iz WhatsApp-a" → tabela za pregled →
„Potvrdi i upiši sve". Ništa se ne upisuje u bazu bez ljudske potvrde.

Spec: `docs/wa-intake-spec.md` (izvor istine).

## Arhitektura ukratko

```
dugme → POST /api/wa-intake
  1. orders.lastImportedWa            → dokle smo stali (max waTimestamp)
  2. whatsapp-web.js                  → poruke posle toga (+ 10 min overlap; slike → base64)
  3. Ollama Qwen — Stage A            → segmentacija: grupe {messageIndexes[], tip: licno|slanje|nije}
  4. Ollama Qwen — Stage B            → ekstrakcija po grupi: ime/telefon/adresa/proizvod/link/cene
  5. productMatch                     → fuzzy naziv → katalog (products.name/kpName)
  6. KP (Playwright CDP)              → prodajna cena (link ili pretraga prodavnice)
  7. pricing                          → čista pravila cena + izvor + warnings
  → DraftOrder[] stranici (confidence + warnings)
stranica → orders.createBatchFromWa   → upis (dedup po waMessageId), stage "poruceno", upsertCustomer
```

Svi spoljni servisi su iza interfejsa (`lib/waIntake/types.ts`) sa fake implementacijama
(`FakeWhatsApp`, `FakeVision`, `FakeKp`) — build i testovi ih nikad ne zovu uživo.

## Env (`.env.local`, sa podrazumevanim vrednostima)

| Promenljiva | Default | Napomena |
|---|---|---|
| `WA_CHAT_ID` | *(nema — obavezno podesiti)* | ID chata, npr. `3816XXXXXXX@c.us` |
| `OLLAMA_URL` | `http://localhost:11434` | lokalna Ollama |
| `WA_QWEN_MODEL` | `qwen2.5vl:7b` | vision model za segmentaciju + ekstrakciju |
| `KP_CDP_URL` | `http://127.0.0.1:9222` | CDP port već prijavljenog Chrome-a |
| `KP_STORE_URL` | `https://www.kupujemprodajem.com/alati-beograd/svi-oglasi/5006381/1` | prodavnica za pretragu cena |

## Preduslovi (pre prvog klika)

1. **WhatsApp QR**: pri prvom „Povuci iz WhatsApp-a" u konzoli `npm run dev` servera se
   ispisuje QR kod — skeniraj ga telefonom (WhatsApp → Povezani uređaji). Sesija se čuva
   (`LocalAuth`, clientId `wa-intake`), pa je ovo jednokratno. Klijent ima 180s timeout —
   ako QR ne stigneš da skeniraš, klikni ponovo.
2. **Ollama upaljena**: `ollama serve` + preuzet model (`ollama pull qwen2.5vl:7b`).
3. **KP Chrome na :9222**: pokrenut Chrome sa profilom prijavljenim na KP („kod Majstora"),
   sa `--remote-debugging-port=9222` (isti obrazac kao `kp-poster/post_kzubr_ads.py`).
   Bez njega uvoz i dalje radi — samo prodajna cena ostaje prazna uz warning.
4. `WA_CHAT_ID` podešen u `.env.local`.

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

`npm run test` — čisti moduli: `segment` (parsiranje Qwen JSON-a), `pricing`,
`productMatch`, `dedup` + postojeći `receiptMatcher` (fuzzy jezgro je refaktorisano
u zajednički `lib/textMatch.ts`).

## Šta ostaje da se štimuje/istestira UŽIVO (jutarnji zadatak)

1. **`WA_CHAT_ID`** — upisati pravi ID chata. Ako ga ne znaš: privremeno u
   `RealWhatsApp.createClient` dodaj `client.on("message", m => console.log(m.from))`
   ili iskoristi bilo koji whatsapp-web.js snippet za listanje chatova.
2. **KP selektori** — best-guess su i za oglas i za kartice prodavnice:
   - oglas: lista `PRICE_SELECTORS` u `lib/waIntake/providers/kp.ts`
     (`[class*="AdViewInfo_price"]` itd.) — otvoriti pravi oglas i proveriti šta pogađa cenu;
   - prodavnica: `a[href*="oglas"]` + regex za cenu u kartici (`collectStoreCards`) —
     proveriti da vraća naslove i cene, i da paginacija `.../svi-oglasi/5006381/<n>` važi.
   Svaki KP fejl je samo warning na draftu — uvoz ne puca.
3. **Qwen promptovi** — `buildSegmentationPrompt` / `buildExtractionPrompt` u
   `lib/waIntake/segment.ts`. Na pravim porukama proveriti: da li dobro spaja
   screenshot+tekst u jednu grupu, da li „nije" hvata ćaskanje, i koliko dobro čita
   telefon sa screenshota. Parsiranje je robusno na višak teksta, ali sadržaj
   promptova će verovatno trebati doterivanje.
4. **Prvi QR login** — obaviti jednom uz otvorenu konzolu servera.
5. **Pragovi** — `PRODUCT_MATCH_THRESHOLD` (0.8) u `productMatch.ts` i
   `KP_CARD_MATCH_THRESHOLD` (0.55) u `kp.ts` po potrebi korigovati na pravim podacima.
6. **Prozor prvog uvoza** — ako 48h nije dovoljno za prvi run, privremeno povećati
   `FIRST_RUN_WINDOW_MS` u `providers/whatsapp.ts`.

## Napomena o lint okruženju

ESLint 10 je uklonio `context.getFilename`, a `eslint-plugin-react` (unutar
`eslint-config-next`) ga još zove pri detekciji React verzije — zato je u
`eslint.config.mjs` React verzija navedena eksplicitno (`settings.react.version`),
inače ceo `npm run lint` puca sa TypeError-om.
