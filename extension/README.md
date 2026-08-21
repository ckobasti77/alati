# Alati — Auto praćenje pošiljki (Chrome ekstenzija)

Kada u aplikaciji `alati` klikneš na broj pošiljke, otvara se AKS ili Pošta stranica
za praćenje sa brojem upisanim u `#hash` delu URL-a (npr.
`https://www.aks.rs/pracenje-posiljke/#alatiTrack=123456`). Ova ekstenzija na toj
stranici pročita broj, upiše ga u polje za praćenje i klikne dugme za pretragu.

Ekstenzija je neophodna jer aplikacija sa svog domena ne sme da upisuje u polja tuđeg
sajta (cross-origin zaštita browsera). Content script ekstenzije radi *unutar* AKS/Pošta
stranice, pa to sme.

## Instalacija (Chrome / Edge / Brave)

1. Otvori `chrome://extensions`
2. Uključi **Developer mode** (gore desno)
3. Klikni **Load unpacked**
4. Izaberi ovaj `extension/` folder

Gotovo. Sada klik na broj pošiljke u aplikaciji automatski popuni i pretraži status.

## Napomene

- Radi **samo u browseru gde je instalirana** (ne na telefonu, ne kod drugih ljudi).
- Ne traži nikakve posebne dozvole i ne čita clipboard — broj dobija iz URL hash-a.
- **Pošta** ima captcha token: ako sajt koristi nevidljivi captcha, auto-pretraga radi
  normalno; ako se pojavi interaktivni captcha, broj je već upisan pa samo klikneš dugme.
- Ako AKS ili Pošta promene izgled/ID polja, treba sitno ažurirati selektore u
  `content.js` (`SITES` niz).

## Podržani sajtovi

| Kurir | Stranica | Input | Dugme |
|-------|----------|-------|-------|
| AKS   | `www.aks.rs/pracenje-posiljke/` | `#temp_shipping_id` | `#submit_shipping_widget` |
| Pošta | `posta.rs/cir/alati/pracenje-posiljke.aspx` | `#cphMain_cphAlati_pracenjeposiljkeusercontrol_txtPosiljka` | `#cphMain_cphAlati_pracenjeposiljkeusercontrol_btnPosiljka` |
