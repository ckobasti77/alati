// order-shots.mjs — mjeri tačnost "Popuni narudžbinu iz slike" na pravih 8 slika.
//
//   dev_run ux order-shots                 (svih 8 slika)
//   dev_run ux order-shots --only 03-...,04-...   (samo neke — štedi dnevni Gemini limit)
//   dev_run ux order-shots --check        (samo konekcija + token, BEZ Gemini poziva)
//   dev_run ux order-shots --catalog     (ispiše DEV katalog proizvoda, bez Gemini poziva)
//
// Za svaku sliku: POST ${UX_BASE_URL}/api/order-screenshot (token iz UX_AUTH_STATE,
// localStorage "evidencija.sessionToken"), sačuva draft u tmp/order-shots/results/<ime>.json,
// uporedi sa tmp/order-shots/expected.json po 7 polja i upiše tabelu + ukupan % u
// tmp/order-shots/results/_score.md. Headline % je na 6 DOSTIŽNIH polja (ime, telefon,
// adresa, pickup, prodajna, nabavna); proizvod je N/A jer nijedan od 8 nije u DEV katalogu.
// Tokene po slici čita iz server loga (ruta ih loguje preko onUsage, ne vraća u odgovor).
//
// PRAVILA: pravi podaci iz tmp/order-shots/ se ne kopiraju u testove/kod.
//           Ukupno najviše 40 Gemini poziva u sesiji; na 429 stajemo i javljamo.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const ROOT = process.cwd();
const BASE = process.env.UX_BASE_URL ?? "http://localhost:3001";
const STATE = process.env.UX_AUTH_STATE;
const LOG_FILE = process.env.UX_LOG_FILE ?? "C:\\AI\\jarvis-dev\\logs\\alati.log";
const SHOTS_DIR = path.resolve(ROOT, "tmp/order-shots");
const RESULTS_DIR = path.join(SHOTS_DIR, "results");
const EXPECTED = JSON.parse(fs.readFileSync(path.join(SHOTS_DIR, "expected.json"), "utf8"));
const MAX_CALLS = Number(process.env.UX_MAX_CALLS ?? 40);

// Polja koja se mogu mjeriti (proizvod je N/A — nije u DEV katalogu, vidi --catalog).
const ACHIEVABLE = ["customerName", "phone", "address", "pickup", "prodajnaCena", "nabavnaCena"];
const FIELDS = [...ACHIEVABLE, "product"];

const { values: args } = parseArgs({
  options: {
    only: { type: "string", multiple: true, default: [] },
    check: { type: "boolean", default: false },
    catalog: { type: "boolean", default: false },
    rescore: { type: "boolean", default: false },
    model: { type: "string" }, // opcionalno "gemini-3.5-flash"
    wait: { type: "string", default: "1500" }, // pauza između poziva (ms)
  },
});

// --- pomoćne funkcije ---
function readToken() {
  if (!STATE) return null;
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return null;
  }
  const targetOrigin = new URL(BASE).origin;
  const origins = state.origins ?? [];
  const hit = origins
    .find((o) => o.origin === targetOrigin)
    ?.localStorage?.find((i) => i.name === "evidencija.sessionToken")?.value;
  if (hit) return hit;
  // Fallback: bilo koji origin sa tim ključem (npr. ako je login sačuvan za drugi port).
  for (const o of origins) {
    const v = o.localStorage?.find((i) => i.name === "evidencija.sessionToken")?.value;
    if (v) return v;
  }
  return null;
}

// fold: skida dijakritike + normalizuje razmake (ista ideja kao lib/textMatch, inline jer .mjs).
function fold(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "dj")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
// tokens: fold + sortiranje reči (redosled ne važi za ime/adresu).
function tokens(s) {
  const f = fold(s);
  return f ? f.split(" ").sort().join(" ") : "";
}
const digits = (s) => String(s ?? "").replace(/\D/g, "");

