import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { getLesson } from "../../data/lessons";
import { watchPendingSubmissions } from "../../data/submissions";
import { countReviewedBy, countUsersByRole } from "../../data/stats";
import { ShellHead } from "../../components/AppShell";
import StatCard from "../../components/StatCard";
import { Empty, LoadError, Loading } from "../../components/AsyncState";
import { formatDate } from "../../lib/format";
import { ROUTES } from "../../lib/routes";

export default function TeacherOverview() {
  const { t, pick, lang } = useI18n();
  const { user, profile } = useAuth();
  const [pending, setPending] = useState(null);
  const [failed, setFailed] = useState(false);
  const [counts, setCounts] = useState({});

  useEffect(() => watchPendingSubmissions(setPending, () => setFailed(true)), []);
  useEffect(() => {
    Promise.all([countUsersByRole("student"), countReviewedBy(user.uid)])
      .then(([students, reviewed]) => setCounts({ students, reviewed }))
      .catch(() => setCounts({}));
  }, [user.uid]);

  const oldest = pending?.slice(0, 5) ?? [];

  return (
    <>
      <ShellHead
        title={t("shell.hello", { name: profile.name || user.email })}
        lead={t("teacher.overviewLead")}
        action={
          pending?.length > 0 && (
            <Link to={ROUTES.teacher.queue} className="btn btn-primary">
              {t("teacher.startReview")}
            </Link>
          )
        }
      />

      <div className="stat-grid">
        <StatCard label={t("teacher.tabs.pending")} value={pending?.length} to={ROUTES.teacher.queue} tone="attention" />
        <StatCard label={t("teacher.reviewedByMe")} value={counts.reviewed} to={ROUTES.teacher.submissions} />
        <StatCard label={t("teacher.tabs.students")} value={counts.students} to={ROUTES.teacher.students} />
      </div>

      <section className="panel">
        <h2 className="panel-title">{t("teacher.oldestWaiting")}</h2>
        {failed ? (
          <LoadError />
        ) : !pending ? (
          <Loading />
        ) : oldest.length === 0 ? (
          <Empty title={t("teacher.empty")} />
        ) : (
          <ul className="row-list">
            {oldest.map((s) => (
              <li key={s.id}>
                <div className="row-main">
                  <strong>{s.studentName}</strong>
                  <span className="muted">
                    {t("lesson.lessonLabel", { n: s.lessonId })}: {pick(getLesson(s.lessonId) ?? {}, "title")}
                  </span>
                </div>
                <span className="muted">{formatDate(s.submittedAt, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
