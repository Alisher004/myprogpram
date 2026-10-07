import { describe, expect, it } from "vitest";
import { ROUTES, homeFor, loginFor } from "../../src/lib/routes";

describe("routes", () => {
  it("sends each role to its own home and login", () => {
    expect(homeFor("student")).toBe("/cabinet");
    expect(homeFor("teacher")).toBe(ROUTES.teacher.home);
    expect(homeFor("admin")).toBe(ROUTES.admin.home);
    expect(loginFor("student")).toBe("/login");
    expect(loginFor("teacher")).toBe(`${ROUTES.teacher.base}/login`);
    expect(loginFor("admin")).toBe(`${ROUTES.admin.base}/login`);
  });

  it("falls back to the student area for unknown roles", () => {
    expect(homeFor(undefined)).toBe("/cabinet");
    expect(homeFor("superuser")).toBe("/cabinet");
  });

  it("does not put staff panels at guessable /teacher or /admin", () => {
    expect(ROUTES.teacher.base).not.toBe("/teacher");
    expect(ROUTES.admin.base).not.toBe("/admin");
    expect(ROUTES.teacher.base).not.toBe(ROUTES.admin.base);
  });
});
