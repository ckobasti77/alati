# Moja Evidencija Prodaje

Ultralaka evidencija za internu upotrebu. Fokus je na brzom dodavanju proizvoda i prodaja, sve izrazena u evrima.

## Sta aplikacija radi
- Cuva listu proizvoda sa nabavnom i prodajnom cenom (EUR).
- Omogucava brzo dodavanje prodaje (rucno ili iz kataloga proizvoda).
- Prikazuje zbir prodajne vrednosti, nabavnih troskova i profita.

## Tehnologije
- Next.js 16 (App Router) + TypeScript
- Convex backend za upis/citanje podataka
- TailwindCSS + shadcn/ui

## Struktura
- / - kontrolna tabla sa zbirnim karticama i poslednjim prodajama
- /prodaje - lista prodaja sa pretragom i dijalogom za novu prodaju
- /proizvodi - lista proizvoda i forma za dodavanje

## Pokretanje
`ash
npm install
npm run dev
`

Za lokalni Convex koristi:
`ash
npx convex dev
`

Produkcioni Convex URL podesava se u .env.local.
