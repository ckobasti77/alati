import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    // Additional local build artifacts:
    "storefront/.next/**",
    "storefront/out/**",
    "storefront/build/**",
  ]),
  {
    // ESLint 10 je uklonio context.getFilename, a eslint-plugin-react (unutar
    // eslint-config-next) ga jos zove pri react verziji "detect" — eksplicitna
    // verzija preskace detekciju i spasava ceo lint run od TypeError-a.
    settings: { react: { version: "19.2.4" } },
    rules: {
      // Legacy codebase uses these patterns heavily; keep signal as warnings.
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
