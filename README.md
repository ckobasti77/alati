# Evidencija narudzbina

Ultralaka evidencija za internu upotrebu. Fokus je na brzom dodavanju proizvoda i narudzbina kroz faze, sve izrazena u evrima.

## Sta aplikacija radi
- Cuva listu proizvoda sa nabavnom i prodajnom cenom (EUR).
- Omogucava brzo dodavanje narudzbine (pretraga proizvoda, biranje varijante, kupac/adresa/telefon).
- Prati stage narudzbine: poruceno -> na stanju -> poslato -> stiglo -> legle pare.
- Racuna profit po narudzbini i zbirno (bez dodatnih procenata).
- Jedan profil (kodmajstora) bez dodavanja novih korisnika.

## Tehnologije
- Next.js 16 (App Router) + TypeScript
- Convex backend za upis/citanje podataka
- TailwindCSS + shadcn/ui

## Struktura
- / - kontrolna tabla sa zbirnim karticama i poslednjim narudzbinama
- /narudzbine - lista narudzbina sa pretragom i stage-ovima
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