function readConvexUrl() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return process.env.NEXT_PUBLIC_CONVEX_URL;
  const env = fs.readFileSync(path.resolve(".env.local"), "utf8");
  return env.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim().replace(/^[\"']|[\"']$/g, "");
}

// --- poredjenje jednog polja ---
function cmpName(exp, got) {
  const e = (exp ?? "").trim();
  const g = (got ?? "").trim();
  if (!e) return { ok: !g, expected: "", got: g, note: g ? "model izmislio ime" : "" };
  return { ok: tokens(e) === tokens(g), expected: e, got: g, note: "" };
}
function cmpPhone(exp, got) {
  const e = digits(exp);
  const g = digits(got);
  const ok = e === g || (e.length >= 8 && g.length >= 8 && (e.endsWith(g) || g.endsWith(e)));
  return { ok, expected: exp, got, note: ok ? "" : "broj se razlikuje" };
}
function cmpAddress(exp, got) {
  const e = (exp ?? "").trim();
  const g = (got ?? "").trim();
  if (!e) return { ok: !g, expected: "", got: g, note: g ? "adresa umesto pickup-a" : "" };
  const ok = tokens(e) === tokens(g) || (tokens(g).includes(tokens(e)) && tokens(e).length > 6);
  return { ok, expected: e, got: g, note: "" };
}
function cmpPickup(exp, got) {
  return { ok: Boolean(exp) === Boolean(got), expected: Boolean(exp), got: Boolean(got), note: "" };
}
function cmpPrice(exp, got) {
  if (exp == null) return { ok: got == null, expected: null, got: got ?? null, note: got != null ? "cena umesto ništa" : "" };
  return { ok: Number(got) === Number(exp), expected: exp, got: got ?? null, note: got == null ? "cena nije čitana" : "broj se razlikuje" };
}
function cmpProduct(exp, draft) {
  const hint = `${exp.productHint ?? ""} ${exp.variantHint ?? ""}`;
  const p = draft?.product;
  if (!p) return { ok: false, expected: hint.trim(), got: null, overlap: 0, note: "N/A — proizvod nije u DEV katalogu" };
  const nameText = `${p.name ?? ""} ${p.variantLabel ?? ""}`;
  const ht = new Set(tokens(hint).split(" ").filter((t) => t.length > 2));
  const nt = new Set(tokens(nameText).split(" ").filter((t) => t.length > 2));
  let inter = 0;
  for (const t of ht) if (nt.has(t)) inter += 1;
  const overlap = ht.size ? inter / Math.min(ht.size, Math.max(nt.size, 1)) : 0;
  const ok = overlap >= 0.5;
  return { ok, expected: hint.trim(), got: `${p.name}${p.variantLabel ? ` (${p.variantLabel})` : ""}`, overlap: Math.round(overlap * 100) / 100, note: ok ? "poklapa se sa hintom" : "N/A — lažni match na dummy katalog (pravi proizvod nije u DEV)" };
}

function compareImage(file, draft) {
  const exp = EXPECTED[file];
  const cmp = {
    customerName: cmpName(exp.customerName, draft.customerName),
    phone: cmpPhone(exp.phone, draft.phone),
    address: cmpAddress(exp.address, draft.address),
    pickup: cmpPickup(exp.pickup, draft.pickup),
    prodajnaCena: cmpPrice(exp.prodajnaCena, draft.prodajnaCena),
    nabavnaCena: cmpPrice(exp.nabavnaCena, draft.nabavnaCena),
    product: cmpProduct(exp, draft),
  };
  const correctAch = ACHIEVABLE.filter((f) => cmp[f].ok).length;
  return { cmp, correctAch, totalAch: ACHIEVABLE.length, correct: Object.values(cmp).filter((c) => c.ok).length, total: FIELDS.length };
}

// --- tokeni po slici iz server loga ---
function readTokensFromLog(startOffset) {
  try {
    const stat = fs.statSync(LOG_FILE);
    if (stat.size <= startOffset) return {};
    const fd = fs.openSync(LOG_FILE, "r");
    const len = stat.size - startOffset;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, startOffset);
    fs.closeSync(fd);
    const lines = buf.toString("utf8").split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      const m = line.match(/\[order-shots\] tokens image=(\S+) prompt=(\d+|\?) out=(\d+|\?) total=(\d+|\?)/);
      if (m) map[m[1]] = { prompt: m[2], out: m[3], total: m[4] };
    }
    return map;
  } catch {
    return {};
  }
}

