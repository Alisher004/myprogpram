import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { groupByMonthAndWeek } from "../data/lessons";
import { useProgress } from "../auth/useProgress";

const MONTHS = groupByMonthAndWeek();

export default function Programma() {
  const { t, pick } = useI18n();
  const { isDone } = useProgress();

  return (
    <>
      <section className="hero" style={{ padding: "52px 0" }}>
        <div className="container">
          <span className="eyebrow">{t("programma.eyebrow")}</span>
          <h1>{t("programma.title")}</h1>
          <p>{t("programma.lead")}</p>
        </div>
      </section>

      <section className="tight">
        <div className="container">
          {Object.entries(MONTHS).map(([month, weeks]) => (
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
                    {lessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        className={`lesson${lesson.project ? " project" : ""}${isDone(lesson.id) ? " done" : ""}`}
                        to={`/lesson/${lesson.id}`}
                      >
                        <span className="num">{isDone(lesson.id) ? "✓" : lesson.id}</span>
                        <div className="body">
                          <div className="txt">{pick(lesson, "title")}</div>
                        </div>
                        <span className="chevron">→</span>
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
