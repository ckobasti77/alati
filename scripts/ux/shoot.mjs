// Screenshotovi jedne rute u 390×844 (telefon) i 1440×900 (desktop), dark i light,
// plus merenje horizontalnog overflowa. Samo navigacija: ništa se ne snima u bazu.
//
//   UX_AUTH_STATE=<auth.json> node scripts/ux/shoot.mjs --route /narudzbine --out docs/ux-overhaul/screens/before
//   --route /narudzbine/:first-order   (prva narudžbina, ID preko read-only query-ja)
//   --route /proizvodi/:first-product
//   --anon                 bez sesije (npr. /login)
//   --name narudzbine-nova ime fajla (podrazumevano iz rute)
//   --viewports 390        --themes dark
//   --click "<selektor>"   --press "Control+k"   (otvaranje sheet-a/palete, bez mutacija)
//   --viewport-only        bez .full.png
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium, devices } from "playwright-core";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const BASE = process.env.UX_BASE_URL ?? "http://localhost:3001";
const STATE = process.env.UX_AUTH_STATE;

const { values: args } = parseArgs({
  options: {
    route: { type: "string" },
    out: { type: "string" },
    name: { type: "string" },
    anon: { type: "boolean", default: false },
    viewports: { type: "string", default: "390,1440" },
    themes: { type: "string", default: "dark,light" },
    click: { type: "string" },
    press: { type: "string" },
    "viewport-only": { type: "boolean", default: false },
    wait: { type: "string", default: "1200" },
  },
});

// Git Bash na Windows-u pretvara "/ruta" u "C:/Program Files/Git/ruta" (MSYS path conversion).
if (args.route) args.route = args.route.replace(/^[A-Za-z]:\/Program Files\/Git(?=\/|$)/, "") || "/";

if (!args.route || !args.out) {
  console.error("Obavezno: --route i --out");
  process.exit(1);
}
if (!args.anon && !STATE) {
  console.error("Postavi UX_AUTH_STATE (napravi ga sa scripts/ux/login.mjs) ili koristi --anon.");
  process.exit(1);
}

const VIEWPORTS = {
  390: {
    userAgent: devices["iPhone 13"].userAgent,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  1440: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

function readToken() {
  const state = JSON.parse(fs.readFileSync(STATE, "utf8"));
  const origin = state.origins?.find((entry) => entry.origin === new URL(BASE).origin);
  return origin?.localStorage?.find((item) => item.name === "evidencija.sessionToken")?.value ?? null;
}

function readConvexUrl() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) return process.env.NEXT_PUBLIC_CONVEX_URL;
  const env = fs.readFileSync(path.resolve(".env.local"), "utf8");
  return env.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
}

async function resolveRoute(route) {
  if (!route.includes(":first-")) return route;
  const client = new ConvexHttpClient(readConvexUrl());
  const token = readToken();
  if (route.includes(":first-order")) {
    const latest = await client.query(anyApi.orders.latest, { token });
    if (!latest?.[0]?._id) throw new Error("Nema narudžbina za :first-order");
    return route.replace(":first-order", latest[0]._id);
  }
  const products = await client.query(anyApi.products.listPaginated, { token, page: 1, pageSize: 1 });
  if (!products?.items?.[0]?._id) throw new Error("Nema proizvoda za :first-product");
  return route.replace(":first-product", products.items[0]._id);
}

function slugFor(route) {
  if (route === "/") return "tabla";
  return route
    .replace(/^\//, "")
    .replace(/:first-order|:first-product/, "detalj")
    .replace(/[/?=&]+/g, "-")
    .replace(/-+$/, "");
}

async function settle(page, waitMs) {
  await page.waitForLoadState("domcontentloaded");
  await page
    .waitForFunction(
      () => {
        const text = document.body?.innerText ?? "";
        if (text.includes("Provera naloga")) return false;
        return ![...document.querySelectorAll(".animate-spin")].some((el) => el.getBoundingClientRect().width > 0);
      },
      null,
      { timeout: 25_000, polling: 250 },
    )
    .catch(() => console.warn("  ! spinner je i dalje vidljiv posle 25 s"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(waitMs);
}

function measureOverflow() {
  const root = document.documentElement;
  const clientWidth = root.clientWidth;
  const clipped = (el) => {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX !== "visible" && overflowX !== "clip") return true;
    }
    return false;
  };
  const offenders = [];
  for (const el of document.querySelectorAll("body *")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.right <= clientWidth + 1 || clipped(el)) continue;
    if (el.parentElement && offenders.some((entry) => entry.el === el.parentElement)) continue;
    offenders.push({ el, right: Math.round(rect.right) });
  }
  return {
    scrollWidth: root.scrollWidth,
    clientWidth,
    overflow: root.scrollWidth > clientWidth,
    offenders: offenders.slice(0, 8).map(({ el, right }) => ({
      right,
      el: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.className).slice(0, 90)}`,
      text: (el.textContent ?? "").trim().slice(0, 40),
    })),
  };
}

const route = await resolveRoute(args.route);
const name = args.name ?? slugFor(args.route);
const outDir = path.resolve(args.out);
fs.mkdirSync(path.join(outDir, "overflow"), { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { route, name, shots: [], overflow: {} };

try {
  for (const vw of args.viewports.split(",")) {
    for (const theme of args.themes.split(",")) {
      const context = await browser.newContext({
        ...VIEWPORTS[vw],
        colorScheme: theme,
        storageState: args.anon ? undefined : STATE,
      });
      await context.addInitScript((value) => window.localStorage.setItem("alati-theme", value), theme);
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (msg) => msg.type() === "error" && consoleErrors.push(msg.text().slice(0, 200)));

      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await settle(page, Number(args.wait));
      // Next.js dev indikator ("N" dole levo) nije deo aplikacije.
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      if (args.click) {
        await page.locator(args.click).first().click();
        await page.waitForTimeout(700);
      }
      if (args.press) {
        await page.keyboard.press(args.press);
        await page.waitForTimeout(700);
      }

      const file = path.join(outDir, `${name}__${vw}-${theme}.png`);
      await page.screenshot({ path: file });
      report.shots.push(path.relative(process.cwd(), file));
      if (!args["viewport-only"]) {
        const full = file.replace(/\.png$/, ".full.png");
        await page.screenshot({ path: full, fullPage: true });
        report.shots.push(path.relative(process.cwd(), full));
      }
      const measured = await page.evaluate(measureOverflow);
      report.overflow[`${vw}-${theme}`] = { ...measured, pageHeight: await page.evaluate(() => document.documentElement.scrollHeight), consoleErrors };
      await context.close();
    }
  }
} finally {
  await browser.close();
}

// Spoji sa ranijim merenjem iste rute (npr. ponovo snimljen samo 390).
const reportFile = path.join(outDir, "overflow", `${name}.json`);
const previous = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, "utf8")) : null;
if (previous?.overflow) report.overflow = { ...previous.overflow, ...report.overflow };
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ route: report.route, name, shots: report.shots.length, overflow: Object.fromEntries(Object.entries(report.overflow).map(([key, value]) => [key, `${value.scrollWidth}/${value.clientWidth}`])) }));
