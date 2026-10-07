import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { ShellHead } from "../../components/AppShell";
import { formatDate } from "../../lib/format";

export default function StudentProfile() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile.name ?? "");
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  const trimmed = name.trim();
  const { run: save, pending } = useAsyncAction(async () => {
    setMessage(null);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: trimmed });
      setMessage({ type: "ok", text: t("profile.saved") });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: t("homework.error") });
    }
  });

  return (
    <>
      <ShellHead title={t("shell.nav.profile")} />
      <section className="panel profile-panel">
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor="profile-name">
            {t("auth.name")}
            <input id="profile-name" type="text" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <dl className="profile-facts">
            <div>
              <dt>{t("auth.email")}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{t("teacher.joined")}</dt>
              <dd>{formatDate(profile.createdAt, lang)}</dd>
            </div>
          </dl>
          {message && (
            <p className={message.type === "ok" ? "form-success" : "form-error"} role="status">
              {message.text}
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primary" disabled={pending || !trimmed || trimmed === profile.name}>
              {pending ? t("common.wait") : t("profile.save")}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
