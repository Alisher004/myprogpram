import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import kg from "../../src/i18n/kg.json";
import { ROUTES } from "../../src/lib/routes";
import { Route, renderAt } from "./helpers";

const state = vi.hoisted(() => ({ value: null }));
vi.mock("/src/auth/AuthContext.jsx", () => ({ useAuth: () => state.value, AuthProvider: ({ children }) => children }));
const { default: LoginPage } = await import("../../src/pages/auth/LoginPage");
const firebase = await import("/src/lib/firebase.js"); // the inert mock from setup.js

const base = (overrides = {}) => ({
  enabled: true,
  loading: false,
  user: null,
  profile: null,
  profileStatus: "none",
  portalPending: false,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signUpStudent: vi.fn(),
  ...overrides,
});

const routes = [
  <Route key="s" path={ROUTES.login} element={<LoginPage portal="student" />} />,
  <Route key="r" path={ROUTES.register} element={<LoginPage portal="student" initialMode="signup" />} />,
  <Route key="t" path={ROUTES.teacher.login} element={<LoginPage portal="teacher" />} />,
  <Route key="a" path={ROUTES.admin.login} element={<LoginPage portal="admin" />} />,
  <Route key="h" path="*" element={<p>somewhere else</p>} />,
];

const fill = (email, password) => {
  fireEvent.change(document.querySelector("#login-email"), { target: { value: email } });
  fireEvent.change(document.querySelector("#login-password"), { target: { value: password } });
};

describe("LoginPage", () => {
  it("student portal offers registration; staff portals don't", () => {
    state.value = base();
    renderAt(ROUTES.login, routes);
    expect(screen.getByText(kg.auth.toSignup)).toBeTruthy();
    for (const path of [ROUTES.teacher.login, ROUTES.admin.login]) {
      document.body.innerHTML = "";
      renderAt(path, routes);
      expect(screen.queryByText(kg.auth.toSignup)).toBeNull();
      expect(document.querySelector("#login-name")).toBeNull();
    }
  });

  it.each([
    ["teacher", ROUTES.teacher.login],
    ["admin", ROUTES.admin.login],
    ["student", ROUTES.login],
  ])("wrong-portal error is specific to the %s portal and stays on the form", async (portal, path) => {
    state.value = base({ signInWithEmail: vi.fn().mockRejectedValue({ code: "app/wrong-portal" }) });
    renderAt(path, routes);
    fill("x@test.dev", "secret1");
    await act(async () => fireEvent.submit(document.querySelector("form")));
    expect(screen.getByRole("alert").textContent).toBe(kg.auth.errors.wrongPortal[portal]);
    expect(screen.getByTestId("location").textContent).toBe(path);
  });

  it("invalid password shows a readable message", async () => {
    state.value = base({ signInWithEmail: vi.fn().mockRejectedValue({ code: "auth/invalid-credential" }) });
    renderAt(ROUTES.login, routes);
    fill("x@test.dev", "wrong12");
    await act(async () => fireEvent.submit(document.querySelector("form")));
    expect(screen.getByRole("alert").textContent).toBe(kg.auth.errors["auth/invalid-credential"]);
  });

  it("an unknown error never leaks internals", async () => {
    state.value = base({ signInWithEmail: vi.fn().mockRejectedValue({ code: "internal/stack-trace-here" }) });
    renderAt(ROUTES.login, routes);
    fill("x@test.dev", "secret1");
    await act(async () => fireEvent.submit(document.querySelector("form")));
    expect(screen.getByRole("alert").textContent).toBe(kg.auth.errors.default);
  });

  it("double submit sends one sign-in request", async () => {
    let release;
    const signIn = vi.fn(() => new Promise((r) => (release = r)));
    state.value = base({ signInWithEmail: signIn });
    renderAt(ROUTES.teacher.login, routes);
    fill("t@test.dev", "secret1");
    act(() => {
      fireEvent.submit(document.querySelector("form"));
      fireEvent.submit(document.querySelector("form"));
    });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("teacher", "t@test.dev", "secret1");
    await act(async () => release());
  });

  it("double submit on registration creates one account", async () => {
    let release;
    const signUp = vi.fn(() => new Promise((r) => (release = r)));
    state.value = base({ signUpStudent: signUp });
    renderAt(ROUTES.register, routes);
    fireEvent.change(document.querySelector("#login-name"), { target: { value: "Ай" } });
    fill("new@test.dev", "secret1");
    act(() => {
      fireEvent.submit(document.querySelector("form"));
      fireEvent.submit(document.querySelector("form"));
    });
    expect(signUp).toHaveBeenCalledTimes(1);
    await act(async () => release());
  });

  it.each([
    ["student", "/cabinet"],
    ["teacher", ROUTES.teacher.home],
    ["admin", ROUTES.admin.home],
  ])("an already signed-in %s opening the student login goes to their own home", (role, home) => {
    firebase.auth.currentUser = { uid: "u" };
    state.value = base({ user: { uid: "u" }, profile: { role }, profileStatus: "ready" });
    renderAt(ROUTES.login, routes);
    expect(screen.getByTestId("location").textContent).toBe(home);
    firebase.auth.currentUser = null;
  });

  // Regression: right after a wrong-portal sign-out React state still holds the old
  // user for a moment. auth.currentUser is already null, so no redirect may happen.
  it("does not redirect on stale React state after a sign-out", () => {
    firebase.auth.currentUser = null;
    state.value = base({ user: { uid: "u" }, profile: { role: "teacher" }, profileStatus: "ready" });
    renderAt(ROUTES.login, routes);
    expect(screen.getByTestId("location").textContent).toBe(ROUTES.login);
  });

  it("keeps the form mounted while a sign-in is being checked", () => {
    firebase.auth.currentUser = { uid: "u" };
    state.value = base({ portalPending: true, user: { uid: "u" }, profile: { role: "teacher" }, profileStatus: "ready" });
    renderAt(ROUTES.login, routes);
    expect(screen.getByTestId("location").textContent).toBe(ROUTES.login);
    expect(document.querySelector("form")).toBeTruthy();
    firebase.auth.currentUser = null;
  });
});
