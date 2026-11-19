// orderScreenshot/prompt.ts
// Prompt za Gemini vision (na engleskom — vision modeli ga najpouzdanije prate).
// JSON ključevi su identični tipovima iz ./types.ts (ScreenshotRaw).
// Poslovna pravila 1-6 su prevedena ovde za model; deterministična
// normalizacija (okretanje imena, cene, adresa, pickup) ide u ./normalize.ts.

export const ORDER_SCREENSHOT_PROMPT = `You are reading a screenshot related to a customer order for a Serbian tool and equipment shop.
The screenshot can be one of:
- "kp": a KupujemProdajem (KP) chat message, or a KP ad listing screenshot,
- "whatsapp": a WhatsApp message (possibly a forwarded call screen),
- "viber": a Viber message (possibly with an ad screenshot inside the message),
- "call_log": a call history / dialer screen with a handwritten note,
- "other": anything else.

Your job: extract the ORDER details and return STRICT JSON. Do not invent anything.
For every field you cannot read confidently, use "" (empty string), false, or [].
Put the names of the fields you are unsure about into "uncertain" (use the exact key names).

Rules:
1. Pickup: if the note or message contains the word "licno" / "licno preuzimanje",
   set "pickupExplicit" to true. If there is only a phone number and no address,
   keep "pickupExplicit" false (the server decides pickup from that).
2. Customer name: prefer the real name written in the MESSAGE or the handwritten
   note over the chat header, account name or nickname. Split it into
   customerFirstName and customerLastName (each "" if unknown).
   customerNameRaw is the name exactly as written.
3. Address: street with house number in "street", the 5-digit postal code in
   "postalCode" ("" if not present — NEVER invent a postal code), the city in
   "city". Text is often glued together, e.g. "22323Novi slankamen" means postal
   code 22323 and city "Novi Slankamen". addressRaw is the address exactly as written.
4. Phone: copy every phone number exactly as written into "phones" (there may be several).
5. Product: put the product from the note, message or ad title into "productText".
   If it has a size/type/model (e.g. "4 x 2.5", "MS 180", "2 x 6L"), put that into
   "variantText". If an ad title is visible (KP/Viber ad screenshot), put it into
   "adTitle". Fix obvious typos of brand names (e.g. "Stil" means "Stihl").
6. Prices: a single number next to the product (e.g. "260e", "215 €") is the SALE
   price -> role "prodajna". A range "80-130€" means purchase price 80 and sale
   price 130 -> output BOTH: one entry role "nabavna" (80) and one role "prodajna"
   (130). The price printed on a KP/Viber ad is the sale price -> role "prodajna".
   Keep the exact text in "raw" and the readable number in "value".
   If a number is present but its role is unclear, use role "unknown".

Examples (fictional):
A) Call log screen, handwritten note "testere MS 250 - 180e, licno", caller 063 555 123.
   -> {"sourceType":"call_log","customerFirstName":"","customerLastName":"","customerNameRaw":"",
       "phones":["063 555 123"],"street":"","postalCode":"","city":"","addressRaw":"",
       "pickupExplicit":true,"productText":"motorna testera","variantText":"MS 250",
       "adTitle":"","prices":[{"value":"180","role":"prodajna","raw":"180e"}],"uncertain":["productText"]}
B) KupujemProdajem chat: ad title "Mašina za odgušenje kanalizacije" price 320 €,
   message "Petrović Marko, 22323Novi Slankamen, 064 777 000, Cara Lazara 4".
   -> {"sourceType":"kp","customerFirstName":"Marko","customerLastName":"Petrović","customerNameRaw":"Petrović Marko",
       "phones":["064 777 000"],"street":"Cara Lazara 4","postalCode":"22323","city":"Novi Slankamen",
       "addressRaw":"Petrović Marko, 22323Novi Slankamen, 064 777 000, Cara Lazara 4",
       "pickupExplicit":false,"productText":"mašina za odgušenje kanalizacije","variantText":"",
       "adTitle":"Mašina za odgušenje kanalizacije",
       "prices":[{"value":"320","role":"prodajna","raw":"320 €"}],"uncertain":[]}
C) Viber chat, contact "Pumpe", message "kabal za potopne pumpe 4 x 2.5 - 225e".
   -> {"sourceType":"viber","customerFirstName":"","customerLastName":"","customerNameRaw":"",
       "phones":[],"street":"","postalCode":"","city":"","addressRaw":"",
       "pickupExplicit":false,"productText":"kabal za potopne pumpe","variantText":"4 x 2.5",
       "adTitle":"","prices":[{"value":"225","role":"prodajna","raw":"225e"}],"uncertain":[]}

Return ONLY the JSON object, with exactly these keys:
{"sourceType":"kp","customerFirstName":"","customerLastName":"","customerNameRaw":"","phones":[],"street":"","postalCode":"","city":"","addressRaw":"","pickupExplicit":false,"productText":"","variantText":"","adTitle":"","prices":[],"uncertain":[]}
`;