// --- _score.md ---
function writeScore(results, tokensByImage) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const mark = (c) => (c.ok ? "✓" : "✗");
  const ok = results.filter((r) => r.cmp);
  const totalAch = ok.length * ACHIEVABLE.length;
  const correctAch = ok.reduce((s, r) => s + ACHIEVABLE.filter((f) => r.cmp[f].ok).length, 0);
  const pct = totalAch ? Math.round((correctAch / totalAch) * 100) : 0;

  const lines = [];
  lines.push("# Rezultat merenja — Popuni narudžbinu iz slike");
  lines.push("");
  lines.push(`- Osnova: ${ok.length} slika × ${ACHIEVABLE.length} dostižnih polja = ${totalAch} provera`);
  lines.push(`- **Dostižna polja (ime/tel/adr/pickup/prodajna/nabavna): ${correctAch}/${totalAch} = ${pct}%**  ← cilj ≥ 90%`);
  lines.push(`- Proizvod je N/A za sve: nijedan od 8 nije u DEV katalogu (dummy podaci) — vidi ispod.`);
  lines.push("");
  lines.push("| Slika | ime | tel | adr | pickup | prodajna | nabavna | proizvod |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    const c = r.cmp ?? {};
    const name = (r.file ?? "").replace(/\.jpg$/, "");
    const cell = (f) => (c[f] ? mark(c[f]) : "—");
    lines.push(`| ${name} | ${cell("customerName")} | ${cell("phone")} | ${cell("address")} | ${cell("pickup")} | ${cell("prodajnaCena")} | ${cell("nabavnaCena")} | n/a |`);
  }
  lines.push("");
  lines.push("## ✗ dostižna polja (za ispravku)");
  lines.push("");
  let anyBad = false;
  for (const r of results) {
    const c = r.cmp;
    if (!c) {
      lines.push(`- **${r.file}**: ${r.status} — ${r.error ?? ""}`);
      anyBad = true;
      continue;
    }
    const bad = ACHIEVABLE.filter((f) => !c[f].ok);
    if (bad.length === 0) continue;
    anyBad = true;
    lines.push(`- **${r.file}**:`);
    for (const field of bad) {
      const v = c[field];
      lines.push(`  - ${field}: očekivano=${JSON.stringify(v.expected)} dobijeno=${JSON.stringify(v.got)}${v.note ? ` — ${v.note}` : ""}`);
    }
  }
  if (!anyBad) lines.push("_Sva dostižna polja su tačna._");
  lines.push("");
  lines.push("## Proizvod (N/A — nije u DEV katalogu)");
  lines.push("");
  for (const r of results) {
    const c = r.cmp;
    if (!c) continue;
    const p = c.product;
    const matched = p.got ? ` → lažni match: ${p.got}` : " → nema matcha (ispravno)";
    lines.push(`- ${r.file}: hint="${p.expected}"${matched}`);
  }
  lines.push("");
  lines.push("## Tokeni po slici (iz server loga)");
  lines.push("");
  lines.push("| Slika | prompt | out | total |");
  lines.push("|---|---|---|---|");
  let sumTotal = 0;
  let tokCount = 0;
  for (const r of results) {
    const t = tokensByImage[r.file];
    if (t && t.total !== "?") {
      sumTotal += Number(t.total);
      tokCount += 1;
    }
    lines.push(`| ${r.file} | ${t?.prompt ?? "n/a"} | ${t?.out ?? "n/a"} | ${t?.total ?? "n/a"} |`);
  }
  const avg = tokCount ? Math.round(sumTotal / tokCount) : null;
  lines.push("");
  lines.push(`Prosek tokena po slici (total): **${avg ?? "n/a"}** (${tokCount}/${ok.length} slika sa podacima)`);
  lines.push("");
  fs.writeFileSync(path.join(RESULTS_DIR, "_score.md"), lines.join("\n"), "utf8");
}

