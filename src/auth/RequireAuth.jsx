import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useI18n } from "../i18n/I18nContext";

export const STAFF_ROLES = ["teacher", "admin"];

// roles: optional list; when set, the signed-in user's profile.role must be in it
export default function RequireAuth({ children, roles }) {
  const { user, profile, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles) {
    if (!profile) return null;
    if (!roles.includes(profile.role)) {
      return (
        <section className="tight">
          <div className="container">
            <p className="form-error">{t("teacher.forbidden")}</p>
          </div>
        </section>
      );
    }
  }
  return children;
}
