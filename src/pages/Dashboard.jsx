import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useProgress } from "../auth/useProgress";
import { useI18n } from "../i18n/I18nContext";
import { LESSONS, getLesson, groupByMonthAndWeek } from "../data/lessons";
import { watchMySubmissions } from "../data/submissions";
import { StatusBadge } from "../components/HomeworkSubmit";

const MONTHS = Object.entries(groupByMonthAndWeek()).map(([month, weeks]) => [month, Object.values(weeks).flat()]);

function ProgressBar({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function MySubmissions({ uid }) {
  const { t, pick } = useI18n();
  const [items, setItems] = useState(null);
  useEffect(() => watchMySubmissions(uid, setItems), [uid]);
  if (!items) return null;
  return (
    <div className="lesson-block">
      <h3>{t("homework.mine")}</h3>
      {items.length === 0 ? (
        <p className="muted">{t("homework.none")}</p>
      ) : (
        <ul className="my-submissions">
          {items.map((s) => (
            <li key={s.id}>
              <Link to={`/lesson/${s.lessonId}`}>
                {t("lesson.lessonLabel", { n: s.lessonId })}: {pick(getLesson(s.lessonId), "title")}
              </Link>
              <span className="my-submissions-meta">
                {s.grade != null && <strong>{s.grade}/5</strong>}
                <StatusBadge status={s.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t, pick } = useI18n();
  const { profile, user } = useAuth();
  const { ready, isDone, count } = useProgress();

  const next = LESSONS.find((l) => !isDone(l.id));
  const name = profile?.name || user.email;

  return (
    <section className="tight">
      <div className="container" style={{ maxWidth: "840px" }}>
        <div className="section-head" style={{ marginBottom: "24px" }}>
          <h1>{t("dashboard.hello", { name })}</h1>
          <p>{t("dashboard.lead")}</p>
        </div>

        {ready && (
          <>
            <div className="lesson-block">
              <h3>{t("dashboard.overall")}</h3>
              <ProgressBar value={count} total={LESSONS.length} />
              <p className="progress-label">{t("dashboard.lessonsDone", { done: count, total: LESSONS.length })}</p>
            </div>

            <div className="lesson-block homework">
              <h3>{t("dashboard.next")}</h3>
              {next ? (
                <>
                  <p>
                    <strong>{t("lesson.lessonLabel", { n: next.id })}:</strong> {pick(next, "title")}
                  </p>
                  <Link className="btn btn-primary" to={`/lesson/${next.id}`}>
                    {t("dashboard.continue")}
                  </Link>
                </>
              ) : (
                <p>{t("dashboard.allDone")}</p>
              )}
            </div>

            <MySubmissions uid={user.uid} />

            <div className="lesson-block">
              <h3>{t("dashboard.byMonth")}</h3>
              {MONTHS.map(([month, lessons]) => {
                const done = lessons.filter((l) => isDone(l.id)).length;
                return (
                  <div className="month-progress" key={month}>
                    <div className="month-progress-head">
                      <span>{t(`programma.months.${month}.tag`)} · {t(`programma.months.${month}.title`)}</span>
                      <span>
                        {done}/{lessons.length}
                      </span>
                    </div>
                    <ProgressBar value={done} total={lessons.length} />
                  </div>
                );
              })}
              <Link to="/programma" style={{ display: "inline-block", marginTop: "12px", fontWeight: 600 }}>
                {t("dashboard.toProgram")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
