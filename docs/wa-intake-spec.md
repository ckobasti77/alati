# WhatsApp → Narudžbine (uvoz na dugme) — SPEC

## Cilj i režim
Poluautomatski uvoz novih porudžbina iz JEDNOG WhatsApp chata, **na dugme** (ne automatski), lokalno.
Sve što poseže spolja je lokalno: whatsapp-web.js (čita chat), Ollama Qwen (čita sliku/tekst),
Playwright→već prijavljeni Chrome (čita KP cenu). Convex samo čuva. Čovek uvek potvrđuje pre upisa.

## KRITIČNO za autonomni /goal build
- Sve eksterne servise stavi **iza interfejsa** sa **fake** implementacijama za testove.
- **NE povezuj se na žive servise** (WhatsApp/Ollama/KP) tokom builda i testova — nisu dostupni headless.
- Čisti, potpuno testirani moduli: `pricing`, `productMatch`, `segment` parser, i dedup odluka.
- „Done" = `npx tsc --noEmit` čist, `npm run lint` čist, `npm run test` sve prolazi (novi + postojeći
  receiptMatcher testovi ostaju zeleni), `npx convex dev --once` uspešno.
- NE diraj AKS feature ni nevezan kod. NE radi git commit/push. NE deploy na prod.

## Pre builda pročitaj (konvencije)
`convex/schema.ts`, `convex/orders.ts` (`create`, `requireUser`, `normalizePhone`, `upsertCustomer`,
`normalizeStage`, `resolveSlanjeModeFromOrder`), `convex/search.ts` (`normalizeSearchText`),
`lib/receiptMatcher.ts` (Jaro-Winkler — izvuci u `lib/textMatch.ts` i importuj i tamo i ovde, bez duplikata),
`app/narudzbine/page.tsx` (UI stil: Radix Dialog, sonner, Tailwind), `kp-poster/post_kzubr_ads.py`
(obrazac: Playwright `connect_over_cdp("http://127.0.0.1:9222")` na prijavljeni Chrome „kod Majstora").

## Novi fajlovi
- `lib/textMatch.ts` — zajednički jaroWinkler/normalizacija (refaktor iz receiptMatcher, testovi ostaju zeleni).
- `lib/waIntake/types.ts` — ParsedOrder, DraftOrder, provider interfejsi.
- `lib/waIntake/segment.ts` — builder prompta + `parseSegmentation(json)` (+ `segment.test.ts`).
- `lib/waIntake/pricing.ts` — čista pravila cena (+ `pricing.test.ts`).
- `lib/waIntake/productMatch.ts` — fuzzy naziv→katalog (+ `productMatch.test.ts`).
- `lib/waIntake/providers/whatsapp.ts` — real (whatsapp-web.js singleton) + `FakeWhatsApp`.
- `lib/waIntake/providers/vision.ts` — real (Ollama qwen2.5vl:7b) + `FakeVision`.
- `lib/waIntake/providers/kp.ts` — real (Playwright CDP) + `FakeKp`.
- `app/api/wa-intake/route.ts` — POST orkestracija (lokalno).
- `app/narudzbine/wa-uvoz/page.tsx` — dugme „Povuci iz WhatsApp-a" + tabela za pregled.
- `docs/wa-intake-README.md` — env, preduslovi, šta ostaje uživo.

## Env (config, sa podrazumevanim)
`WA_CHAT_ID` (id chata, npr. `<broj>@c.us`), `OLLAMA_URL=http://localhost:11434`,
`WA_QWEN_MODEL=qwen2.5vl:7b`, `KP_CDP_URL=http://127.0.0.1:9222`,
`KP_STORE_URL=https://www.kupujemprodajem.com/alati-beograd/svi-oglasi/5006381/1`.

## Tok (na dugme)
1. Dugme → `POST /api/wa-intake`.
2. `orders.lastImportedWa` → najveći `waTimestamp` (dokle smo stali).
3. WhatsApp source: iz chata `WA_CHAT_ID` povuci poruke sa `timestamp > last` (+ mali overlap);
   skini slike (`downloadMedia` → base64). Vrati uređen niz poruka {index, ts, id, text, images[]}.
4. **Segmentacija (Qwen sam pametno grupiše)** — Stage A: prosledi ceo prozor poruka; Qwen vrati
   grupe `[{messageIndexes[], tip:"licno"|"slanje"|"nije"}]`. „nije" (ćaskanje) se odbacuje.
5. **Ekstrakcija** — Stage B: za svaku grupu prosledi njen tekst + slike; Qwen vrati polja:
   `{customerName?, phone?, address?, productText?, kpLink?, nabavnaExplicit?, prodajnaExplicit?}`.
   Lično: obično screenshot sa telefonom + link/tekst (treba telefon, ponekad ime).
   Slanje: ime, prezime, telefon, adresa (u tekstu ili na slici).
6. `productMatch(productText, catalog)` → najbolji proizvod (title/kpName) ili null.
7. `pricing(...)` (čista pravila, vidi dole).
8. Sastavi DraftOrder i vrati stranici sa `confidence` i `warnings`.
9. Stranica: tabela za pregled (izmenjivo, po redu „Prihvati"). „Potvrdi i upiši sve" →
   `orders.createBatchFromWa(prihvaćeni)`. Dedup: preskoči ako `waMessageId` već postoji.

## Pravila cena (pricing.ts — čisto, testirano)
- **Nabavna**: ako je eksplicitno napisana u poruci (npr. „55") → koristi nju, `nabavnaManual=true`.
  Inače, ako ima pogodak u katalogu → `product.nabavnaCena` (ili odgovarajući `supplierOffers`).
  Inače undefined → warning „nabavna nepoznata".
- **Prodajna (iz KP)**: ako u poruci ima KP link → `kp.readByLink(link)`.
  Inače → `kp.searchStoreAndRead(productText)` (pretraga po `KP_STORE_URL`).
  Ako eksplicitno napisana prodajna u poruci → ona ima prioritet nad KP.
  Ako ništa → undefined → warning „prodajna nepoznata".
- Vrati i izvor cene (`"poruka"|"kp-link"|"kp-pretraga"|"katalog"`) za prikaz.

## KP reader (reuse kp-poster obrazac)
Playwright (Node) `chromium.connectOverCDP(KP_CDP_URL)` na već prijavljeni Chrome (KP profil).
- `readByLink(url)`: `page.goto(url)`, pročitaj cenu (selektor best-guess, u try/catch).
- `searchStoreAndRead(text)`: otvori `KP_STORE_URL` stranice, skupi kartice `{title, price, link}`,
  fuzzy-match `text` (koristi `lib/textMatch`) → najbolja kartica → cena.
Sve resilientno: ako selektor/šema pukne, vrati `{price:undefined, warning}` i loguj — fino štimovanje
selektora je jutarnji zadatak. NE rušiti ceo uvoz ako jedan KP fejl.

## Vision (Ollama Qwen)
`POST ${OLLAMA_URL}/api/chat`, model `WA_QWEN_MODEL`, `format:"json"`, `options.temperature:0`,
poruke sa `images:[base64...]`. Dva poziva (Stage A segment, Stage B extract) sa strogim JSON schema
u promptu (srpski). Uvek parsiraj `message.content` kao JSON; robusno na višak teksta.

## Convex
- `schema.ts`: u `orders` dodaj opciono `waMessageId: v.optional(v.string())`,
  `waTimestamp: v.optional(v.number())`, `waImportedAt: v.optional(v.number())`. Zadrži postojeća polja.
  Ako `npx convex dev --once` prijavi „extra field" na POSTOJEĆIM podacima nekog drugog polja —
  dodaj TO polje kao opciono u odgovarajuću tabelu (NE gasi schemaValidation, NE briši validaciju).
- `orders.lastImportedWa({token, scope})` (query) → max `waTimestamp` (ili null).
- `orders.createBatchFromWa({token, scope, items})` (mutation): za svaku stavku — ako `waMessageId`
  već postoji → `skipped` + razlog. Inače insertuj narudžbinu reuse-ujući normalizaciju iz `create`
  (stage default „poruceno"; postavi customerName/phone/address/pickup/title/productId?/nabavnaCena/
  prodajnaCena/kolicina=1/napomena; `waMessageId`, `waTimestamp`, `waImportedAt`, `kreiranoAt`).
  Pozovi `upsertCustomer`. Vrati status po stavci. Auth `requireUser`.

## Testovi (moraju proći — ovo je goal)
- `pricing.test.ts`: eksplicitna nabavna gazi katalog; prodajna iz linka vs pretrage vs eksplicitno;
  nedostaje → warning.
- `productMatch.test.ts`: fuzzy pogodak po naslovu; bez pogotka → null (slobodan tekst).
- `segment.test.ts`: parsira uzorak Qwen JSON u grupe; „nije" se odbacuje; slika+tekst = jedna grupa.
- dedup test za `createBatchFromWa` odluku: ponovljen `waMessageId` → skipped (izdvoj čistu odluku u
  `lib/waIntake/dedup.ts` da bude testabilno bez Convex-a).
- Postojeći `lib/receiptMatcher.test.ts` ostaje zelen posle refaktora `textMatch`.

## Zavisnosti
`npm i whatsapp-web.js playwright-core qrcode-terminal`. Providere drži lenjo-inicijalizovane
(singleton na `globalThis` da preživi Next dev reload). QR se ispiše u konzolu servera pri prvom radu.

## Definicija gotovog
`npx tsc --noEmit` čist; `npm run lint` čist; `npm run test` sve zeleno; `npx convex dev --once` uspešno.
Na kraju popuni `docs/wa-intake-README.md`: env, preduslovi (QR skon, Ollama upaljena, KP Chrome na :9222),
i tačna lista šta ostaje da se štimuje/istestira uživo ujutru (KP selektori, WA_CHAT_ID, Qwen promptovi).
