// App Check is wired in src/lib/firebase.js and must stay off unless a site key is set
// (and never run against the emulators, which don't verify App Check tokens).
import { afterEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ init: [] }));
vi.doUnmock("/src/lib/firebase.js");
vi.mock("firebase/app", () => ({ initializeApp: () => ({ name: "app" }) }));
vi.mock("firebase/auth", () => ({ getAuth: () => ({}), connectAuthEmulator: () => {} }));
vi.mock("firebase/firestore", () => ({ getFirestore: () => ({}), connectFirestoreEmulator: () => {} }));
vi.mock("firebase/app-check", () => ({
  ReCaptchaEnterpriseProvider: class {
    constructor(key) {
      this.key = key;
    }
  },
  initializeAppCheck: (app, options) => calls.init.push(options),
}));

async function load(env) {
  vi.resetModules();
  calls.init = [];
  vi.stubEnv("VITE_FIREBASE_API_KEY", "k");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "p");
  vi.stubEnv("VITE_USE_EMULATORS", "false");
  vi.stubEnv("VITE_RECAPTCHA_ENTERPRISE_KEY", "");
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  await import("../../src/lib/firebase.js");
  return calls.init;
}

afterEach(() => vi.unstubAllEnvs());

describe("App Check", () => {
  it("is off without a site key", async () => {
    expect(await load({})).toHaveLength(0);
  });
  it("starts with reCAPTCHA Enterprise and token refresh when a key is set", async () => {
    const init = await load({ VITE_RECAPTCHA_ENTERPRISE_KEY: "site-key" });
    expect(init).toHaveLength(1);
    expect(init[0].provider.key).toBe("site-key");
    expect(init[0].isTokenAutoRefreshEnabled).toBe(true);
  });
  it("stays off against the emulators", async () => {
    expect(await load({ VITE_RECAPTCHA_ENTERPRISE_KEY: "site-key", VITE_USE_EMULATORS: "true" })).toHaveLength(0);
  });
});
