import { defineConfig } from "vitest/config";

// Integracioni testovi ekstrakcije priznanica: zahtevaju GEMINI_API_KEY
// i slike u docs/uzorci-priznanica/. Pokretanje: npm run test:receipts

// GEMINI_API_KEY zivi u .env.local (Next ga ucitava, vitest ne) — ucitaj ga
// i ovde da `npm run test:receipts` radi bez rucnog set-ovanja env-a.
try {
  process.loadEnvFile?.(".env.local");
} catch {
  // nema .env.local — testovi ce se preskociti bez kljuca
}
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.integration.test.ts"],
    testTimeout: 300_000, // vision inferenca je spora na consumer hardveru
    hookTimeout: 30_000,
  },
});
