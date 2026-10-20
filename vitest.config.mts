import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./testing/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      include: ["features/**", "components/**", "lib/**", "config/**", "hooks/**", "stores/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
