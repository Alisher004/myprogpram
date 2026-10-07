import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";

// Shows whether the account email is verified and lets the student resend the link
// or re-check after clicking it. Informational only: nothing is blocked for
// unverified accounts.
export default function EmailVerification() {
  const { t } = useI18n();
  const { emailVerified, resendVerification, refreshEmailVerified } = useAuth();
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  const errorText = (code) => {
    const key = `auth.errors.${code}`;
    const text = t(key);
    return text === key ? t("auth.errors.default") : text;
  };

  // One guard for both buttons: no parallel resend/check requests
  const { run, pending } = useAsyncAction(async (action) => {
    setMessage(null);
    try {
      if (action === "resend") {
        await resendVerification();
        setMessage({ type: "ok", text: t("profile.verify.sent") });
      } else if (!(await refreshEmailVerified())) {
        setMessage({ type: "error", text: t("profile.verify.still") });
      }
    } catch (err) {
      setMessage({ type: "error", text: errorText(err?.code) });
    }
  });

  if (emailVerified) {
    return (
      <p className="verify-status">
        <span className="status-badge status-accepted">{t("profile.verify.verified")}</span>
      </p>
    );
  }

  return (
    <div className="verify-block">
      <p className="verify-status">
        <span className="status-badge status-pending">{t("profile.verify.unverified")}</span>
      </p>
      <div className="hw-actions">
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run("resend")}>
          {t("profile.verify.resend")}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run("check")}>
          {t("profile.verify.check")}
        </button>
      </div>
      {message && (
        <p className={message.type === "ok" ? "form-success" : "form-error"} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
