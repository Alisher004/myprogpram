import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `vite preview` (and so the E2E suite) serves the same security headers as production.
// vercel.json is the single source of truth.
const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
const securityHeaders = Object.fromEntries(
  vercel.headers.find((h) => h.source === "/(.*)").headers.map(({ key, value }) => [key, value])
);

export default defineConfig({
  plugins: [react()],
  preview: { headers: securityHeaders },
});
