import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { ROUTES, homeFor } from "../lib/routes";
import Logo from "./Logo";
import LanguageSelect from "./LanguageSelect";
import ErrorBoundary from "./ErrorBoundary";

// Public navigation only. The logo links home; account areas have their own sidebars.
const NAV = [
  { to: ROUTES.program, key: "programma" },
  { to: ROUTES.resources, key: "resources" },
  { to: ROUTES.career, key: "career" },
];

// Signed out: log in + sign up. Signed in: one entry point to your own area.
function AccountActions() {
  const { t } = useI18n();
  const { enabled, loading, user, profile } = useAuth();
  if (!enabled || loading) return null;
  if (user && profile) {
    return (
      <Link to={homeFor(profile.role)} className="btn btn-primary btn-sm">
        {t(profile.role === "student" ? "auth.dashboard" : "staff.panel")}
      </Link>
    );
  }
  return (
    <>
      <Link to={ROUTES.login} className="btn btn-ghost btn-sm">
        {t("auth.login")}
      </Link>
      <Link to={ROUTES.register} className="btn btn-primary btn-sm">
        {t("auth.signupCta")}
      </Link>
    </>
  );
}

function Header() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="container nav">
        <Link to={ROUTES.home} className="brand" aria-label={t("common.brand")}>
          <Logo />
        </Link>
        <nav className={`nav-links${open ? " open" : ""}`} aria-label={t("common.mainNav")}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              // lesson pages belong to the Программа section
              className={({ isActive }) =>
                isActive || (item.key === "programma" && pathname.startsWith("/lesson/")) ? "active" : undefined
              }
            >
              {t(`common.nav.${item.key}`)}
            </NavLink>
          ))}
          {/* On phones the account buttons live inside the ☰ menu */}
          <div className="nav-account nav-account-mobile">
            <AccountActions />
          </div>
        </nav>
        <div className="nav-right">
          <LanguageSelect />
          <div className="nav-account nav-account-desktop">
            <AccountActions />
          </div>
          <button className="nav-toggle" aria-label={t("common.menu")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-top">
          <Logo tagline />
          <nav aria-label={t("common.footerNav")}>
            <Link to={ROUTES.home}>{t("common.nav.home")}</Link>
            {NAV.map((item) => (
              <Link key={item.to} to={item.to}>
                {t(`common.nav.${item.key}`)}
              </Link>
            ))}
          </nav>
        </div>
        <p className="fine">
          {t("common.copyright")} · Талипжанов Алишер
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <main>
        <ErrorBoundary resetKey={pathname} inline>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  );
}
