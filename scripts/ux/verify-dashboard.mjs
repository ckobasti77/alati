// Poredi dashboard:overview sa postojecim query-jima na istom deploymentu (samo cita).
//
//   UX_AUTH_STATE=<auth.json> node scripts/ux/verify-dashboard.mjs [--today 2026-11-02]
//
// 1. overview("sve").totals i overview(x).allTime moraju biti === orders:summary, polje po polje.
// 2. Za svaki period: zbir serije = totals.profit (na cent), broj u seriji = broj narudzbina.
// 3. 100% povrat = orders:refundPeriod; pipeline/akcije se ispisuju radi poredjenja sa listom.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const BASE = process.env.UX_BASE_URL ?? "http://localhost:3001";
const STATE = process.env.UX_AUTH_STATE;
const { values: args } = parseArgs({ options: { today: { type: "string" } } });

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

const PERIODS = ["danas", "7d", "mesec", "prosli", "sve"];
const failures = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

const summary = await client.query(anyApi.orders.summary, { token });
const refund = await client.query(anyApi.orders.refundPeriod, { token });
console.log(`Deployment: ${convexUrl}`);
console.log("orders:summary", summary);

for (const period of PERIODS) {
  const overview = await client.query(anyApi.dashboard.overview, { token, period, today: args.today });
  const { totals, series, allTime } = overview;
  console.log(`\n── ${period} (${overview.period.startKey ?? "…"} → ${overview.period.endKey ?? "…"}, danas ${overview.todayKey})`);
  console.log(
    `   profit ${totals.profit}  prodajno ${totals.ukupnoProdajno}  narudzbina ${totals.brojNarudzbina}  prethodni ${overview.previous?.profit ?? "—"}`,
  );

  for (const key of Object.keys(summary)) {
    check(`${period}: allTime.${key} === summary`, allTime[key] === summary[key], `${allTime[key]} vs ${summary[key]}`);
    if (period === "sve") {
      check(`sve: totals.${key} === summary`, totals[key] === summary[key], `${totals[key]} vs ${summary[key]}`);
    }
  }
  const seriesProfit = series.reduce((sum, point) => sum + point.profit, 0);
  const seriesCount = series.reduce((sum, point) => sum + point.count, 0);
  check(`${period}: zbir serije = profit`, Math.round(seriesProfit * 100) === Math.round(totals.profit * 100), `${seriesProfit} vs ${totals.profit}`);
  if (period !== "danas") {
    check(`${period}: broj u seriji = narudzbine`, seriesCount === totals.brojNarudzbina, `${seriesCount} vs ${totals.brojNarudzbina}`);
  }

  if (period === "sve") {
    check("povrat: pendingCount = orders:refundPeriod", overview.actions.refund.pendingCount === refund.pendingCount, `${overview.actions.refund.pendingCount} vs ${refund.pendingCount}`);
    check("povrat: pendingAmount = orders:refundPeriod", overview.actions.refund.pendingAmount === refund.pendingAmount, `${overview.actions.refund.pendingAmount} vs ${refund.pendingAmount}`);
    console.log("   akcije", { ...overview.actions, refund: undefined });
    console.log("   pipeline", overview.pipeline.map((entry) => `${entry.stage}:${entry.count}/${entry.prodajno}`).join("  "));
    console.log("   poslednje", overview.latest.length);
  }
}

console.log(failures.length ? `\n${failures.length} FAIL` : "\nSve provere prolaze.");
process.exit(failures.length ? 1 : 0);
