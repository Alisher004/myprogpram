import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { LESSONS, getLesson } from "../data/lessons";
import { reviewSubmission, watchPendingSubmissions, watchRecentSubmissions } from "../data/submissions";
import { StatusBadge } from "../components/HomeworkSubmit";

function formatDate(ts, lang) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleString(lang === "ru" ? "ru-RU" : "ky-KG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function Students() {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "progress")),
      getDocs(collection(db, "submissions")),
    ]).then(([users, progress, submissions]) => {
      const done = Object.fromEntries(progress.docs.map((d) => [d.id, Object.keys(d.data().completed ?? {}).length]));
      const subs = {};
      for (const d of submissions.docs) subs[d.data().uid] = (subs[d.data().uid] ?? 0) + 1;
      setData(
        users.docs
          .map((d) => ({ id: d.id, ...d.data(), done: done[d.id] ?? 0, subs: subs[d.id] ?? 0 }))
          .sort((a, b) => b.done - a.done)
      );
    });
  }, []);

  if (!data) return null;
  if (!data.length) return <p className="muted">{t("teacher.noStudents")}</p>;
  return (
    <div className="table-wrap">
      <table className="cmd-table students-table">
        <thead>
          <tr>
            <th>{t("teacher.student")}</th>
            <th>{t("teacher.role")}</th>
            <th>{t("teacher.progress")}</th>
            <th>{t("teacher.submissions")}</th>
            <th>{t("teacher.joined")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id}>
              <td>
                <strong>{u.name}</strong>
                <br />
                <span className="muted">{u.email}</span>
              </td>
              <td>{u.role}</td>
              <td>
                {u.done}/{LESSONS.length}
              </td>
              <td>{u.subs}</td>
              <td>{formatDate(u.createdAt, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = ["pending", "recent", "students"];

export default function Teacher() {
  const { t } = useI18n();
  const [tab, setTab] = useState("pending");
  const watchers = useMemo(() => ({ pending: watchPendingSubmissions, recent: watchRecentSubmissions }), []);

  return (
    <section className="tight">
      <div className="container">
        <div className="section-head" style={{ marginBottom: "24px" }}>
          <h1>{t("teacher.title")}</h1>
          <p>{t("teacher.lead")}</p>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? "active" : undefined}
              onClick={() => setTab(key)}
            >
              {t(`teacher.tabs.${key}`)}
            </button>
          ))}
        </div>

        {tab === "students" ? <Students /> : <SubmissionList key={tab} watch={watchers[tab]} />}
      </div>
    </section>
  );
}
