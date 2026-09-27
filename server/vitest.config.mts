import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/test/setupEnv.ts"],
    include: ["src/**/*.test.ts"],
    // System tests spin up the real app against a real Postgres test DB and
    // exercise several requests per test — give them more room than a pure
    // unit test needs.
    testTimeout: 20000,
    hookTimeout: 20000,
    // System tests share one Postgres connection pool (via src/config/db.ts)
    // and clean up their own rows — running them one file at a time avoids
    // cross-file interference without needing per-test DB transactions.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/test/**",
        "**/*.test.ts",
        "src/server.ts",
      ],
    },
  },
});
