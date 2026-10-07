import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { homeFor, loginFor } from "../lib/routes";
import { useAsyncAction } from "../hooks/useAsyncAction";

export function PageLoader() {
  const { t } = useI18n();
  return (
    <div className="page-loader" role="status" aria-busy="true">
      <span className="visually-hidden">{t("common.loading")}</span>
    </div>
  );
}

// Signed in, but the profile can't be used: missing document, no permission,
// network failure or timeout. Retry is offered only where it can help; sign-out
// is always available so nobody is stuck.
function ProfileProblem() {
  const { t } = useI18n();
  const { logout, profileStatus, profileError, retryProfile } = useAuth();
  const { run: signOut, pending } = useAsyncAction(logout);
  const message = profileStatus === "missing" ? t("auth.errors.app/no-profile") : t(`auth.profile.${profileError.kind}`);
  return (
    <div className="state-block" role="alert">
      <p className="form-error">{message}</p>
      <div className="hw-actions">
        {profileError?.retryable && (
          <button type="button" className="btn btn-primary" onClick={retryProfile}>
            {t("common.retry")}
          </button>
        )}
        <button type="button" className="btn btn-outline" disabled={pending} onClick={signOut}>
          {t("auth.logout")}
        </button>
      </div>
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
  if (profileStatus === "missing" || profileStatus === "error") return <ProfileProblem />;
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />;
  return children;
}
