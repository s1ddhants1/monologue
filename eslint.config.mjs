import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".cloudflare/**",
    ".vinext/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    ".tmp*/**",
    "android/**",
    "ios/**",
  ]),
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);

export default eslintConfig;
