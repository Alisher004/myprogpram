import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../auth/AuthContext";
import { STAFF_ROLES } from "../auth/RequireAuth";

const NAV = [
  { to: "/", key: "home" },
  { to: "/programma", key: "programma" },
  { to: "/resources", key: "resources" },
  { to: "/career", key: "career" },
];

function Brand() {
  const { t } = useI18n();
  return (
    <>
      <span className="dot"></span>
      <span>{t("common.brand")}</span>
    </>
  );
}

function AuthControls() {
  const { t } = useI18n();
  const { enabled, user, profile, loading, logout } = useAuth();
  if (!enabled || loading) return null;
  if (!user) {
    return (
      <Link to="/login" className="btn btn-primary btn-sm">
        {t("auth.login")}
      </Link>
    );
  }
  return (
    <>
      {STAFF_ROLES.includes(profile?.role) && (
        <Link to="/teacher" className={`btn btn-sm btn-staff role-${profile.role}`}>
          {t("staff.panel")} · {t(`roles.${profile.role}`)}
        </Link>
      )}
      <Link to="/dashboard" className="btn btn-primary btn-sm">
        {t("auth.dashboard")}
      </Link>
      <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
        {t("auth.logout")}
      </button>
    </>
  );
}

function Header() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="site-header">
      <div className="container nav">
        <Link to="/" className="brand">
          <Brand />
        </Link>
        <button className="nav-toggle" aria-label={t("common.menu")} onClick={() => setOpen((o) => !o)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav className={`nav-links${open ? " open" : ""}`}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              // lesson pages belong to the Программа section
              className={({ isActive }) =>
                isActive || (item.key === "programma" && pathname.startsWith("/lesson/")) ? "active" : undefined
              }
              onClick={() => setOpen(false)}
            >
              {t(`common.nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="nav-right">
          <AuthControls />
          <div className="lang-toggle">
            {["kg", "ru"].map((code) => (
              <button key={code} className={lang === code ? "active" : undefined} onClick={() => setLang(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
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
          <div className="brand">
            <Brand />
          </div>
          <nav>
            {NAV.map((item) => (
              <Link key={item.to} to={item.to}>
                {t(`common.nav.${item.key}`)}
              </Link>
            ))}
          </nav>
        </div>
        <p className="fine">{t("common.copyright")}</p>
        <p className="fine" style={{ marginTop: "4px" }}>
          Талипжанов Алишер
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
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
