import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // All server tests share the same PostgreSQL database. Running test files
    // sequentially avoids cross-file race conditions on shared seed data.
    fileParallelism: false,
  },
});