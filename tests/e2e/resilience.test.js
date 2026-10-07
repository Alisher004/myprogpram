// Stability: password reset, email verification, and recovery from profile / network /
// deployment failures — in a real browser against the emulators. Failures are simulated
// deterministically (request interception, emulator REST), never against production.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  TEACHER_BASE,
  applyActionCode,
  deleteDoc,
  launchBrowser,
  login,
  newSession,
  open,
  pathOf,
  resetEmulators,
  seedAccount,
  sentEmails,
  startApp,
  stopApp,
  text,
  waitForPath,
} from "./support.js";

let browser;
let page;
let seed;

beforeAll(async () => {
  await startApp();
  browser = await launchBrowser();
});
afterAll(async () => {
  await browser?.close();
  stopApp();
});
beforeEach(async () => {
  await resetEmulators();
  seed = {
    student: await seedAccount({ email: "student@test.dev", name: "Айгерим", role: "student" }),
    teacher: await seedAccount({ email: "teacher@test.dev", name: "Мугалим", role: "teacher" }),
  };
  page = await newSession(browser);
});

// ════════════════════════════════════════════════════════════════════════════
describe("password reset", () => {
  it("known email → generic success and the reset email is sent", async () => {
    await open(page, "/login");
    await page.waitForSelector("#login-email");
    await page.type("#login-email", "student@test.dev");
    await page.click(".auth-card .link-button");
    await page.waitForSelector("#reset-email");
    expect(await page.$eval("#reset-email", (i) => i.value)).toBe("student@test.dev");
    await page.click('button[type="submit"]');
    await page.waitForSelector(".auth-notice");
    const message = await text(page, ".auth-notice");
    expect(message).toContain("шилтемеси жөнөтүлдү");
    const emails = (await sentEmails("PASSWORD_RESET")).filter((e) => e.email === "student@test.dev");
    expect(emails).toHaveLength(1);
  });

  it("unknown email → the exact same message, and nothing is sent", async () => {
    await open(page, "/login");
    await page.waitForSelector(".auth-card .link-button");
    await page.click(".auth-card .link-button");
    await page.waitForSelector("#reset-email");
    await page.type("#reset-email", "nobody@test.dev");
    await page.click('button[type="submit"]');
    await page.waitForSelector(".auth-notice");
    expect(await text(page, ".auth-notice")).toContain("шилтемеси жөнөтүлдү");
    expect((await sentEmails("PASSWORD_RESET")).filter((e) => e.email === "nobody@test.dev")).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("email verification", () => {
  it("registration sends a verification email; resend, verify and re-check in the profile", async () => {
    await open(page, "/register");
    await page.waitForSelector("#login-name");
    await page.type("#login-name", "Жаңы Студент");
    await page.type("#login-email", "fresh@test.dev");
    await page.type("#login-password", "test-pass-123");
    await page.click('button[type="submit"]');
    await waitForPath(page, "/cabinet");
    const mine = async () => (await sentEmails("VERIFY_EMAIL")).filter((e) => e.email === "fresh@test.dev");
    for (let i = 0; i < 20 && (await mine()).length === 0; i++) await new Promise((r) => setTimeout(r, 200));
    expect(await mine()).toHaveLength(1);

    await open(page, "/cabinet/profile");
    await page.waitForSelector(".verify-block");
    expect(await text(page, ".verify-block")).toContain("ырастала элек");

    // Resend (double click → one more email)
    await page.evaluate(() => {
      const b = document.querySelector(".verify-block .btn");
      b.click();
      b.click();
    });
    await page.waitForSelector(".verify-block .form-success");
    expect(await mine()).toHaveLength(2);

    // "I verified" before clicking the link → still unverified
    await page.click(".verify-block .btn:nth-of-type(2)");
    await page.waitForSelector(".verify-block .form-error");

    // Click the emailed link, then re-check
    const [latest] = (await mine()).slice(-1);
    await applyActionCode(latest.oobCode);
    await page.click(".verify-block .btn:nth-of-type(2)");
    await page.waitForFunction(() => document.body.innerText.includes("Email ырасталган"), { timeout: 15000 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("profile failures", () => {
  it("profile deleted while signed in → 'profile missing' with sign-out, not a spinner", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await page.waitForSelector(".shell-sidebar");
    await deleteDoc(`users/${seed.student.uid}`);
    await page.waitForSelector(".state-block[role=alert]", { timeout: 15000 });
    expect(await text(page, ".state-block")).toContain("профили табылган жок");
    expect(await page.$(".state-block .btn-primary")).toBeNull(); // no Retry for a missing profile
    await page.click(".state-block .btn-outline");
    expect(await waitForPath(page, "/login")).toBe("/login");
  });

  it("Firestore unreachable → timeout error with Retry; Retry recovers once the network is back", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await page.waitForSelector(".shell-sidebar");

    // Cut the browser off from Firestore only (auth keeps working), then reload
    let blocked = true;
    await page.setRequestInterception(true);
    page.on("request", (req) => (blocked && req.url().includes(":8080/") ? req.abort("failed") : req.continue()));
    await page.reload({ waitUntil: "domcontentloaded" });

    const started = Date.now();
    await page.waitForSelector(".state-block[role=alert]", { timeout: 30000 });
    const waited = Date.now() - started;
    expect(await text(page, ".state-block")).toContain("убагында жооп бербеди");
    expect(waited).toBeGreaterThan(10000); // not an aggressive timeout
    expect(await page.$(".page-loader")).toBeNull(); // no endless spinner

    blocked = false;
    await page.click(".state-block .btn-primary"); // Retry
    await page.waitForSelector(".shell-sidebar", { timeout: 45000 });
    expect(pathOf(page)).toBe("/cabinet");
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("deployment chunk mismatch", () => {
  it("missing route chunk → one automatic reload, then a 'new version' message; Reload recovers", async () => {
    await login(page, `${TEACHER_BASE}/login`, "teacher@test.dev");
    await waitForPath(page, TEACHER_BASE);
    await page.waitForSelector(".shell-sidebar");

    // Simulate a deploy: the Students page chunk this tab knows about is gone (404)
    let blockChunk = true;
    const blockedChunks = [];
    let documentLoads = 0; // full page loads (client-side navigation doesn't count)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (req.isNavigationRequest() && req.frame() === page.mainFrame()) documentLoads++;
      if (blockChunk && /\/assets\/Students-[\w-]+\.js$/.test(req.url())) {
        blockedChunks.push(req.url());
        return req.respond({ status: 404, body: "not found" });
      }
      return req.continue();
    });

    await page.click(`a[href="${TEACHER_BASE}/students"]`);
    await page.waitForFunction(() => document.body.innerText.includes("Сайттын жаңы версиясы чыкты"), { timeout: 30000 });

    expect(documentLoads).toBe(1); // exactly one automatic reload, no loop
    expect(blockedChunks.length).toBeGreaterThanOrEqual(2); // before and after the reload
    expect(await page.$(".shell-sidebar")).not.toBeNull(); // shell stays usable
    expect(await page.evaluate(() => sessionStorage.getItem("kb-chunk-reload-at"))).not.toBeNull();

    // Still signed in after the reload; manual Reload with the chunk available recovers
    blockChunk = false;
    await page.click(".error-fallback .btn-primary");
    await page.waitForSelector(".data-table", { timeout: 30000 });
    expect(pathOf(page)).toBe(`${TEACHER_BASE}/students`);
  });

  it("normal navigation between lazy pages never reloads", async () => {
    await login(page, `${TEACHER_BASE}/login`, "teacher@test.dev");
    await waitForPath(page, TEACHER_BASE);
    await page.waitForSelector(".shell-sidebar");
    for (const href of [`${TEACHER_BASE}/queue`, `${TEACHER_BASE}/submissions`, `${TEACHER_BASE}/students`, TEACHER_BASE]) {
      await page.click(`a[href="${href}"]`);
      await waitForPath(page, href);
    }
    await new Promise((r) => setTimeout(r, 500));
    // Client-side navigation fires framenavigated for history changes but never a document load
    expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
    expect(await page.evaluate(() => sessionStorage.getItem("kb-chunk-reload-at"))).toBeNull();
  });
});
