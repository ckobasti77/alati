// GET /api/wa-intake/qr?account=porudzbine|papirici
//   - bez format: HTML stranica koja prikazuje QR kao SLIKU (skenira se telefonom)
//     i sama se osvezava dok se nalog ne poveze.
//   - ?format=json: { ready, qr } — stanje logina (QR string dok ceka skeniranje).
//
// qrcode-terminal ume da pukne na dugackom WhatsApp QR payloadu, pa se u konzoli
// vidi samo sirov string. Ova stranica renderuje QR kao pravu sliku u browseru
// (QR biblioteka sa cdnjs; sam QR string ostaje lokalan). Otvaranje stranice
// pokrece login (beginLogin), tako da ne moras prvo da kliknes "Izlistaj chatove".
//
// Bez auth-a: ne dira Convex/podatke, samo lokalno (npm run dev).

import { NextResponse } from "next/server";
import { getWhatsAppSource } from "@/lib/waIntake/providers/whatsapp";

export const runtime = "nodejs";

const ACCOUNTS = ["porudzbine", "papirici"] as const;
type Account = (typeof ACCOUNTS)[number];
const isAccount = (value: string): value is Account =>
  (ACCOUNTS as readonly string[]).includes(value);

const ACCOUNT_LABEL: Record<Account, string> = {
  porudzbine: 'Porudžbine — nalog „Jovan Milojević" (chat „Cale")',
  papirici: 'Papirići — nalog „Kod Majstora" (chat „Omer Aks")',
};

type LoginState = { ready: boolean; qr: string | null };
type LoginSource = { beginLogin: () => void; getLoginState: () => LoginState };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get("account") ?? "porudzbine";
  if (!isAccount(account)) {
    return NextResponse.json(
      { error: 'Nepoznat account (dozvoljeno: "porudzbine" ili "papirici").' },
      { status: 400 },
    );
  }

  const source = getWhatsAppSource(account) as unknown as LoginSource;
  source.beginLogin();

  if (url.searchParams.get("format") === "json") {
    // Kratko sacekaj da QR stigne (qr event pada par sekundi posle initialize).
    let state = source.getLoginState();
    for (let i = 0; i < 12 && !state.ready && !state.qr; i++) {
      await sleep(500);
      state = source.getLoginState();
    }
    return NextResponse.json(state, { headers: { "cache-control": "no-store" } });
  }

  return new NextResponse(pageHtml(account), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function pageHtml(account: Account): string {
  const label = ACCOUNT_LABEL[account];
  return `<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>WhatsApp QR — ${account}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;
         min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #0b0f14; color: #e6edf3; }
  .card { background: #11161d; border: 1px solid #232b36; border-radius: 16px; padding: 28px;
          width: min(92vw, 380px); text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .sub { font-size: 13px; color: #93a1b0; margin: 0 0 18px; }
  #qr { background: #fff; width: 280px; height: 280px; margin: 0 auto; border-radius: 12px;
        display: flex; align-items: center; justify-content: center; padding: 10px; box-sizing: border-box; }
  #qr img, #qr canvas { width: 100% !important; height: 100% !important; }
  .status { margin-top: 16px; font-size: 13px; color: #93a1b0; min-height: 20px; }
  .ok { color: #34d399; font-size: 20px; font-weight: 600; }
  .steps { margin: 16px 0 0; padding: 0; list-style: none; font-size: 12px; color: #7d8b99; text-align: left; }
  .steps li { margin: 4px 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>Poveži WhatsApp</h1>
    <p class="sub">${label}</p>
    <div id="qr"><span style="color:#333;font-size:13px">Učitavam QR…</span></div>
    <div class="status" id="status">Čekam QR sa servera…</div>
    <ul class="steps">
      <li>1. Na telefonu tog naloga: WhatsApp → Povezani uređaji → Poveži uređaj.</li>
      <li>2. Skeniraj QR iznad.</li>
      <li>3. Kad piše „Povezano", zatvori i klikni „Izlistaj chatove" / „Povuci".</li>
    </ul>
  </div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
  var account = ${JSON.stringify(account)};
  var box = document.getElementById("qr");
  var statusEl = document.getElementById("status");
  var lastText = null;
  function render(text) {
    box.innerHTML = "";
    try {
      new QRCode(box, { text: text, width: 260, height: 260, correctLevel: QRCode.CorrectLevel.L });
      statusEl.textContent = "Skeniraj QR (osvežava se automatski).";
    } catch (e) {
      statusEl.textContent = "Ne mogu da nacrtam QR: " + e;
    }
  }
  function showReady() {
    box.innerHTML = "<div class='ok'>✅</div>";
    statusEl.innerHTML = "<span class='ok'>Povezano</span>";
  }
  function tick() {
    fetch("/api/wa-intake/qr?account=" + account + "&format=json&t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s && s.ready) { showReady(); return; }
        if (s && s.qr) { if (s.qr !== lastText) { render(s.qr); lastText = s.qr; } }
        else { statusEl.textContent = "Podižem WhatsApp… (prvo pokretanje traje 10–30 s)"; }
        setTimeout(tick, 2000);
      })
      .catch(function () { statusEl.textContent = "Greška u komunikaciji sa serverom, pokušavam ponovo…"; setTimeout(tick, 2500); });
  }
  tick();
</script>
</body>
</html>`;
}
