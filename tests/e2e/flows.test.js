// End-to-end flows in a real browser against the Auth + Firestore emulators.
// Covers the 45 scenarios checked by hand earlier (now repeatable and isolated from
// production) plus the teacher/admin flows that were never automated.
//
// Run with: npm run test:e2e   (needs Java for the emulator and a local Chrome)
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_BASE,
  TEACHER_BASE,
  expectRedirect,
  retype,
  waitForDoc,
  launchBrowser,
  listIds,
  login,
  logout,
  newSession,
  open,
  pathOf,
  queryAs,
  readDoc,
  resetEmulators,
  restAs,
  seedAccount,
  sleep,
  startApp,
  stopApp,
  text,
  waitForPath,
  writeDoc,
} from "./support.js";

let browser;
let page;
let seed; // { teacher, admin, student } created fresh for every test

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
    teacher: await seedAccount({ email: "teacher@test.dev", name: "Нурбек Мугалим", role: "teacher" }),
    admin: await seedAccount({ email: "admin@test.dev", name: "Админ", role: "admin" }),
    student: await seedAccount({ email: "student@test.dev", name: "Айгерим", role: "student" }),
  };
  await writeDoc(`submissions/${seed.student.uid}_3`, {
    uid: seed.student.uid,
    studentName: "Айгерим",
    studentEmail: "student@test.dev",
    lessonId: 3,
    url: "https://github.com/aigerim/site",
    note: "",
    status: "pending",
    submittedAt: new Date("2026-10-01"),
  });
  page = await newSession(browser);
});

const sidebar = () => text(page, ".shell-sidebar");

