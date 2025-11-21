import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Prevent console statements in production code
      // Use logger utility instead (utils/logger.js)
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"], // Allow in logger utility only
        },
      ],
    },
  },
]);

export default eslintConfig;
