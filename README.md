# Evidencija narudzbina

Ultralaka evidencija za internu upotrebu. Fokus je na brzom dodavanju proizvoda i narudzbina kroz faze, sve izrazena u evrima.

## Sta aplikacija radi
- Cuva listu proizvoda sa nabavnom i prodajnom cenom (EUR).
- Omogucava brzo dodavanje narudzbine (pretraga proizvoda, biranje varijante, kupac/adresa/telefon).
- Prati stage narudzbine: poruceno → poslato → stiglo → legle pare.
- Cuva procenat i izracunava tvoj deo profita po narudzbini i zbirno.

## Tehnologije
- Next.js 16 (App Router) + TypeScript
- Convex backend za upis/citanje podataka
- TailwindCSS + shadcn/ui

## Struktura
- / - kontrolna tabla sa zbirnim karticama i poslednjim narudzbinama
- /narudzbine - lista narudzbina sa pretragom, stage-ovima i unosom profita
- /proizvodi - lista proizvoda i forma za dodavanje

## Pokretanje
```bash
npm install
npm run dev
```

Za lokalni Convex koristi:
```bash
npx convex dev
```

Produkcioni Convex URL podesava se u .env.local.