// ════════════════════════════════════════════════════════════════════════════
describe("student", () => {
  it("registers and lands in the student cabinet with student-only navigation", async () => {
    await open(page, "/register");
    await page.waitForSelector("#login-name");
    await page.type("#login-name", "Тест Студент");
    await page.type("#login-email", "new@test.dev");
    await page.type("#login-password", "test-pass-123");
    await page.click('button[type="submit"]');
    expect(await waitForPath(page, "/cabinet")).toBe("/cabinet");
    await page.waitForSelector(".shell-sidebar");
    expect((await sidebar()).toLowerCase()).toContain("студенттин кабинети");
    expect(await sidebar()).not.toMatch(/Колдонуучулар|Студенттер|Текшерүү/);
    const [uid] = await listIds("users", "email", "new@test.dev");
    expect((await readDoc(`users/${uid}`)).role).toBe("student");
  });

  it("is bounced back to /cabinet from every staff URL, /login and /register", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    for (const url of [TEACHER_BASE, `${TEACHER_BASE}/students`, `${TEACHER_BASE}/queue`, ADMIN_BASE, `${ADMIN_BASE}/users`, `${ADMIN_BASE}/submissions`, "/login", "/register"]) {
      expect(await expectRedirect(page, url, "/cabinet"), url).toBe("/cabinet");
    }
  });

  it("triple-clicking 'done' toggles once and stores one progress document", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await open(page, "/cabinet/lessons/3");
    await page.waitForSelector(".lesson-done button");
    await page.evaluate(() => {
      const b = document.querySelector(".lesson-done button");
      b.click();
      b.click();
      b.click();
    });
    await page.waitForFunction(() => {
      const b = document.querySelector(".lesson-done button");
      return b && !b.disabled && b.getAttribute("aria-pressed") === "true";
    });
    const progress = await readDoc(`progress/${seed.student.uid}`);
    expect(Object.keys(progress.completed)).toEqual(["3"]);
    expect(await listIds("progress")).toEqual([seed.student.uid]);
  });

  it("homework submitted twice in quick succession creates one submission", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await open(page, "/cabinet/lessons/4");
    await page.waitForSelector(".hw-form input");
    await page.type(".hw-form input", "https://github.com/aigerim/lesson4");
    await page.evaluate(() => {
      const f = document.querySelector(".hw-form");
      f.requestSubmit();
      f.requestSubmit();
    });
    await page.waitForSelector(".hw-status");
    expect(await text(page, ".hw-status")).toContain("Текшерилүүдө");
    const ids = await listIds("submissions", "uid", seed.student.uid);
    expect(ids.sort()).toEqual([`${seed.student.uid}_3`, `${seed.student.uid}_4`]);
  });

  it("rejects a non-allowed homework link in the form", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await open(page, "/cabinet/lessons/4");
    await page.waitForSelector(".hw-form input");
    await page.type(".hw-form input", "https://example.com/site");
    await page.click('.hw-form button[type="submit"]');
    await page.waitForSelector(".hw-form .form-error");
    expect(await listIds("submissions", "uid", seed.student.uid)).toEqual([`${seed.student.uid}_3`]);
  });

  it("updates the profile name once even when Save is double-clicked", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await open(page, "/cabinet/profile");
    await page.waitForSelector("#profile-name");
    await retype(page, "#profile-name", "Айгерим Сапарова");
    await page.evaluate(() => {
      const b = document.querySelector('.profile-panel button[type="submit"]');
      b.click();
      b.click();
    });
    await page.waitForSelector(".form-success");
    expect((await waitForDoc(`users/${seed.student.uid}`, (d) => d.name === "Айгерим Сапарова")).name).toBe("Айгерим Сапарова");
  });

  it("keeps the chosen language after a reload", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await page.waitForSelector(".lang-select-button");
    await page.click(".lang-select-button");
    const options = await page.$$eval(".lang-select-menu button", (bs) => bs.map((b) => b.innerText.replace("✓", "").trim()));
    expect(options).toEqual(["Кыргызча", "Русский"]);
    await page.click(".lang-select-menu li:nth-child(2) button");
    expect((await sidebar()).toLowerCase()).toContain("кабинет студента");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(".shell-sidebar");
    expect((await sidebar()).toLowerCase()).toContain("кабинет студента");
    expect(await page.$eval("html", (h) => h.lang)).toBe("ru");
  });

  it("logs out to the student login and loses access to the cabinet", async () => {
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await logout(page);
    expect(await waitForPath(page, "/login")).toBe("/login");
    await open(page, "/cabinet/homework");
    expect(await waitForPath(page, "/login")).toBe("/login");
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("login portals (real Firebase Auth)", () => {
  const portals = { student: "/login", teacher: `${TEACHER_BASE}/login`, admin: `${ADMIN_BASE}/login` };
  const homes = { student: "/cabinet", teacher: TEACHER_BASE, admin: ADMIN_BASE };
  const messages = {
    student: "Бул аккаунт студенттики эмес",
    teacher: "мугалимдер үчүн гана",
    admin: "админдер үчүн гана",
  };

  for (const role of ["student", "teacher", "admin"]) {
    it(`${role} → own portal lands directly in the ${role} area`, async () => {
      await login(page, portals[role], `${role}@test.dev`);
      expect(await waitForPath(page, homes[role])).toBe(homes[role]);
      await page.waitForSelector(".shell-sidebar");
    });

    for (const portal of ["student", "teacher", "admin"].filter((p) => p !== role)) {
      it(`${role} → ${portal} portal is refused and the session is closed`, async () => {
        await login(page, portals[portal], `${role}@test.dev`);
        await page.waitForSelector(".form-error", { timeout: 15000 });
        expect(await text(page, ".form-error")).toContain(messages[portal]);
        expect(pathOf(page)).toBe(portals[portal]);
        await open(page, homes[role]);
        expect(await waitForPath(page, portals[role])).toBe(portals[role]); // signed out
      });
    }
  }

  it("wrong password shows an error and signs nobody in", async () => {
    await login(page, "/login", "student@test.dev", "wrong-password");
    await page.waitForSelector(".form-error");
    expect(await text(page, ".form-error")).toMatch(/туура эмес/);
    await open(page, "/cabinet");
    expect(await waitForPath(page, "/login")).toBe("/login");
  });

  it("signed-out visitors are sent to each area's own login", async () => {
    for (const [role, home] of Object.entries(homes)) {
      expect(await expectRedirect(page, `${home}${role === "student" ? "/homework" : ""}`, portals[role])).toBe(portals[role]);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("teacher", () => {
  beforeEach(async () => {
    await login(page, `${TEACHER_BASE}/login`, "teacher@test.dev");
    await waitForPath(page, TEACHER_BASE);
    await page.waitForSelector(".shell-sidebar");
  });

  it("has teacher-only navigation and a live pending badge", async () => {
    expect(await sidebar()).toContain("Студенттер");
    expect(await sidebar()).not.toContain("Колдонуучулар");
    await page.waitForSelector(".shell-badge");
    expect(await text(page, ".shell-badge")).toBe("1");
  });

  it("is sent back to the teacher panel from student and admin URLs", async () => {
    for (const url of ["/cabinet", "/cabinet/lessons", ADMIN_BASE, `${ADMIN_BASE}/users`]) {
      expect(await expectRedirect(page, url, TEACHER_BASE), url).toBe(TEACHER_BASE);
    }
  });

  it("sees students but not the admin in the roster", async () => {
    await open(page, `${TEACHER_BASE}/students`);
    await page.waitForSelector(".data-table");
    const roster = await text(page, ".data-table");
    expect(roster).toContain("student@test.dev");
    expect(roster).not.toContain("admin@test.dev");
    expect(roster).not.toContain("teacher@test.dev");
  });

  it("grades a submission once even when Accept is double-clicked", async () => {
    await open(page, `${TEACHER_BASE}/queue`);
    await page.waitForSelector(".submission-card .grade-picker button");
    await page.click(".submission-card .grade-picker button:nth-of-type(5)");
    await page.type(".submission-card textarea", "Жакшы иш");
    await page.evaluate(() => {
      const b = document.querySelector(".submission-card .hw-actions .btn-primary");
      b.click();
      b.click();
    });
    await page.waitForFunction(() => !document.querySelector(".submission-card"), { timeout: 15000 });
    const sub = await waitForDoc(`submissions/${seed.student.uid}_3`, (d) => d.status === "accepted");
    expect(sub).toMatchObject({ status: "accepted", grade: 5, feedback: "Жакшы иш", reviewedBy: seed.teacher.uid });
    expect(await listIds("submissions")).toEqual([`${seed.student.uid}_3`]);
  });

  it("requires a grade before accepting", async () => {
    await open(page, `${TEACHER_BASE}/queue`);
    await page.waitForSelector(".submission-card .hw-actions .btn-primary");
    await page.click(".submission-card .hw-actions .btn-primary");
    await page.waitForSelector(".submission-card .form-error");
    expect((await readDoc(`submissions/${seed.student.uid}_3`)).status).toBe("pending");
  });

  it("direct API: cannot promote anyone or itself (Firestore REST, UI bypassed)", async () => {
    const body = (role) => JSON.stringify({ fields: { role: { stringValue: role } } });
    expect((await restAs(seed.teacher.idToken, `users/${seed.student.uid}?updateMask.fieldPaths=role`, { method: "PATCH", body: body("admin") })).status).toBe(403);
    expect((await restAs(seed.teacher.idToken, `users/${seed.teacher.uid}?updateMask.fieldPaths=role`, { method: "PATCH", body: body("admin") })).status).toBe(403);
    expect((await readDoc(`users/${seed.teacher.uid}`)).role).toBe("teacher");
  });

  it("logs out to the teacher login", async () => {
    await logout(page);
    expect(await waitForPath(page, `${TEACHER_BASE}/login`)).toBe(`${TEACHER_BASE}/login`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("admin", () => {
  beforeEach(async () => {
    await login(page, `${ADMIN_BASE}/login`, "admin@test.dev");
    await waitForPath(page, ADMIN_BASE);
    await page.waitForSelector(".shell-sidebar");
  });

  it("lands directly on the admin overview with admin-only navigation", async () => {
    expect(pathOf(page)).toBe(ADMIN_BASE);
    expect(await sidebar()).toContain("Колдонуучулар");
    expect(await sidebar()).not.toMatch(/Сабактар|Сайтка өтүү|Текшерүү күтүүдө/);
    await page.waitForSelector(".stat-value");
  });

  it("is sent back to the admin panel from student and teacher URLs", async () => {
    for (const url of ["/cabinet", `${TEACHER_BASE}`, `${TEACHER_BASE}/queue`]) {
      expect(await expectRedirect(page, url, ADMIN_BASE), url).toBe(ADMIN_BASE);
    }
  });

  it("promotes a student to teacher once even when the role is changed twice quickly", async () => {
    await open(page, `${ADMIN_BASE}/users`);
    const select = `#role-${seed.student.uid}`;
    await page.waitForSelector(select);
    await page.evaluate((sel) => {
      const s = document.querySelector(sel);
      for (const v of ["teacher", "teacher"]) {
        s.value = v;
        s.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, select);
    await page.waitForFunction((sel) => document.querySelector(sel)?.value === "teacher" && !document.querySelector(sel).disabled, {}, select);
    expect((await waitForDoc(`users/${seed.student.uid}`, (d) => d.role === "teacher")).role).toBe("teacher");
    expect(await listIds("users", "email", "student@test.dev")).toEqual([seed.student.uid]);
  });

  it("cannot change its own role", async () => {
    await open(page, `${ADMIN_BASE}/users`);
    await page.waitForSelector(`#role-${seed.admin.uid}`);
    expect(await page.$eval(`#role-${seed.admin.uid}`, (s) => s.disabled)).toBe(true);
    const res = await restAs(seed.admin.idToken, `users/${seed.admin.uid}?updateMask.fieldPaths=role`, {
      method: "PATCH",
      body: JSON.stringify({ fields: { role: { stringValue: "student" } } }),
    });
    expect(res.status).toBe(403);
  });

  it("monitors submissions read-only (no grading controls)", async () => {
    await open(page, `${ADMIN_BASE}/submissions`);
    await page.waitForSelector(".submission-card");
    expect(await page.$(".submission-card .grade-picker")).toBeNull();
  });

  it("a demotion applies to an open teacher session immediately", async () => {
    const teacherPage = await newSession(browser);
    await login(teacherPage, `${TEACHER_BASE}/login`, "teacher@test.dev");
    await waitForPath(teacherPage, TEACHER_BASE);
    await teacherPage.waitForSelector(".shell-sidebar");

    await open(page, `${ADMIN_BASE}/users`);
    await page.waitForSelector(`#role-${seed.teacher.uid}`);
    await page.select(`#role-${seed.teacher.uid}`, "student");
    for (let i = 0; i < 30 && (await readDoc(`users/${seed.teacher.uid}`)).role !== "student"; i++) await sleep(200);
    expect((await readDoc(`users/${seed.teacher.uid}`)).role).toBe("student");
    // The live profile listener moves the former teacher out of the panel
    expect(await waitForPath(teacherPage, "/cabinet")).toBe("/cabinet");
    await teacherPage.browserContext().close();
  });

  it("logs out to the admin login", async () => {
    await logout(page);
    expect(await waitForPath(page, `${ADMIN_BASE}/login`)).toBe(`${ADMIN_BASE}/login`);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("direct API access and auth context (UI bypassed)", () => {
  it("student REST calls: own data allowed, everything else 403", async () => {
    const T = seed.student.idToken;
    expect((await restAs(T, `users/${seed.student.uid}`)).status).toBe(200);
    expect((await restAs(T, `users/${seed.teacher.uid}`)).status).toBe(403);
    expect((await restAs(T, `submissions/${seed.student.uid}_3`)).status).toBe(200);
    expect((await queryAs(T, { from: [{ collectionId: "users" }] })).status).toBe(403);
    expect((await queryAs(T, { from: [{ collectionId: "submissions" }] })).status).toBe(403);
    const role = await restAs(T, `users/${seed.student.uid}?updateMask.fieldPaths=role`, {
      method: "PATCH",
      body: JSON.stringify({ fields: { role: { stringValue: "admin" } } }),
    });
    expect(role.status).toBe(403);
  });

  it("no token or a garbage token is never authorized", async () => {
    expect((await restAs(null, `users/${seed.student.uid}`)).status).not.toBe(200);
    expect((await restAs("not-a-real-token", `users/${seed.student.uid}`)).status).not.toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("public site and responsive layout", () => {
  it("public pages render without errors, horizontal overflow or raw i18n keys", async () => {
    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 800 });
      for (const path of ["/", "/programma", "/resources", "/career", "/lesson/26", "/lesson.html?id=5", "/login", "/register", `${TEACHER_BASE}/login`, `${ADMIN_BASE}/login`]) {
        await open(page, path);
        await page.waitForSelector("h1", { timeout: 15000 });
        const info = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          keys: document.body.innerText.match(/\b(common|auth|shell|teacher|admin|homework|lesson|programma)\.[a-zA-Z]+\.[a-zA-Z.]+/g),
        }));
        expect(info.overflow, `${width} ${path}`).toBeLessThanOrEqual(0);
        expect(info.keys, `${width} ${path}`).toBeNull();
      }
    }
    expect(page.errors).toEqual([]);
  });

  it("the legacy lesson URL redirects to the new one", async () => {
    expect(await expectRedirect(page, "/lesson.html?id=5", "/lesson/5")).toBe("/lesson/5");
  });

  it("phone: public menu and cabinet drawer open", async () => {
    await page.setViewport({ width: 390, height: 800 });
    await open(page, "/");
    await page.waitForSelector(".nav-toggle");
    await page.click(".nav-toggle");
    expect(await page.$eval(".nav-links", (n) => n.classList.contains("open"))).toBe(true);
    await login(page, "/login", "student@test.dev");
    await waitForPath(page, "/cabinet");
    await page.waitForSelector(".shell-menu-button");
    await page.click(".shell-menu-button");
    expect(await page.$eval(".shell", (s) => s.classList.contains("shell-menu-open"))).toBe(true);
  });
});
