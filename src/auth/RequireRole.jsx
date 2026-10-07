import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { homeFor, loginFor } from "../lib/routes";
import { useAsyncAction } from "../hooks/useAsyncAction";

export function PageLoader() {
  return <div className="page-loader" role="status" aria-busy="true" />;
}

function ProfileMissing() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const { run, pending } = useAsyncAction(logout);
  return (
    <div className="state-block">
      <p className="form-error">{t("auth.errors.app/no-profile")}</p>
      <button type="button" className="btn btn-outline" disabled={pending} onClick={run}>
        {t("auth.logout")}
      </button>
    </div>
  );
}

// UX guard for a role's area. Security is enforced by Firestore rules; this only
// sends people to the right place:
//   signed out          → that area's login form
//   another role        → their own home (a student typing the teacher URL lands in /cabinet)
export default function RequireRole({ role, children }) {
  const { loading, user, profile, profileStatus } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={loginFor(role)} replace state={{ from: location.pathname }} />;
  if (profileStatus === "loading") return <PageLoader />;
  if (profileStatus === "missing") return <ProfileMissing />;
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />;
  return children;
}
