// E2E harness: builds the app pointed at the Firebase emulators, serves it, seeds
// accounts through the emulator REST APIs and drives a real Chrome via puppeteer-core.
// Must run inside `firebase emulators:exec` (npm run test:e2e does that).
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

export const PROJECT_ID = "demo-codebilim";
export const TEACHER_BASE = "/kb-mentor";
export const ADMIN_BASE = "/kb-control";
const AUTH = "http://127.0.0.1:9099";
const FS = "http://127.0.0.1:8080";
const DOCS = `${FS}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const PORT = 4410;
export const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = "node_modules/.e2e-dist";

// Every VITE_* value is set explicitly so .env.local (production config) can't leak in
const APP_ENV = {
  VITE_FIREBASE_API_KEY: "demo-key",
  VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: "0",
  VITE_FIREBASE_APP_ID: "1:0:web:0",
  VITE_USE_EMULATORS: "true",
  VITE_TEACHER_BASE: TEACHER_BASE.slice(1),
  VITE_ADMIN_BASE: ADMIN_BASE.slice(1),
};

// ── App server ──────────────────────────────────────────────────────────────
let server;
export async function startApp() {
  // vitest sets NODE_ENV=test, which would give a development React build; E2E must use production
  const build = spawnSync("npx", ["vite", "build", "--outDir", OUT_DIR, "--emptyOutDir", "--logLevel", "error"], {
    env: { ...process.env, ...APP_ENV, NODE_ENV: "production" },
    stdio: "inherit",
  });
  if (build.status !== 0) throw new Error("vite build failed");
  server = spawn("npx", ["vite", "preview", "--outDir", OUT_DIR, "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
    env: { ...process.env, ...APP_ENV },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE_URL)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error("app server did not start");
}
export function stopApp() {
  server?.kill();
}

// ── Browser ─────────────────────────────────────────────────────────────────
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

export async function launchBrowser() {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error("Chrome not found. Set CHROME_PATH to a Chrome/Chromium binary.");
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}

// A fresh, isolated browser session (own cookies/IndexedDB = own Firebase login)
export async function newSession(browser, { width = 1280, height = 900 } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height });
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("dialog", (d) => d.accept()); // window.confirm in role changes / playground reset
  return page;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pathOf = (page) => new URL(page.url()).pathname;

export async function open(page, path) {
  await page.goto(BASE_URL + path, { waitUntil: "domcontentloaded" });
}

export async function waitForPath(page, path, timeout = 15000) {
  await page.waitForFunction((p) => location.pathname === p, { timeout }, path).catch(() => {});
  return pathOf(page);
}

// Opens `path` in a fresh tab of the same session and waits for the app to settle on
// `expected`. A fresh tab mirrors a user following a link; rapid same-tab reloads can
// exhaust Chrome's 6-connection limit against the HTTP/1.1 emulator (not production).
export async function expectRedirect(page, path, expected, timeout = 15000) {
  const tab = await page.browserContext().newPage();
  await tab.goto(BASE_URL + path, { waitUntil: "domcontentloaded" });
  const landed = await waitForPath(tab, expected, timeout);
  await tab.close();
  return landed;
}

// Polls the database until `check(doc)` holds: the UI updates optimistically before
// the server confirms, so assertions on stored data must wait for the commit.
export async function waitForDoc(path, check, timeout = 10000) {
  const until = Date.now() + timeout;
  let doc;
  while (Date.now() < until) {
    doc = await readDoc(path);
    if (doc && check(doc)) return doc;
    await sleep(150);
  }
  return doc;
}

// Replace an input's value the way a user would (select all + type)
export async function retype(page, selector, value) {
  await page.$eval(selector, (el) => {
    el.focus();
    el.select();
  });
  await page.keyboard.press("Backspace");
  await page.type(selector, value);
}

export const text = (page, sel) => page.$eval(sel, (el) => el.innerText.replace(/\s+/g, " ").trim()).catch(() => "");

export async function login(page, portalPath, email, password = PASSWORD) {
  await open(page, portalPath);
  await page.waitForSelector("#login-email");
  await page.type("#login-email", email);
  await page.type("#login-password", password);
  await page.click('button[type="submit"]');
}

export async function logout(page) {
  await page.waitForSelector(".shell-topbar-actions .btn");
  await page.click(".shell-topbar-actions .btn");
}

// ── Emulator data ───────────────────────────────────────────────────────────
export const PASSWORD = "test-pass-123";
const owner = { Authorization: "Bearer owner", "Content-Type": "application/json" };

export async function resetEmulators() {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
  await fetch(`${FS}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
}

export async function createAuthUser(email, password = PASSWORD) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).then((r) => r.json());
  if (!res.localId) throw new Error(`could not create ${email}: ${JSON.stringify(res)}`);
  return res;
}

const toFields = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      v === null
        ? { nullValue: null }
        : v instanceof Date
          ? { timestampValue: v.toISOString() }
          : typeof v === "number"
            ? { integerValue: String(v) }
            : { stringValue: v },
    ])
  );

const fromValue = (v) =>
  "stringValue" in v ? v.stringValue
  : "integerValue" in v ? Number(v.integerValue)
  : "timestampValue" in v ? v.timestampValue
  : "nullValue" in v ? null
  : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromValue(x)]))
  : v;

// Writes bypass the rules ("owner"), like the Admin SDK would
export async function writeDoc(path, data) {
  const res = await fetch(`${DOCS}/${path}`, { method: "PATCH", headers: owner, body: JSON.stringify({ fields: toFields(data) }) });
  if (!res.ok) throw new Error(`seed ${path} failed: ${res.status}`);
}

export async function readDoc(path) {
  const res = await fetch(`${DOCS}/${path}`, { headers: owner });
  if (res.status === 404) return null;
  const json = await res.json();
  return Object.fromEntries(Object.entries(json.fields ?? {}).map(([k, v]) => [k, fromValue(v)]));
}

export async function listIds(collectionId, field, value) {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: owner,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        ...(field && { where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } } }),
      },
    }),
  }).then((r) => r.json());
  return res.filter((r) => r.document).map((r) => r.document.name.split("/").pop());
}

// Raw REST call as a given user (or a bogus token) — bypasses the UI entirely
export async function restAs(idToken, path, init = {}) {
  return fetch(`${DOCS}/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(idToken && { Authorization: `Bearer ${idToken}` }) },
  });
}

// Raw structured query as a given user
export async function queryAs(idToken, structuredQuery) {
  return fetch(`${DOCS}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idToken && { Authorization: `Bearer ${idToken}` }) },
    body: JSON.stringify({ structuredQuery }),
  });
}

// Emails the Auth emulator "sent" (password reset, verification)
export async function sentEmails(requestType) {
  const res = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT_ID}/oobCodes`).then((r) => r.json());
  return (res.oobCodes ?? []).filter((c) => !requestType || c.requestType === requestType);
}

// Applies an emailed action code (what clicking the link in the email does)
export async function applyActionCode(oobCode) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oobCode }),
  });
  if (!res.ok) throw new Error(`applyActionCode failed: ${res.status}`);
}

export async function deleteDoc(path) {
  await fetch(`${DOCS}/${path}`, { method: "DELETE", headers: owner });
}

export async function seedAccount({ email, name, role }) {
  const { localId, idToken } = await createAuthUser(email);
  await writeDoc(`users/${localId}`, { name, email, photoURL: null, role, createdAt: new Date("2026-09-01") });
  return { uid: localId, idToken, email, name, role };
}
