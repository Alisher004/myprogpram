import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import kg from "../../src/i18n/kg.json";
import { ROUTES } from "../../src/lib/routes";
import { Route, renderAt } from "./helpers";

const state = vi.hoisted(() => ({ value: null }));
vi.mock("/src/auth/AuthContext.jsx", () => ({ useAuth: () => state.value, AuthProvider: ({ children }) => children }));
const { default: RequireRole } = await import("../../src/auth/RequireRole");

const withProblem = (profileStatus, profileError = null) => ({
  loading: false,
  user: { uid: "u" },
  profile: null,
  profileStatus,
  profileError,
  retryProfile: vi.fn(),
  logout: vi.fn(async () => {}),
});
const routes = [<Route key="t" path={`${ROUTES.teacher.base}/*`} element={<RequireRole role="teacher"><p>teacher area</p></RequireRole>} />];

describe("profile problems inside a guarded area", () => {
  it.each([
    ["timeout", kg.auth.profile.timeout],
    ["network", kg.auth.profile.network],
  ])("%s → explains it and offers Retry + Sign out", (kind, text) => {
    state.value = withProblem("error", { kind, retryable: true });
    renderAt(ROUTES.teacher.base, routes);
    expect(screen.getByRole("alert").textContent).toContain(text);
    fireEvent.click(screen.getByRole("button", { name: kg.common.retry }));
    expect(state.value.retryProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: kg.auth.logout })).toBeTruthy();
    expect(screen.queryByText("teacher area")).toBeNull();
  });

  it("permission denied → no Retry (would loop), only Sign out", () => {
    state.value = withProblem("error", { kind: "permission", retryable: false });
    renderAt(ROUTES.teacher.base, routes);
    expect(screen.getByRole("alert").textContent).toContain(kg.auth.profile.permission);
    expect(screen.queryByRole("button", { name: kg.common.retry })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: kg.auth.logout }));
    expect(state.value.logout).toHaveBeenCalledTimes(1);
  });

  it("missing profile is not shown as a network problem", () => {
    state.value = withProblem("missing");
    renderAt(ROUTES.teacher.base, routes);
    expect(screen.getByRole("alert").textContent).toContain(kg.auth.errors["app/no-profile"]);
    expect(screen.getByRole("alert").textContent).not.toContain(kg.auth.profile.network);
    expect(screen.queryByRole("button", { name: kg.common.retry })).toBeNull();
  });

  it("the page loader announces itself to screen readers", () => {
    state.value = { ...withProblem("loading"), profileStatus: "loading" };
    renderAt(ROUTES.teacher.base, routes);
    const loader = document.querySelector(".page-loader");
    expect(loader.getAttribute("role")).toBe("status");
    expect(loader.textContent).toBe(kg.common.loading);
  });
});
