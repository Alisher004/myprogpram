import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";

// Sends Firebase's standard reset email. The success message is the same whether or
// not the address has an account (see sendPasswordReset), so the form can't be used
// to discover registered emails.
export default function PasswordResetForm({ initialEmail = "", onBack }) {
  const { t } = useI18n();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const errorText = (code) => {
    const key = `auth.errors.${code}`;
    const text = t(key);
    return text === key ? t("auth.errors.default") : text;
  };

  const { run, pending } = useAsyncAction(async () => {
    setError("");
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorText(err?.code));
    }
  });

  return (
    <>
      <h1>{t("auth.reset.title")}</h1>
      <p className="auth-lead">{t("auth.reset.lead")}</p>

      {sent ? (
        <p className="auth-notice" role="status">
          {t("auth.reset.sent")}
        </p>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <label htmlFor="reset-email">
            {t("auth.email")}
            <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={pending} aria-busy={pending}>
            {pending ? t("common.wait") : t("auth.reset.submit")}
          </button>
        </form>
      )}

      <button type="button" className="link-button" onClick={onBack}>
        {t("auth.reset.back")}
      </button>
    </>
  );
}
