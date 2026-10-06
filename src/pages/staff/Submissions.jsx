import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { getLesson } from "../../data/lessons";
import { reviewSubmission, watchPendingSubmissions, watchRecentSubmissions } from "../../data/submissions";
import { StatusBadge } from "../../components/HomeworkSubmit";
import { formatDate } from "./format";

function ReviewForm({ submission }) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const [grade, setGrade] = useState(submission.grade ?? 0);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (status) => {
    if (!grade) return setError(t("teacher.gradeRequired"));
    setError("");
    setSaving(true);
    try {
      await reviewSubmission({
        id: submission.id,
        reviewer: user,
        reviewerName: profile?.name || user.email,
        status,
        grade,
        feedback,
      });
    } catch (err) {
      console.error(err);
      setError(t("homework.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="review-form">
      <div className="grade-picker" role="radiogroup" aria-label={t("teacher.grade")}>
        <span>{t("teacher.grade")}:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={grade === n}
            className={grade === n ? "active" : undefined}
            onClick={() => setGrade(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        maxLength={2000}
        placeholder={t("teacher.feedbackPlaceholder")}
        aria-label={t("teacher.feedback")}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      {error && <p className="form-error">{error}</p>}
      <div className="hw-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => save("accepted")}>
          {t("teacher.accept")}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => save("needs_work")}>
          {t("teacher.needsWork")}
        </button>
      </div>
    </div>
  );
}

function SubmissionCard({ submission }) {
  const { t, pick, lang } = useI18n();
  const lesson = getLesson(submission.lessonId);
  return (
    <div className="card submission-card">
      <div className="submission-head">
        <div>
          <strong>{submission.studentName}</strong>
          <span className="muted"> · {submission.studentEmail}</span>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      <p className="submission-lesson">
        <Link to={`/lesson/${submission.lessonId}`}>
          {t("lesson.lessonLabel", { n: submission.lessonId })}
          {lesson && `: ${pick(lesson, "title")}`}
        </Link>
        <span className="muted">
          {" "}
          · {t("teacher.submitted")}: {formatDate(submission.submittedAt, lang)}
        </span>
      </p>
      <p>
        <a href={submission.url} target="_blank" rel="noopener noreferrer" className="submission-url">
          {submission.url} ↗
        </a>
      </p>
      {submission.note && (
        <p className="submission-note">
          <strong>{t("teacher.note")}:</strong> {submission.note}
        </p>
      )}
      {submission.reviewerName && (
        <p className="muted">{t("teacher.reviewedBy", { name: submission.reviewerName })}</p>
      )}
      <ReviewForm key={`${submission.id}-${submission.submittedAt?.seconds}`} submission={submission} />
    </div>
  );
}

function SubmissionList({ watch }) {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  useEffect(() => watch(setItems), [watch]);
  if (!items) return null;
  if (!items.length) return <p className="muted">{t("teacher.empty")}</p>;
  return (
    <div className="submission-list">
      {items.map((s) => (
        <SubmissionCard key={s.id} submission={s} />
      ))}
    </div>
  );
}

// mode: "pending" (review queue) | "recent" (everything, newest first)
export default function Submissions({ mode }) {
  const { t } = useI18n();
  const watch = mode === "pending" ? watchPendingSubmissions : watchRecentSubmissions;
  return (
    <>
      <div className="staff-head">
        <h1>{t(`teacher.tabs.${mode}`)}</h1>
      </div>
      <SubmissionList key={mode} watch={watch} />
    </>
  );
}
