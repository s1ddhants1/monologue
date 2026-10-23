import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    ".tmp*/**",
    "android/**",
    "ios/**",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*"],
              message:
                "Do not import from inside feature internals. Import from the feature barrel instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "components/ui/**/*.{ts,tsx}",
      "lib/**/*.{ts,tsx}",
      "stores/**/*.{ts,tsx}",
      "hooks/**/*.{ts,tsx}",
      "types/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features", "@/features/**", "@/app", "@/app/**"],
              message: "Shared foundational modules cannot import from features or app layer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);

export default eslintConfig;
