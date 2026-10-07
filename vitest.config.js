import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Three isolated suites:
//   unit  — components, hooks, auth logic with Firebase mocked (no emulator, no Java)
//   rules — firestore.rules against the Firestore emulator
//   e2e   — real browser against the app running on the Auth + Firestore emulators
// None of them touch the production Firebase project (project id "demo-codebilim").
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{js,jsx}"],
          setupFiles: ["tests/unit/setup.js"],
        },
      },
      {
        test: {
          name: "rules",
          environment: "node",
          include: ["tests/rules/**/*.test.js"],
          testTimeout: 20000,
          hookTimeout: 30000,
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "e2e",
          environment: "node",
          include: ["tests/e2e/**/*.test.js"],
          testTimeout: 60000,
          hookTimeout: 180000,
          fileParallelism: false,
        },
      },
    ],
  },
});