// --- glavni tok ---
const onlyList = args.only.flatMap((v) => v.split(",").map((s) => s.trim()).filter(Boolean));
const images = fs.readdirSync(SHOTS_DIR).filter((f) => f.endsWith(".jpg")).sort();
const toRun = onlyList.length ? images.filter((f) => onlyList.includes(f)) : images;

if (args.check) {
  const token = readToken();
  console.log(`BASE=${BASE}`);
  console.log(`STATE=${STATE ?? "(nije postavljeno)"}`);
  console.log(`TOKEN=${token ? "prisutan" : "NIJE NAĐEN"}`);
  try {
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(1)], { type: "image/jpeg" }), "probe.jpg");
    const res = await fetch(`${BASE}/api/order-screenshot`, { method: "POST", body: fd });
    console.log(`PROBE status=${res.status} (očekivano 401 = ruta živa)`);
  } catch (e) {
    console.log(`PROBE GREŠKA: ${e.message}`);
  }
  console.log("CHECK OK (bez Gemini poziva)");
  process.exit(0);
}

if (args.catalog) {
  const token = readToken();
  if (!token) {
    console.error("Nema tokena za katalog (UX_AUTH_STATE).");
    process.exit(1);
  }
  const client = new ConvexHttpClient(readConvexUrl());
  const products = await client.query(anyApi.products.list, { token });
  console.log(`Katalog: ${products.length} proizvoda`);
  for (const p of products) {
    const variants = (p.variants ?? []).map((v) => v.label).join(", ");
    console.log(`- ${p.name}${p.kpName ? ` [kp: ${p.kpName}]` : ""}${variants ? `  tipovi: [${variants}]` : ""}`);
  }
  console.log("CATALOG OK (bez Gemini poziva)");
  process.exit(0);
}

// --rescore: prečita već sačuvane rezultate + ceo log (tokeni) i regeneriše _score.md,
// BEZ ijednog Gemini poziva — korisno posle više --only pokretanja.
if (args.rescore) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const results = [];
  for (const file of images) {
    const prevFile = path.join(RESULTS_DIR, `${file.replace(/\.jpg$/, "")}.json`);
    if (!fs.existsSync(prevFile)) continue;
    const draft = JSON.parse(fs.readFileSync(prevFile, "utf8"));
    const { cmp, correctAch, totalAch, correct, total } = compareImage(file, draft);
    results.push({ file, status: "cached", draft, cmp, correctAch, totalAch, correct, total });
  }
  results.sort((a, b) => a.file.localeCompare(b.file));
  writeScore(results, readTokensFromLog(0));
  const ok = results.filter((r) => r.cmp);
  const totalAch = ok.length * ACHIEVABLE.length;
  const correctAch = ok.reduce((s, r) => s + ACHIEVABLE.filter((f) => r.cmp[f].ok).length, 0);
  console.log(`RESCORE: ${ok.length} slika, ${correctAch}/${totalAch} = ${totalAch ? Math.round((correctAch / totalAch) * 100) : 0}% (bez Gemini poziva)`);
  console.log(`_score.md: ${path.join(RESULTS_DIR, "_score.md")}`);
  process.exit(0);
}

const token = readToken();
if (!token) {
  console.error("UX_AUTH_STATE ne sadrži token (localStorage 'evidencija.sessionToken').");
  process.exit(1);
}

fs.mkdirSync(RESULTS_DIR, { recursive: true });

let calls = 0;
let stoppedAt429 = false;
const results = [];

