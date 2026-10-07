import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { isAllowedLink, submitHomework, watchMySubmission } from "../data/submissions";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { ROUTES } from "../lib/routes";

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return <span className={`status-badge status-${status}`}>{t(`homework.status.${status}`)}</span>;
}

export default function HomeworkSubmit({ lessonId }) {
  const { t } = useI18n();
  const { enabled, user, profile, role } = useAuth();
  const [submission, setSubmission] = useState(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const { run: save, pending: saving } = useAsyncAction(async () => {
    try {
      await submitHomework({ user, profile, lessonId, url, note });
      setEditing(false);
    } catch (err) {
      console.error(err);
      setError(t("homework.error"));
    }
  });

  useEffect(() => {
    if (!user || role !== "student") return;
    setSubmission(undefined);
    setEditing(false);
    return watchMySubmission(user.uid, lessonId, setSubmission);
  }, [user, role, lessonId]);

  if (!enabled) return null;
  if (!user) {
    return (
      <Link className="done-hint" to={ROUTES.login} state={{ from: ROUTES.student.lesson(lessonId) }}>
        {t("homework.loginToSubmit")}
      </Link>
    );
  }
  // Only students submit homework; staff viewing a lesson see the task text alone
  if (role !== "student" || submission === undefined) return null;

  const startEdit = () => {
    setUrl(submission?.url ?? "");
    setNote(submission?.note ?? "");
    setError("");
    setEditing(true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!isAllowedLink(url.trim())) return setError(t("homework.badLink"));
    setError("");
    save();
  };

  // Keep the form (disabled, "Жөнөтүлүүдө…") until the server confirms the write —
  // the local snapshot fires earlier, and a reload at that moment would drop it
  if (!submission || editing || saving) {
    return (
      <form className="hw-form" onSubmit={onSubmit}>
        <h4>{t("homework.submitTitle")}</h4>
        <label>
          {t("homework.linkLabel")}
          <input
            type="url"
            required
            placeholder={t("homework.linkPlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label>
          {t("homework.noteLabel")}
          <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="hw-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t("homework.saving") : t(submission ? "homework.resubmit" : "homework.submit")}
          </button>
          {submission && (
            <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
              {t("homework.cancel")}
            </button>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="hw-status">
      <div className="hw-status-head">
        <StatusBadge status={submission.status} />
        {submission.grade != null && (
          <span className="hw-grade">
            {t("homework.grade")}: <strong>{submission.grade}/5</strong>
          </span>
        )}
      </div>
      <p className="hw-link">
        {t("homework.yourLink")}:{" "}
        <a href={submission.url} target="_blank" rel="noopener noreferrer">
          {submission.url}
        </a>
      </p>
      {submission.feedback && (
        <div className="hw-feedback">
          <strong>{t("homework.feedback")}:</strong>
          <p>{submission.feedback}</p>
        </div>
      )}
      {/* An accepted submission is final — resubmitting would wipe the grade */}
      {submission.status !== "accepted" && (
        <button type="button" className="btn btn-outline btn-sm" onClick={startEdit}>
          {t(submission.status === "needs_work" ? "homework.resubmit" : "homework.edit")}
        </button>
      )}
    </div>
  );
}
