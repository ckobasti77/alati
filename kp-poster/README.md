# KupujemProdajem (KP) Ad Poster Workflow

Ovaj direktorijum sadrži automatizaciju za postavljanje oglasa na KupujemProdajem (KP) sa sajta `alati.vercel.app`.

## Sadržaj
1. **`post_kzubr_ads.py`**: Glavni skript koji pronalazi sledeći neobjavljeni **Kzubr** proizvod, preuzima ga, prilagođava sliku i objavljuje oglas na KP pod profilom "kod Majstora".
2. **`delete_kzubr_ads.py`**: Pomoćni skript koji briše sve aktivne Kzubr oglase sa KP profila (korisno za čišćenje i re-testiranje).
3. **`posted_products.json`**: Datoteka koja čuva ID-eve proizvoda koji su već objavljeni kako bi se sprečilo dupliranje.

---

## Kako se koristi

### 1. Pokretanje postavljanja novog oglasa
Pokrenite sledeću komandu u terminalu da biste automatski postavili sledeći Kzubr proizvod:
```bash
python post_kzubr_ads.py
```
**Šta skript radi:**
- Povezuje se na Chrome pretraživač (koristi profil "kod Majstora").
- Pronalazi prvi Kzubr proizvod koji nije naveden u `posted_products.json`.
- Preuzima slike i automatski ih konvertuje i povećava na rezoluciju od 1000px širine (kako bi KP uploader prihvatio sliku bez greške "Neispravna slika").
- Automatski prepoznaje i predlaže najbolju kategoriju na KP (npr. "Aku alati" za Aku šrafilice, "Pneumatski alat" za pneumatski odvijač, itd.).
- Popunjava cenu u evrima, naslov i opis.
- Označava stanje kao **"Polovno - nekorišćeno" (Kao novo)** i dozvoljava **lično preuzimanje**.
- Bira besplatnu opciju bez promocija.
- Bira **fizičko lice** za deklaraciju, prihvata uslove i postavlja oglas.
- Kada se oglas uspešno postavi, njegov ID se dodaje u `posted_products.json` da se ne bi ponovo kačio.

### 2. Čišćenje/Brisanje Kzubr oglasa
Ukoliko želite da uklonite sve Kzubr oglase sa profila (npr. radi ponovnog testiranja od početka):
```bash
python delete_kzubr_ads.py
```

### 3. Resetovanje istorije postavljanja
Ako želite da skript ponovo počne da kači proizvode ispočetka (npr. nakon brisanja svih oglasa), jednostavno ispraznite datoteku `posted_products.json` tako da sadrži samo praznu zagradu:
```json
[]
```

---

## Tehnički detalji i podešavanja
- Skriptovi koriste **Playwright** za upravljanje pretraživačem i automatski kopiraju Chrome profil "Profile 3" u privremeni direktorijum kako bi radili bez ometanja vašeg glavnog pretraživača.
- Slike se konvertuju pomoću biblioteke **Pillow** kako bi se osigurao ispravan JPEG format koji KP prihvata.
- Kategorija se određuje pomoću KP pretrage kategorija ("Predloži gde") na osnovu naziva proizvoda, a ukoliko pretraga ne vrati rezultat, koristi se podrazumevana kategorija "Pneumatski alat i kompresori".
