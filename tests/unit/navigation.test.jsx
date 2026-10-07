import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import kg from "../../src/i18n/kg.json";
import { ROUTES } from "../../src/lib/routes";
import { Route, renderAt } from "./helpers";

const state = vi.hoisted(() => ({ value: null }));
vi.mock("/src/auth/AuthContext.jsx", () => ({ useAuth: () => state.value, AuthProvider: ({ children }) => children }));
vi.mock("/src/data/submissions.js", () => ({ watchPendingSubmissions: (cb) => (cb([{}, {}, {}]), () => {}) }));

const { default: Layout } = await import("../../src/components/Layout");
const { default: StudentArea } = await import("../../src/pages/student/StudentArea");
const { default: TeacherArea } = await import("../../src/pages/teacher/TeacherArea");
const { default: AdminArea } = await import("../../src/pages/admin/AdminArea");

const as = (role) => ({
  enabled: true,
  loading: false,
  user: role ? { uid: "u", email: "u@test.dev" } : null,
  profile: role ? { role, name: "User" } : null,
  profileStatus: role ? "ready" : "none",
  logout: vi.fn(async () => {}),
});
const publicSite = [<Route key="p" path="*" element={<Layout />} />];
const header = () => document.querySelector(".site-header");

describe("public header", () => {
  it("signed out: public nav + log in + sign up, no account or staff links", () => {
    state.value = as(null);
    renderAt("/", publicSite);
    const h = within(header());
    for (const label of [kg.common.nav.programma, kg.common.nav.resources, kg.common.nav.career]) expect(h.getByText(label)).toBeTruthy();
    expect(h.getAllByText(kg.auth.login).length).toBeGreaterThan(0);
    expect(h.getAllByText(kg.auth.signupCta).length).toBeGreaterThan(0);
    expect(h.queryByText(kg.auth.logout)).toBeNull();
    expect(header().innerHTML).not.toContain(ROUTES.teacher.base);
    expect(header().innerHTML).not.toContain(ROUTES.admin.base);
  });

  it.each([
    ["student", "/cabinet", kg.auth.dashboard],
    ["teacher", ROUTES.teacher.home, kg.staff.panel],
    ["admin", ROUTES.admin.home, kg.staff.panel],
  ])("signed-in %s sees one link to their own area and no logout", (role, href, label) => {
    state.value = as(role);
    renderAt("/", publicSite);
    const links = [...header().querySelectorAll(`a[href="${href}"]`)];
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].textContent).toBe(label);
    expect(within(header()).queryByText(kg.auth.signupCta)).toBeNull();
    expect(within(header()).queryByText(kg.auth.logout)).toBeNull();
  });

  it("mobile menu toggles open and closed", () => {
    state.value = as(null);
    renderAt("/", publicSite);
    const toggle = header().querySelector(".nav-toggle");
    const nav = header().querySelector(".nav-links");
    expect(nav.classList.contains("open")).toBe(false);
    fireEvent.click(toggle);
    expect(nav.classList.contains("open")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(nav.classList.contains("open")).toBe(false);
  });
});

describe("role sidebars only show that role's navigation", () => {
  const sidebar = () => document.querySelector(".shell-sidebar").textContent;

  it("student", () => {
    state.value = as("student");
    renderAt("/cabinet", [<Route key="s" path="/cabinet/*" element={<StudentArea />} />]);
    for (const l of [kg.shell.nav.overview, kg.shell.nav.lessons, kg.homework.mine, kg.shell.nav.profile]) expect(sidebar()).toContain(l);
    for (const l of [kg.teacher.tabs.pending, kg.teacher.tabs.students, kg.admin.users]) expect(sidebar()).not.toContain(l);
    expect(sidebar()).toContain(kg.shell.toSite);
  });

  it("teacher (with live pending badge)", () => {
    state.value = as("teacher");
    renderAt(ROUTES.teacher.base, [<Route key="t" path={`${ROUTES.teacher.base}/*`} element={<TeacherArea />} />]);
    for (const l of [kg.teacher.tabs.pending, kg.teacher.tabs.recent, kg.teacher.tabs.students]) expect(sidebar()).toContain(l);
    for (const l of [kg.admin.users, kg.shell.nav.lessons, kg.shell.toSite]) expect(sidebar()).not.toContain(l);
    expect(document.querySelector(".shell-badge").textContent).toBe("3");
  });

  it("admin", () => {
    state.value = as("admin");
    renderAt(ROUTES.admin.base, [<Route key="a" path={`${ROUTES.admin.base}/*`} element={<AdminArea />} />]);
    for (const l of [kg.admin.users, kg.admin.submissions]) expect(sidebar()).toContain(l);
    for (const l of [kg.teacher.tabs.pending, kg.shell.nav.lessons, kg.shell.toSite]) expect(sidebar()).not.toContain(l);
  });

  it.each([
    ["student", "/cabinet", StudentArea, ROUTES.login],
    ["teacher", ROUTES.teacher.base, TeacherArea, ROUTES.teacher.login],
    ["admin", ROUTES.admin.base, AdminArea, ROUTES.admin.login],
  ])("%s logout goes to that role's login page", async (role, base, Area, login) => {
    state.value = as(role);
    renderAt(base, [<Route key="x" path={`${base}/*`} element={<Area />} />, <Route key="l" path={login} element={<p>login</p>} />]);
    fireEvent.click(screen.getByRole("button", { name: kg.auth.logout }));
    await screen.findByText("login");
    expect(state.value.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location").textContent).toBe(login);
  });
});
