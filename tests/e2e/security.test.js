// HTTP security headers: `vite preview` serves the headers from vercel.json (see
// vite.config.js), so the whole E2E suite already runs under the production policy.
// These tests pin the headers down and check the features they could break.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE_URL, launchBrowser, newSession, open, startApp, stopApp } from "./support.js";

let browser;

beforeAll(async () => {
  await startApp();
  browser = await launchBrowser();
});
afterAll(async () => {
  await browser?.close();
  stopApp();
});

describe("security headers", () => {
  it.each(["/", "/login", "/lesson/19", "/kb-control/login"])("%s is served with the security headers", async (path) => {
    const res = await fetch(BASE_URL + path);
    const h = res.headers;
    expect(h.get("x-content-type-options")).toBe("nosniff");
    expect(h.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(h.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(h.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("permissions-policy")).toContain("camera=()");
    // Firebase signInWithPopup needs the opener link to the auth popup kept
    expect(h.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
  });

  it("another site cannot embed the app in a frame (clickjacking)", async () => {
    const page = await newSession(browser);
    // about:blank is a different origin from BASE_URL
    await page.setContent(`<iframe src="${BASE_URL}/login"></iframe>`);
    const frame = await page.waitForFrame((f) => f !== page.mainFrame(), { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1500));
    const blocked = await frame
      .evaluate(() => !document.querySelector("#login-email"))
      .catch(() => true); // a blocked frame is an error page we cannot script
    expect(blocked).toBe(true);
    await page.browserContext().close();
  });

  it("the lesson playground still runs student code under the policy", async () => {
    const page = await newSession(browser);
    await open(page, "/lesson/19");
    await page.waitForFunction(
      () => [...document.querySelectorAll(".console-line")].some((l) => l.textContent.includes("Айгерим")),
      { timeout: 15000 }
    );
    expect(page.errors).toEqual([]);
    await page.browserContext().close();
  });
});
