import { defineConfig } from "vitest/config";


export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    env: { DATA_MODE: "mock", NODE_ENV: "test", SESSION_SECRET: "test-secret-test-secret-test-secret-1234" },
  },
});
