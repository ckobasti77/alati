// Alati — auto pracenje posiljki.
// Cita broj posiljke iz #hash (#alatiTrack=<broj>), upisuje ga u input za
// pracenje na AKS/Posta sajtu i klikce sajtovo dugme za pretragu.
// Ako hash ne postoji, skripta ne dira stranicu (rucne posete su netaknute).

(function () {
  "use strict";

  const TAG = "[alati-track]";
  const HASH_KEY = "alatiTrack";

  console.log(`${TAG} content script ucitan na:`, location.href);

  const SITES = [
    {
      name: "AKS",
      test: () => location.hostname.endsWith("aks.rs"),
      input: "#temp_shipping_id",
      submit: "#submit_shipping_widget",
    },
    {
      name: "Posta",
      test: () => location.hostname.endsWith("posta.rs"),
      input: "#cphMain_cphAlati_pracenjeposiljkeusercontrol_txtPosiljka",
      submit: "#cphMain_cphAlati_pracenjeposiljkeusercontrol_btnPosiljka",
    },
  ];

  function getNumberFromHash() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return "";
    const value = new URLSearchParams(raw).get(HASH_KEY);
    return value ? value.trim() : "";
  }

  // Postavlja vrednost preko native setter-a da bi se okinuli i eventualni
  // JS/React listeneri na inputu.
  function setInputValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  let handled = false;

  function run() {
    if (handled) return;

    const number = getNumberFromHash();
    if (!number) {
      console.log(`${TAG} nema #${HASH_KEY} u URL-u — preskacem.`);
      return;
    }

    const site = SITES.find((s) => s.test());
    if (!site) {
      console.log(`${TAG} sajt nije prepoznat (${location.hostname}) — preskacem.`);
      return;
    }

    handled = true;
    console.log(`${TAG} ${site.name}: trazim input za broj "${number}"...`);

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const input = document.querySelector(site.input);
      if (input) {
        clearInterval(timer);
        setInputValue(input, number);
        console.log(`${TAG} ${site.name}: upisan broj u input.`);

        // Ukloni hash pre submit-a: sprecava ponavljanje pri postback/reload.
        try {
          history.replaceState(null, "", location.pathname + location.search);
        } catch (e) {
          /* no-op */
        }

        // Klik na sajtovo pravo dugme (ne lazni Enter) — bitno za Postin
        // postback i njen captcha token koje generise sam sajt.
        const button = document.querySelector(site.submit);
        if (button) {
          console.log(`${TAG} ${site.name}: klikcem dugme za pretragu.`);
          button.click();
        } else {
          console.warn(`${TAG} ${site.name}: dugme (${site.submit}) nije nadjeno — broj je upisan, klikni rucno.`);
        }
      } else if (tries > 60) {
        clearInterval(timer);
        console.warn(`${TAG} ${site.name}: input (${site.input}) nije nadjen ni posle ~9s.`);
      }
    }, 150);
  }

  // Pokreni odmah, pa i na kasnije promene hash-a (npr. ako app otvori isti tab).
  run();
  window.addEventListener("hashchange", () => {
    handled = false;
    run();
  });
})();
