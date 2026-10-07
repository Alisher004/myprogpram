import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { getLesson } from "../../data/lessons";
import { reviewSubmission, watchPendingSubmissions, watchRecentSubmissions } from "../../data/submissions";
import { StatusBadge } from "../../components/HomeworkSubmit";
import { ShellHead } from "../../components/AppShell";
import { Empty, LoadError, Loading } from "../../components/AsyncState";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { formatDate } from "../../lib/format";
import { ROUTES } from "../../lib/routes";

function ReviewForm({ submission }) {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const [grade, setGrade] = useState(submission.grade ?? 0);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState("");

  // Both buttons share one guard: "accept" then "needs work" in quick succession can't both fire
  const { run: save, pending } = useAsyncAction(async (status) => {
    if (!grade) return setError(t("teacher.gradeRequired"));
    setError("");
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
    }
  });

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
        id={`feedback-${submission.id}`}
        rows={3}
        maxLength={2000}
        placeholder={t("teacher.feedbackPlaceholder")}
        aria-label={t("teacher.feedback")}
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="hw-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => save("accepted")}>
          {t("teacher.accept")}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => save("needs_work")}>
          {t("teacher.needsWork")}
        </button>
      </div>
    </div>
  );
}

function SubmissionCard({ submission, readOnly }) {
  const { t, pick, lang } = useI18n();
  const lesson = getLesson(submission.lessonId);
  return (
    <article className="card submission-card">
      <div className="submission-head">
        <div>
          <strong>{submission.studentName}</strong>
          <span className="muted"> · {submission.studentEmail}</span>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      <p className="submission-lesson">
        <Link to={ROUTES.lesson(submission.lessonId)} target="_blank">
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
      {readOnly && submission.grade != null && (
        <p className="submission-note">
          <strong>{t("homework.grade")}: {submission.grade}/5</strong>
          {submission.feedback && ` · ${submission.feedback}`}
        </p>
      )}
      {submission.reviewerName && <p className="muted">{t("teacher.reviewedBy", { name: submission.reviewerName })}</p>}
      {!readOnly && <ReviewForm key={`${submission.id}-${submission.submittedAt?.seconds}`} submission={submission} />}
    </article>
  );
}

// mode: "pending" (review queue) | "recent" (everything, newest first)
// readOnly: admins monitor submissions; grading is the teacher's job
export default function Submissions({ mode, readOnly = false }) {
  const { t } = useI18n();
  const { data: items, failed, retry } = useLiveQuery(
    (next, fail) => (mode === "pending" ? watchPendingSubmissions : watchRecentSubmissions)(next, fail),
    [mode]
  );

  return (
    <>
      <ShellHead title={t(`teacher.tabs.${mode}`)} lead={t(`teacher.lead.${mode}`)} />
      {failed ? (
        <LoadError onRetry={retry} />
      ) : !items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty title={t(mode === "pending" ? "teacher.empty" : "teacher.emptyAll")} />
      ) : (
        <div className="submission-list">
          {items.map((s) => (
            <SubmissionCard key={s.id} submission={s} readOnly={readOnly} />
          ))}
        </div>
      )}
    </>
  );
}
