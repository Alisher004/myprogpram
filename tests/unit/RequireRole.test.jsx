import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ROUTES } from "../../src/lib/routes";
import { Route, renderAt } from "./helpers";

const state = vi.hoisted(() => ({ value: null }));
vi.mock("/src/auth/AuthContext.jsx", () => ({ useAuth: () => state.value, AuthProvider: ({ children }) => children }));
const { default: RequireRole } = await import("../../src/auth/RequireRole");

const signedIn = (role) => ({
  loading: false,
  user: { uid: "u" },
  profile: { role, name: "X" },
  profileStatus: "ready",
  logout: vi.fn(),
});
const signedOut = { loading: false, user: null, profile: null, profileStatus: "none" };

// One app with all three guarded areas plus the login pages as plain markers
const routes = [
  ["student", ROUTES.student.base],
  ["teacher", ROUTES.teacher.base],
  ["admin", ROUTES.admin.base],
].flatMap(([role, base]) => [
  <Route key={`${role}-area`} path={`${base}/*`} element={<RequireRole role={role}><p>{role} area</p></RequireRole>} />,
]).concat(
  <Route key="l1" path={ROUTES.login} element={<p>student login</p>} />,
  <Route key="l2" path={ROUTES.teacher.login} element={<p>teacher login</p>} />,
  <Route key="l3" path={ROUTES.admin.login} element={<p>admin login</p>} />
);

const where = () => screen.getByTestId("location").textContent;

describe("RequireRole: direct URL access", () => {
  const areas = { student: ROUTES.student.base, teacher: ROUTES.teacher.base, admin: ROUTES.admin.base };
  const logins = { student: ROUTES.login, teacher: ROUTES.teacher.login, admin: ROUTES.admin.login };

  for (const [area, path] of Object.entries(areas)) {
    it(`signed out → ${area} area redirects to the ${area} login`, () => {
      state.value = signedOut;
      renderAt(`${path}/deep/link`, routes);
      expect(where()).toBe(logins[area]);
    });
    for (const role of Object.keys(areas)) {
      it(`${role} opening the ${area} area → ${role === area ? "allowed" : `sent to own ${role} home`}`, () => {
        state.value = signedIn(role);
        renderAt(path, routes);
        if (role === area) expect(screen.getByText(`${area} area`)).toBeTruthy();
        else expect(where()).toBe(areas[role]);
      });
    }
  }

  it("shows a loader (not the page) while auth or the profile is loading", () => {
    state.value = { loading: true, user: null, profile: null, profileStatus: "none" };
    renderAt(ROUTES.admin.base, routes);
    expect(screen.queryByText("admin area")).toBeNull();
    state.value = { loading: false, user: { uid: "u" }, profile: null, profileStatus: "loading" };
    renderAt(ROUTES.admin.base, routes);
    expect(screen.queryByText("admin area")).toBeNull();
  });

  it("signed in without a profile → error message with a sign-out button, no area", () => {
    state.value = { loading: false, user: { uid: "u" }, profile: null, profileStatus: "missing", logout: vi.fn() };
    renderAt(ROUTES.teacher.base, routes);
    expect(screen.queryByText("teacher area")).toBeNull();
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
