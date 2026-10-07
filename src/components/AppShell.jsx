import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { loginFor } from "../lib/routes";
import { PageLoader } from "../auth/RequireRole";
import Logo from "./Logo";
import LanguageSelect from "./LanguageSelect";
import NavIcon from "./NavIcon";

// Signed-in workspace shared by all three roles. Each role passes its own
// navigation; the shell differs per area by tone (student: light sidebar,
// teacher/admin: dark) and by the area label, never by extra colours.
//
// nav: [{ to, label, icon, end?, badge? }]
// footer: optional extra sidebar link, e.g. back to the public site
export default function AppShell({ area, nav, footer }) {
  const { t } = useI18n();
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const { run: signOut, pending: signingOut } = useAsyncAction(async () => {
    await logout();
    navigate(loginFor(area), { replace: true });
  });

  // Close the phone drawer and reset scroll on navigation
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`shell shell-${area}${menuOpen ? " shell-menu-open" : ""}`}>
      <aside className="shell-sidebar" aria-label={t(`shell.${area}.title`)}>
        <div className="shell-brand">
          <Logo tone={area === "student" ? "light" : "dark"} size="sm" sub={t(`shell.${area}.title`)} />
        </div>
        <nav className="shell-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `shell-link${isActive ? " active" : ""}`}>
              <NavIcon name={item.icon} />
              <span className="shell-link-label">{item.label}</span>
              {item.badge > 0 && (
                <span className="shell-badge" aria-label={t("shell.badge", { n: item.badge })}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        {footer && (
          <div className="shell-sidebar-footer">
            <Link to={footer.to} className="shell-link">
              <NavIcon name={footer.icon} />
              <span className="shell-link-label">{footer.label}</span>
            </Link>
          </div>
        )}
      </aside>
      <button type="button" className="shell-scrim" aria-label={t("common.close")} onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1} />

      <div className="shell-main">
        <header className="shell-topbar">
          <button type="button" className="shell-menu-button" aria-label={t("common.menu")} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="shell-user">
            <span className={`role-chip role-${profile.role}`}>{t(`roles.${profile.role}`)}</span>
            <span className="shell-user-name">{profile.name || user.email}</span>
          </div>
          <div className="shell-topbar-actions">
            <LanguageSelect tone="light" />
            <button type="button" className="btn btn-outline btn-sm" disabled={signingOut} onClick={signOut}>
              {t("auth.logout")}
            </button>
          </div>
        </header>

        <main className="shell-content">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Page heading inside a shell: title, optional lead and a primary action on the right
export function ShellHead({ title, lead, action }) {
  return (
    <div className="shell-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="muted">{lead}</p>}
      </div>
      {action}
    </div>
  );
}
