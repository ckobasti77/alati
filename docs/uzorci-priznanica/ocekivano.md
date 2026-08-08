# Ocekivani rezultati ekstrakcije (uzorci AKS priznanica)

Slike ubaci u ovaj folder pod imenima iz JSON bloka ispod. Integracioni test
(`npm run test:receipts`) preskace slike koje nedostaju i preskace ceo suite ako
lokalna Ollama nije pokrenuta.

Nove uzorke dodajes tako sto ubacis sliku u ovaj folder i dopises red u JSON blok
(bez izmene koda). Korisni su bas teski slucajevi: mutne slike, slikano pod uglom,
vise preklopljenih priznanica, zguzvane, slaba svetlost, cirilicna imena.

Napomene uz postojece uzorke:

- 01 i 03 imaju vise preklopljenih priznanica na slici — ocekivana je prednja/centralna.
- 05 ima "Prateci paketi: 92037002798643" — ocekivan je glavni broj, ne prateci.
- 06 ima stampano "STEFAAN" (dupla A, greska na priznanici) — ocekivano bas tako,
  matcher tu toleranciju resava (poklapa se sa "Stefan Nikolic" preko telefona/imena).

```json
{
  "1.jpeg": {
    "imePrimaoca": "Milan Mimić",
    "telefonPrimaoca": "063 272 666",
    "brojPosiljke": "92044002798488"
  },
  "2.jpeg": {
    "imePrimaoca": "Nikola Milpošević",
    "telefonPrimaoca": "060 50 288 33",
    "brojPosiljke": "92076002798552"
  },
  "3.jpeg": {
    "imePrimaoca": "Momčilo Živić",
    "telefonPrimaoca": "069 507 7720",
    "brojPosiljke": "92077002798556"
  },
  "4.jpeg": {
    "imePrimaoca": "Nebojša Zebić",
    "telefonPrimaoca": "062 345 912",
    "brojPosiljke": "92056002804796"
  },
  "5.jpeg": {
    "imePrimaoca": "Miljan Paunović",
    "telefonPrimaoca": "061 611 8920",
    "brojPosiljke": "92070002798641"
  },
  "6.jpeg": {
    "imePrimaoca": "Stefaan Nikolic",
    "telefonPrimaoca": "065 903 31 10",
    "brojPosiljke": "92044002799487"
  },
  "7.jpeg": {
    "imePrimaoca": "Aleksandar Stanković",
    "telefonPrimaoca": "062 177 8836",
    "brojPosiljke": "92083002799193"
  }
}
```
