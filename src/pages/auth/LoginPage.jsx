import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { ROUTES, homeFor } from "../../lib/routes";
import Logo from "../../components/Logo";
import LanguageSelect from "../../components/LanguageSelect";
import { PageLoader } from "../../auth/RequireRole";
import { auth } from "../../lib/firebase";

// portal: which role this form is for. Only the student portal offers sign-up.
function LoginForm({ portal, initialMode }) {
  const { t } = useI18n();
  const { signInWithGoogle, signInWithEmail, signUpStudent } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  const canSignUp = portal === "student";

  const [mode, setMode] = useState(canSignUp ? initialMode : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const errorText = (err) => {
    if (err.code === "app/wrong-portal") return t(`auth.errors.wrongPortal.${portal}`);
    const key = `auth.errors.${err.code}`;
    const text = t(key);
    return text === key ? t("auth.errors.default") : text;
  };

  // One guard for every way of signing in, so a double click can't start two sessions
  const { run, pending } = useAsyncAction(async (action) => {
    setError("");
    try {
      await action();
      // Return to the page that sent us here only if it belongs to this role's area
      const base = homeFor(portal);
      navigate(from && from.startsWith(base) ? from : base, { replace: true });
    } catch (err) {
      setError(errorText(err));
    }
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const email = form.email.trim();
    run(() =>
      mode === "signup"
        ? signUpStudent(form.name.trim(), email, form.password)
        : signInWithEmail(portal, email, form.password)
    );
  };

  const field = (name) => ({
    id: `login-${name}`,
    name,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <>
      <h1>{t(mode === "signup" ? "auth.signupTitle" : `auth.portal.${portal}.title`)}</h1>
      <p className="auth-lead">{t(mode === "signup" ? "auth.signupLead" : `auth.portal.${portal}.lead`)}</p>

      <button type="button" className="btn btn-outline btn-block" disabled={pending} onClick={() => run(() => signInWithGoogle(portal))}>
        {t("auth.google")}
      </button>

      <div className="auth-divider">{t("auth.or")}</div>

      <form className="auth-form" onSubmit={onSubmit} noValidate={false}>
        {mode === "signup" && (
          <label htmlFor="login-name">
            {t("auth.name")}
            <input type="text" required autoComplete="name" maxLength={80} {...field("name")} />
          </label>
        )}
        <label htmlFor="login-email">
          {t("auth.email")}
          <input type="email" required autoComplete="email" {...field("email")} />
        </label>
        <label htmlFor="login-password">
          {t("auth.password")}
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            {...field("password")}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={pending} aria-busy={pending}>
          {pending ? t("common.wait") : t(mode === "signup" ? "auth.submitSignup" : "auth.submitLogin")}
        </button>
      </form>

      {canSignUp && (
        <Link
          className="link-button"
          to={mode === "signup" ? ROUTES.login : ROUTES.register}
          onClick={() => {
            setMode((m) => (m === "signup" ? "login" : "signup"));
            setError("");
          }}
        >
          {t(mode === "signup" ? "auth.toLogin" : "auth.toSignup")}
        </Link>
      )}
    </>
  );
}

export default function LoginPage({ portal = "student", initialMode = "login" }) {
  const { t } = useI18n();
  const { enabled, loading, user, profile, profileStatus, portalPending } = useAuth();

  // Already signed in → go to your own area (whatever portal you opened).
  // While a sign-in from this form is still being checked, keep the form mounted.
  if (!portalPending) {
    if (loading || (user && profileStatus === "loading")) return <PageLoader />;
    // auth.currentUser turns null synchronously on sign-out, before React state catches up
    if (user && profile && auth?.currentUser) return <Navigate to={homeFor(profile.role)} replace />;
  }

  const card = (
    <div className="card auth-card">
      <div className="auth-logo">
        <Logo tone="light" size="lg" tagline={portal === "student"} />
      </div>
      {portal !== "student" && <p className="auth-portal-badge">{t(`roles.${portal}`)}</p>}
      {enabled ? (
        <LoginForm key={initialMode} portal={portal} initialMode={initialMode} />
      ) : (
        <p className="form-error">{t("auth.disabled")}</p>
      )}
    </div>
  );

  if (portal === "student") {
    return (
      <section className="tight">
        <div className="container auth-wrap">{card}</div>
      </section>
    );
  }

  // Staff portals stand alone: no public navigation, just the form
  return (
    <div className="auth-standalone">
      <div className="auth-standalone-bar">
        <LanguageSelect tone="light" />
      </div>
      <main className="auth-wrap">{card}</main>
    </div>
  );
}
