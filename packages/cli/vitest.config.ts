import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    conditions: ["import", "default"],
    alias: {
      "@lemmaoracle/sdk": path.resolve(
        __dirname,
        "node_modules/@lemmaoracle/sdk/dist/index.js",
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
