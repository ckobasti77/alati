# LOKALNO + GEMINI — SPEC (rework)

## Cilj
Aplikacija ostaje LOKALNA (`npm run dev`). Dve promene:
1. **WhatsApp na LocalAuth** (whatsapp-web.js sam diže headless browser, pamti sesiju, QR se skenira JEDNOM po nalogu). SKINI CDP-attach potpuno.
2. **Vision ekstrakcija ide na Gemini (cloud)** umesto Ollame — i za AKS priznanice i za WhatsApp uvoz porudžbina.
Matcher, pricing, KP reader, Convex upis i review UI ostaju NETAKNUTI (samo se pozivaju).

## KRITIČNO za autonomni /goal build
- Sve eksterne servise (WhatsApp, Gemini, KP) drži IZA interfejsa sa FAKE implementacijama.
- NE zovi žive servise tokom builda/testova (nema API ključa u CI, nema WhatsApp/KP) — koristi fakes.
- „Done" = `npx tsc --noEmit` čist, `npm run lint` čist, `npm run test` sve prolazi (postojeći testovi ostaju zeleni), `npx convex dev --once` uspešno.
- NE diraj: matcher (lib/receiptMatcher, lib/textMatch), pricing, productMatch, KP provider (lib/waIntake/providers/kp.ts), Convex mutacije/upis, review UI. NE git commit/push, NE deploy na prod.

## Pre builda pročitaj (konvencije)
- lib/waIntake/providers/whatsapp.ts, lib/waIntake/providers/vision.ts, lib/waIntake/types.ts, lib/waIntake/segment.ts
- lib/receiptExtract.ts (postojeća Ollama ekstrakcija za AKS)
- app/api/receipt-extract/route.ts, app/api/receipt-extract/from-whatsapp/route.ts, app/api/wa-intake/route.ts

## DEO A — WhatsApp na LocalAuth (ako već nije)
U `lib/waIntake/providers/whatsapp.ts`, RealWhatsApp (po nalogu, singleton na globalThis):
- SKINI CDP kod: `browserWSEndpoint`, `fetch(/json/version)`, `WA_PORUDZBINE_CDP_URL`, `WA_PAPIRICI_CDP_URL`.
- createClient (whatsapp-web.js se učitava dinamički):
  ```
  new Client({
    authStrategy: new LocalAuth({ clientId: "<wa-porudzbine|wa-papirici>", dataPath: ".wwebjs_auth" }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  })
  ```
- Na `"qr"` event ispiši QR u konzolu servera preko `qrcode-terminal` (samo prvi put; LocalAuth posle pamti). Na `"ready"` loguj „spreman". Na `"auth_failure"`/`"disconnected"` resetuj singleton da sledeći klik može ponovo.
- ZADRŽI: `resolveChatIdByName` (env `WA_PORUDZBINE_CHAT` default "Cale", `WA_PAPIRICI_CHAT` default "Omer Aks"), `fetchMessagesSince` (prozor/overlap/limit), `listChats`, po-nalogu singleton.
- Dodaj `.wwebjs_auth` u `.gitignore` ako nije.

## DEO B — Vision na Gemini umesto Ollame
Novi fajl `lib/gemini.ts`:
```
export async function geminiVision(prompt: string, images: string[] /* base64 bez data: prefiksa */): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY; if (!key) throw new Error("GEMINI_API_KEY nije podesen u .env.local");
  const model = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = { contents: [{ parts: [{ text: prompt }, ...images.map(d => ({ inline_data: { mime_type: "image/jpeg", data: d } }))] }],
                 generationConfig: { responseMimeType: "application/json", temperature: 0 } };
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini greska ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return JSON.parse(text);
}
```
Zameni Ollama pozive Gemini-jem, ZADRŽAVAJUĆI ISTI ulaz/izlaz (JSON oblik) da matcher/pricing/segment parser ostanu isti:
- `lib/receiptExtract.ts` — AKS ekstrakcija {imePrimaoca, telefonPrimaoca, brojPosiljke}: umesto Ollama poziva koristi `geminiVision(prompt, [base64])`. Ukloni `OLLAMA_URL`/qwen iz ove putanje; zadrži `OllamaUnavailableError` ime ili preimenuj u `VisionUnavailableError` i ažuriraj importe (npr. u vision provideru).
- `lib/waIntake/providers/vision.ts` — RealVision implementacija (VisionChat interfejs) sada zove `geminiVision`; FakeVision ostaje za testove.
- `lib/waIntake/segment.ts` / gde god se zvao Ollama za Stage A (segmentacija) i Stage B (ekstrakcija) — koristi isti Gemini put; promptovi i JSON schema ostaju isti.
- Ukloni preostale reference na OLLAMA_URL / WA_QWEN_MODEL u ovim putanjama.

## Env (.env.local)
```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-lite-latest
WA_PORUDZBINE_CHAT=Cale
WA_PAPIRICI_CHAT=Omer Aks
```

## Testovi
- Vision iza interfejsa; testovi koriste FakeVision (bez živog Gemini poziva).
- Ako menjaš potpise (npr. VisionUnavailableError), ažuriraj sve importe i fake/testove.
- Postojeći testovi (receiptMatcher, waIntake pricing/productMatch/segment/dedup) ostaju zeleni.

## Definicija gotovog
`npx tsc --noEmit` bez greške; `npm run lint` čist; `npm run test` sve prolazi; `npx convex dev --once` uspešno (ako prijavi „extra field" na postojećim podacima → dodaj to polje kao opciono u schemu, ne gasi validaciju). Na kraju kratko dopuni `docs/wa-intake-README.md`: da se koristi Gemini (GEMINI_API_KEY), da Ollama više nije potrebna, i da WhatsApp/KP ostaju lokalni.
