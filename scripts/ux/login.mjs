// Otvara vidljiv Chrome na /login, čeka da se korisnik SAM uloguje i čuva
// storageState (localStorage sa tokenom) za shoot.mjs. Šifru nikad ne kucamo.
//
//   UX_AUTH_STATE=<putanja van repoa>/auth.json node scripts/ux/login.mjs
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.UX_BASE_URL ?? "http://localhost:3001";
const STATE = process.env.UX_AUTH_STATE;
const PROFILE = process.env.UX_PROFILE_DIR ?? path.join(os.tmpdir(), "alati-ux-profile");

if (!STATE) {
  console.error("Postavi UX_AUTH_STATE (putanja van repoa).");
  process.exit(1);
}

const context = await chromium.launchPersistentContext(PROFILE, {
  channel: "chrome",
  headless: false,
  viewport: null,
});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto(`${BASE}/login`);
await page.bringToFront();
console.log("Uloguj se u otvorenom Chrome prozoru (čekam do 60 min)…");

await page.waitForFunction(() => Boolean(window.localStorage.getItem("evidencija.sessionToken")), null, {
  timeout: 60 * 60_000,
  polling: 1000,
});
await context.storageState({ path: STATE });
console.log(`Sačuvano: ${STATE}`);
await context.close();