for (const file of toRun) {
  const body = fs.readFileSync(path.join(SHOTS_DIR, file));
  const fd = new FormData();
  fd.append("file", new Blob([body], { type: "image/jpeg" }), file);
  if (args.model) fd.append("model", args.model);
  fd.append("token", token);

  let draft = null;
  let status = "ok";
  let error = "";
  try {
    const res = await fetch(`${BASE}/api/order-screenshot`, { method: "POST", body: fd });
    status = `http-${res.status}`;
    calls += 1;
    const json = (await res.json().catch(() => ({}))) ?? {};
    if (res.status === 429) {
      error = json.error ?? "dnevni limit potrošen";
      stoppedAt429 = true;
      results.push({ file, status: "http-429", error, draft: null });
      console.log(`[429] ${file}: ${error} — STOP, dnevni limit.`);
      break;
    }
    if (!res.ok) {
      error = json.error ?? `HTTP ${res.status}`;
      results.push({ file, status, error, draft: null });
      console.log(`[ERR] ${file}: ${status} — ${error}`);
      continue;
    }
    draft = json;
  } catch (e) {
    status = "error";
    error = e.message;
    calls += 1;
    results.push({ file, status, error, draft: null });
    console.log(`[ERR] ${file}: ${error}`);
    continue;
  }

  fs.writeFileSync(path.join(RESULTS_DIR, `${file.replace(/\.jpg$/, "")}.json`), JSON.stringify(draft, null, 2), "utf8");
  const { cmp, correctAch, totalAch, correct, total } = compareImage(file, draft);
  results.push({ file, status, error, draft, cmp, correctAch, totalAch, correct, total });
  const mk = (f) => (cmp[f]?.ok ? "✓" : "✗");
  console.log(`[${correctAch}/${totalAch}] ${file}  ime${mk("customerName")} tel${mk("phone")} adr${mk("address")} pick${mk("pickup")} prodC${mk("prodajnaCena")} nabC${mk("nabavnaCena")} | prod=${cmp.product.got ?? "nema"}`);

  if (calls >= MAX_CALLS) {
    console.log(`[LIMIT] Dosegnuto ${MAX_CALLS} poziva u sesiji — stop.`);
    break;
  }
  if (!stoppedAt429) await new Promise((r) => setTimeout(r, Number(args.wait)));
}

await new Promise((r) => setTimeout(r, 700));
const tokensByImage = readTokensFromLog(0);

// Ako --only: dopuni ostale slike iz prethodnih rezultata radi kompletnog _score.md.
if (onlyList.length) {
  const existing = new Set(results.map((r) => r.file));
  for (const file of images) {
    if (existing.has(file)) continue;
    const prevFile = path.join(RESULTS_DIR, `${file.replace(/\.jpg$/, "")}.json`);
    if (fs.existsSync(prevFile)) {
      const draft = JSON.parse(fs.readFileSync(prevFile, "utf8"));
      const { cmp, correctAch, totalAch, correct, total } = compareImage(file, draft);
      results.push({ file, status: "cached", draft, cmp, correctAch, totalAch, correct, total });
    }
  }
}

results.sort((a, b) => a.file.localeCompare(b.file));
writeScore(results, tokensByImage);

const ok = results.filter((r) => r.cmp);
const totalAch = ok.length * ACHIEVABLE.length;
const correctAch = ok.reduce((s, r) => s + ACHIEVABLE.filter((f) => r.cmp[f].ok).length, 0);
console.log("");
console.log("=== REZIME ===");
console.log(`poziva: ${calls} (limit ${MAX_CALLS})  slika: ${ok.length}`);
console.log(`DOSTIŽNA POLJA: ${correctAch}/${totalAch} = ${totalAch ? Math.round((correctAch / totalAch) * 100) : 0}%  (cilj ≥ 90%)`);
if (stoppedAt429) console.log("STOP: 429 dnevni limit — stani i javi korisniku.");
console.log(`_score.md: ${path.join(RESULTS_DIR, "_score.md")}`);
process.exit(stoppedAt429 ? 2 : 0);
