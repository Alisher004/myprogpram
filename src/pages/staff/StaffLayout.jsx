import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { watchPendingSubmissions } from "../../data/submissions";
import Logo from "../../components/Logo";

function usePendingCount() {
  const [count, setCount] = useState(0);
  useEffect(() => watchPendingSubmissions((items) => setCount(items.length)), []);
  return count;
}

function SideLink({ to, children, badge }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `staff-link${isActive ? " active" : ""}`}>
      <span>{children}</span>
      {badge > 0 && <span className="staff-badge">{badge}</span>}
    </NavLink>
  );
}

// Separate shell for teachers/admins: own sidebar, colours and top bar,
// so it's always obvious you're in the staff workspace and not the student site.
export default function StaffLayout() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, logout } = useAuth();
  const pending = usePendingCount();
  const role = profile.role;

  return (
    <div className={`staff staff-${role}`}>
      <aside className="staff-sidebar">
        <Link to="/teacher" className="staff-brand">
          <Logo size="sm" sub={t("staff.workspace")} />
        </Link>

        <nav className="staff-nav">
          <p className="staff-nav-title">{t("staff.teaching")}</p>
          <SideLink to="/teacher" badge={pending}>
            {t("teacher.tabs.pending")}
          </SideLink>
          <SideLink to="/teacher/submissions">{t("teacher.tabs.recent")}</SideLink>
          <SideLink to="/teacher/students">{t("teacher.tabs.students")}</SideLink>

          {role === "admin" && (
            <>
              <p className="staff-nav-title">{t("staff.administration")}</p>
              <SideLink to="/admin">{t("admin.users")}</SideLink>
            </>
          )}
        </nav>

        <Link to="/" className="staff-back">
          {t("staff.backToSite")}
        </Link>
      </aside>

      <div className="staff-main">
        <header className="staff-topbar">
          <div className="staff-user">
            <span className={`role-chip role-${role}`}>{t(`roles.${role}`)}</span>
            <span className="staff-user-name">{profile.name || user.email}</span>
          </div>
          <div className="staff-topbar-actions">
            <div className="lang-toggle">
              {["kg", "ru"].map((code) => (
                <button key={code} className={lang === code ? "active" : undefined} onClick={() => setLang(code)}>
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
              {t("auth.logout")}
            </button>
          </div>
        </header>

        <main className="staff-content">
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
