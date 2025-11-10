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

## Automatsko objavljivanje na Meta mreze
Dodavanje proizvoda automatski objavljuje istu objavu na Facebook stranici i Instagram nalogu. Potrebno je u Convex okruzenju definisati sledece promenljive:

- `FACEBOOK_PAGE_ID` i `FACEBOOK_PAGE_ACCESS_TOKEN` (token mora imati `pages_manage_posts` i `pages_read_engagement` dozvole).
- `INSTAGRAM_BUSINESS_ID` i `INSTAGRAM_ACCESS_TOKEN` (sa `instagram_basic` i `instagram_content_publish` opsegom). Ako ne podesite zaseban Instagram token, koristi se Facebook token.
- Opcioni `META_GRAPH_VERSION` ukoliko zelite drugu verziju Graph API-ja (podrazumevano je `v21.0`).

Slike se salju po redosledu kojim su unete u formu (glavna slika ide prva), uz naziv, opis i cenu proizvoda.
