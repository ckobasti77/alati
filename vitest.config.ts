import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["lib/**/*.test.ts"],
    // Integracioni testovi (Ollama + uzorci priznanica) idu preko `npm run test:receipts`.
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
  },
});
