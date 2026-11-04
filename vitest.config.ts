import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    // Integracioni testovi (Gemini + uzorci priznanica) idu preko `npm run test:receipts`.
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
  },
});
