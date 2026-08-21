// Alati — auto pracenje posiljki.
// Cita broj posiljke iz #hash (#alatiTrack=<broj>), upisuje ga u input za
// pracenje na AKS/Posta sajtu i klikce sajtovo dugme za pretragu.
// Ako hash ne postoji, skripta ne dira stranicu (rucne posete su netaknute).

(function () {
  "use strict";

  const HASH_KEY = "alatiTrack";

  const SITES = [
    {
      // AKS: https://www.aks.rs/pracenje-posiljke/
      test: () => location.hostname.endsWith("aks.rs"),
      input: "#temp_shipping_id",
      submit: "#submit_shipping_widget",
    },
    {
      // Posta: ASP.NET WebForms stranica
      test: () => location.hostname.endsWith("posta.rs"),
      input: "#cphMain_cphAlati_pracenjeposiljkeusercontrol_txtPosiljka",
      submit: "#cphMain_cphAlati_pracenjeposiljkeusercontrol_btnPosiljka",
    },
  ];

  function getNumberFromHash() {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return "";
    const params = new URLSearchParams(raw);
    const value = params.get(HASH_KEY);
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

  function run() {
    const number = getNumberFromHash();
    if (!number) return;

    const site = SITES.find((s) => s.test());
    if (!site) return;

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const input = document.querySelector(site.input);
      if (input) {
        clearInterval(timer);
        setInputValue(input, number);

        // Ukloni hash pre submit-a: sprecava ponavljanje pri postback/reload
        // (npr. Postin WebForms postback ponovo ucita stranicu sa rezultatom).
        try {
          history.replaceState(null, "", location.pathname + location.search);
        } catch (e) {
          /* no-op */
        }

        // Klik na sajtovo pravo dugme (ne lazni Enter) — bitno za Postin
        // postback i njen captcha token koje generise sam sajt.
        const button = document.querySelector(site.submit);
        if (button) {
          button.click();
        }
      } else if (tries > 40) {
        clearInterval(timer); // ~6s, input nije nadjen
      }
    }, 150);
  }

  run();
})();
