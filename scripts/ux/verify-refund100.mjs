// Proverava da filter "100% povrat" na /narudzbine (orders:list refund100Only) broji iste narudžbine
// kao bedž na tabli (dashboard:overview) i panel povrata (orders:refundPeriod). Samo čita.
//
//   UX_AUTH_STATE=<auth.json> node scripts/ux/verify-refund100.mjs
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const BASE = process.env.UX_BASE_URL ?? "http://localhost:3001";
const STATE = process.env.UX_AUTH_STATE;
if (!STATE) {
  console.error("Postavi UX_AUTH_STATE (scripts/ux/login.mjs).");
  process.exit(1);
}
const state = JSON.parse(fs.readFileSync(STATE, "utf8"));
const token = state.origins
  ?.find((entry) => entry.origin === new URL(BASE).origin)
  ?.localStorage?.find((item) => item.name === "evidencija.sessionToken")?.value;
const env = fs.readFileSync(path.resolve(".env.local"), "utf8");
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  env.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const client = new ConvexHttpClient(convexUrl);

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Belgrade" });
const [list, overview, refundPeriod, all] = await Promise.all([
  client.query(anyApi.orders.list, { token, refund100Only: true, page: 1, pageSize: 100 }),
  client.query(anyApi.dashboard.overview, { token, period: "sve", today }),
  client.query(anyApi.orders.refundPeriod, { token }),
  client.query(anyApi.orders.list, { token, page: 1, pageSize: 100 }),
]);

const rows = [
  ["orders:list refund100Only (total)", list.pagination.total],
  ["dashboard:overview actions.refund.pendingCount", overview.actions.refund.pendingCount],
  ["orders:refundPeriod pendingCount", refundPeriod.pendingCount],
];
rows.forEach(([label, value]) => console.log(`${String(value).padStart(5)}  ${label}`));
const amountList = Math.round(list.totals.povrat * 100);
const amountDash = Math.round(overview.actions.refund.pendingAmount * 100);
console.log(`${(amountList / 100).toFixed(2).padStart(9)}  iznos (lista totals.povrat)`);
console.log(`${(amountDash / 100).toFixed(2).padStart(9)}  iznos (tabla pendingAmount)`);
console.log(`ručno dodatih: ${refundPeriod.manualCount}, period: ${refundPeriod.period ? `${refundPeriod.period.startDate}–${refundPeriod.period.endDate}` : "nema"}, ukupno narudžbina: ${all.pagination.total}`);

const counts = rows.map(([, value]) => value);
const ok = counts.every((value) => value === counts[0]) && amountList === amountDash;
console.log(ok ? "OK: isti skup" : "FAIL: razlika");
process.exit(ok ? 0 : 1);
