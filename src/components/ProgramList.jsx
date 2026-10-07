import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { groupByMonthAndWeek } from "../data/lessons";
import { useProgress } from "../auth/useProgress";

const MONTHS = groupByMonthAndWeek();

// The 60-lesson accordion. Used on the public program page and in the student cabinet;
// lessonHref decides where a lesson opens (public page vs. inside the cabinet).
export default function ProgramList({ lessonHref }) {
  const { t, pick } = useI18n();
  const { isDone } = useProgress();

  return Object.entries(MONTHS).map(([month, weeks]) => (
    <div className="month-block" id={`month${month}`} key={month}>
      <div className="month-head">
        <div>
          <span className="tag">{t(`programma.months.${month}.tag`)}</span>
          <h2>{t(`programma.months.${month}.title`)}</h2>
          <p>{t(`programma.months.${month}.project`)}</p>
        </div>
      </div>

      {Object.entries(weeks).map(([week, lessons]) => (
        <details className="week" open={week === "1"} key={week}>
          <summary>{t("lesson.weekLabel", { n: week })}</summary>
          <div className="lesson-list">
            {lessons.map((lesson) => {
              const done = isDone(lesson.id);
              return (
                <Link
                  key={lesson.id}
                  className={`lesson${lesson.project ? " project" : ""}${done ? " done" : ""}`}
                  to={lessonHref(lesson.id)}
                >
                  <span className="num" aria-label={done ? t("progress.done") : undefined}>
                    {done ? "✓" : lesson.id}
                  </span>
                  <div className="body">
                    <div className="txt">{pick(lesson, "title")}</div>
                  </div>
                  <span className="chevron" aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  ));
}
