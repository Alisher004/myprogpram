import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import kg from "../../src/i18n/kg.json";
import { I18nProvider } from "../../src/i18n/I18nContext";
import { ROUTES } from "../../src/lib/routes";
import { Route, renderAt } from "./helpers";

const state = vi.hoisted(() => ({ value: null }));
vi.mock("/src/auth/AuthContext.jsx", () => ({ useAuth: () => state.value, AuthProvider: ({ children }) => children }));
const { default: LoginPage } = await import("../../src/pages/auth/LoginPage");
const { default: EmailVerification } = await import("../../src/pages/student/EmailVerification");

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};

const signedOut = (overrides = {}) => ({
  enabled: true, loading: false, user: null, profile: null, profileStatus: "none", portalPending: false,
  signInWithEmail: vi.fn(), signInWithGoogle: vi.fn(), signUpStudent: vi.fn(), sendPasswordReset: vi.fn(async () => {}),
  ...overrides,
});
const loginRoutes = [
  <Route key="s" path={ROUTES.login} element={<LoginPage portal="student" />} />,
  <Route key="t" path={ROUTES.teacher.login} element={<LoginPage portal="teacher" />} />,
  <Route key="a" path={ROUTES.admin.login} element={<LoginPage portal="admin" />} />,
];
const openReset = (path = ROUTES.login) => {
  renderAt(path, loginRoutes);
  fireEvent.change(document.querySelector("#login-email"), { target: { value: "me@test.dev" } });
  fireEvent.click(screen.getByRole("button", { name: kg.auth.reset.link }));
};

describe("password reset", () => {
  it.each([ROUTES.login, ROUTES.teacher.login, ROUTES.admin.login])("is reachable from the %s login and keeps the typed email", (path) => {
    state.value = signedOut();
    openReset(path);
    expect(screen.getByRole("heading").textContent).toBe(kg.auth.reset.title);
    expect(document.querySelector("#reset-email").value).toBe("me@test.dev");
  });

  it("valid request → loading → generic success (no hint whether the account exists)", async () => {
    const d = deferred();
    state.value = signedOut({ sendPasswordReset: vi.fn(() => d.promise) });
    openReset();
    act(() => fireEvent.submit(document.querySelector("form")));
    const button = screen.getByRole("button", { name: kg.common.wait });
    expect(button.disabled).toBe(true);
    await act(async () => d.resolve());
    const notice = document.querySelector(".auth-notice");
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toBe(kg.auth.reset.sent);
    expect(state.value.sendPasswordReset).toHaveBeenCalledWith("me@test.dev");
  });

  it("double submit sends one email", async () => {
    const d = deferred();
    state.value = signedOut({ sendPasswordReset: vi.fn(() => d.promise) });
    openReset();
    act(() => {
      fireEvent.submit(document.querySelector("form"));
      fireEvent.submit(document.querySelector("form"));
    });
    expect(state.value.sendPasswordReset).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve());
  });

  it.each([
    ["auth/invalid-email", kg.auth.errors["auth/invalid-email"]],
    ["auth/too-many-requests", kg.auth.errors["auth/too-many-requests"]],
    ["auth/network-request-failed", kg.auth.errors["auth/network-request-failed"]],
    ["auth/something-new", kg.auth.errors.default],
  ])("%s → readable error, form stays", async (code, text) => {
    state.value = signedOut({ sendPasswordReset: vi.fn().mockRejectedValue({ code }) });
    openReset();
    await act(async () => fireEvent.submit(document.querySelector("form")));
    expect(screen.getByRole("alert").textContent).toBe(text);
    expect(document.querySelector("#reset-email")).toBeTruthy();
  });

  it("back link returns to the login form", () => {
    state.value = signedOut();
    openReset();
    fireEvent.click(screen.getByRole("button", { name: kg.auth.reset.back }));
    expect(document.querySelector("#login-password")).toBeTruthy();
  });
});

const mountVerification = (overrides) => {
  state.value = { emailVerified: false, resendVerification: vi.fn(async () => {}), refreshEmailVerified: vi.fn(async () => false), ...overrides };
  return render(
    <I18nProvider>
      <EmailVerification />
    </I18nProvider>
  );
};

describe("email verification", () => {
  it("verified account shows a badge and no actions", () => {
    mountVerification({ emailVerified: true });
    expect(screen.getByText(kg.profile.verify.verified)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("resend: loading, success message, one request for a double click", async () => {
    const d = deferred();
    mountVerification({ resendVerification: vi.fn(() => d.promise) });
    const resend = screen.getByRole("button", { name: kg.profile.verify.resend });
    act(() => {
      fireEvent.click(resend);
      fireEvent.click(resend);
    });
    expect(state.value.resendVerification).toHaveBeenCalledTimes(1);
    expect(resend.disabled).toBe(true);
    expect(screen.getByRole("button", { name: kg.profile.verify.check }).disabled).toBe(true);
    await act(async () => d.resolve());
    expect(screen.getByRole("status").textContent).toBe(kg.profile.verify.sent);
    expect(resend.disabled).toBe(false);
  });

  it("resend error (rate limit) is shown readably", async () => {
    mountVerification({ resendVerification: vi.fn().mockRejectedValue({ code: "auth/too-many-requests" }) });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: kg.profile.verify.resend })));
    expect(screen.getByRole("status").textContent).toBe(kg.auth.errors["auth/too-many-requests"]);
  });

  it("'I verified' while still unverified says so", async () => {
    mountVerification();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: kg.profile.verify.check })));
    expect(state.value.refreshEmailVerified).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe(kg.profile.verify.still);
  });
});
