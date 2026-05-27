import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "tests/e2e/**/*.test.ts",
    ],
    // Disable concurrent file execution for integration/e2e tests that use
    // shared filesystem resources. Fine for unit tests but safest to keep
    // single-threaded overall given the lock-file and tmpdir patterns.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
    // Each test file gets its own process to avoid cross-test process.once
    // handler accumulation from acquireLock.
    testTimeout: 30000,
  },
});
