import { defineConfig } from "vitest/config";

// Integracioni testovi ekstrakcije priznanica: zahtevaju lokalnu Ollamu
// (qwen2.5vl:7b) i slike u docs/uzorci-priznanica/. Pokretanje: npm run test:receipts
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.integration.test.ts"],
    testTimeout: 300_000, // vision inferenca je spora na consumer hardveru
    hookTimeout: 30_000,
  },
});
