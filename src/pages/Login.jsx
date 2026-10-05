import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";

export default function Login() {
  const { t } = useI18n();
  const { enabled, user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from || "/dashboard";

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={from} replace />;

  const errorText = (code) => {
    const key = `auth.errors.${code}`;
    const text = t(key);
    return text === key ? t("auth.errors.default") : text;
  };

  const run = async (action) => {
    setError("");
    setBusy(true);
    try {
      await action();
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorText(err.code));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    run(() =>
      mode === "signup"
        ? signUpWithEmail(form.name.trim(), form.email.trim(), form.password)
        : signInWithEmail(form.email.trim(), form.password)
    );
  };

  const field = (name) => ({
    name,
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <section className="tight">
      <div className="container auth-wrap">
        <div className="card auth-card">
          <h1>{t(mode === "signup" ? "auth.signupTitle" : "auth.loginTitle")}</h1>
          <p className="auth-lead">{t("auth.loginLead")}</p>

          {!enabled ? (
            <p className="form-error">{t("auth.disabled")}</p>
          ) : (
            <>
              <button type="button" className="btn btn-outline btn-block" disabled={busy} onClick={() => run(signInWithGoogle)}>
                {t("auth.google")}
              </button>

              <div className="auth-divider">{t("auth.or")}</div>

              <form className="auth-form" onSubmit={onSubmit}>
                {mode === "signup" && (
                  <label>
                    {t("auth.name")}
                    <input type="text" required autoComplete="name" {...field("name")} />
                  </label>
                )}
                <label>
                  {t("auth.email")}
                  <input type="email" required autoComplete="email" {...field("email")} />
                </label>
                <label>
                  {t("auth.password")}
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    {...field("password")}
                  />
                </label>

                {error && <p className="form-error">{error}</p>}

                <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                  {t(mode === "signup" ? "auth.submitSignup" : "auth.submitLogin")}
                </button>
              </form>

              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setMode((m) => (m === "signup" ? "login" : "signup"));
                  setError("");
                }}
              >
                {t(mode === "signup" ? "auth.toLogin" : "auth.toSignup")}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
