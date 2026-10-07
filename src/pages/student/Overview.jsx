import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useProgress } from "../../auth/useProgress";
import { useI18n } from "../../i18n/I18nContext";
import { LESSONS, groupByMonthAndWeek } from "../../data/lessons";
import { ShellHead } from "../../components/AppShell";
import ProgressBar from "../../components/ProgressBar";
import { Loading } from "../../components/AsyncState";
import { ROUTES } from "../../lib/routes";
import MySubmissions from "./MySubmissions";

const MONTHS = Object.entries(groupByMonthAndWeek()).map(([month, weeks]) => [month, Object.values(weeks).flat()]);

export default function StudentOverview() {
  const { t, pick } = useI18n();
  const { profile, user } = useAuth();
  const { ready, isDone, count } = useProgress();

  const next = LESSONS.find((l) => !isDone(l.id));

  return (
    <>
      <ShellHead title={t("shell.hello", { name: profile.name || user.email })} lead={t("dashboard.lead")} />

      {!ready ? (
        <Loading />
      ) : (
        <div className="overview-grid">
          <section className="panel panel-highlight">
            <h2 className="panel-title">{t("dashboard.next")}</h2>
            {next ? (
              <>
                <p className="next-lesson">
                  <span className="muted">{t("lesson.lessonLabel", { n: next.id })}</span>
                  <strong>{pick(next, "title")}</strong>
                </p>
                <Link className="btn btn-primary" to={ROUTES.student.lesson(next.id)}>
                  {t("dashboard.continue")}
                </Link>
              </>
            ) : (
              <p>{t("dashboard.allDone")}</p>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">{t("dashboard.overall")}</h2>
            <ProgressBar value={count} total={LESSONS.length} label={t("dashboard.overall")} />
            <p className="progress-label">{t("dashboard.lessonsDone", { done: count, total: LESSONS.length })}</p>
            <div className="month-progress-list">
              {MONTHS.map(([month, lessons]) => {
                const done = lessons.filter((l) => isDone(l.id)).length;
                return (
                  <div className="month-progress" key={month}>
                    <div className="month-progress-head">
                      <span>{t(`programma.months.${month}.tag`)}</span>
                      <span className="num-cell">
                        {done}/{lessons.length}
                      </span>
                    </div>
                    <ProgressBar value={done} total={lessons.length} label={t(`programma.months.${month}.tag`)} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel panel-wide">
            <div className="panel-title-row">
              <h2 className="panel-title">{t("homework.recent")}</h2>
              <Link to={ROUTES.student.homework}>{t("common.viewAll")}</Link>
            </div>
            <MySubmissions limit={3} />
          </section>
        </div>
      )}
    </>
  );
}
