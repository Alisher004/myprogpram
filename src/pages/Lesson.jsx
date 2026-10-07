import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { getLesson } from "../data/lessons";
import Playground from "../components/Playground";
import HomeworkSubmit from "../components/HomeworkSubmit";
import { useAuth } from "../auth/AuthContext";
import { useProgress } from "../auth/useProgress";
import { useAsyncAction } from "../hooks/useAsyncAction";
import { ROUTES } from "../lib/routes";

function hasPlayground(pg) {
  return pg && (pg.html || pg.css || pg.js);
}

function Video({ url }) {
  const { t } = useI18n();
  return (
    <div className="lesson-block">
      <h3>{t("lesson.video")}</h3>
      <div className="video-frame">
        {url ? (
          <iframe src={url} allowFullScreen loading="lazy" title="video" />
        ) : (
          <div className="video-placeholder">
            <div className="icon">🎬</div>
            <p>{t("lesson.videoSoon")}</p>
          </div>
        )}
      </div>
      {url && (
        <p style={{ textAlign: "center", margin: "10px 0 0", fontSize: "0.85rem" }}>
          <a href={url.replace("/embed/", "/watch?v=")} target="_blank" rel="noopener">
            {t("lesson.videoFallback")}
          </a>
        </p>
      )}
    </div>
  );
}

function DoneButton({ lessonId }) {
  const { t } = useI18n();
  const { enabled, user, role } = useAuth();
  const { ready, isDone, toggle } = useProgress();
  const { run, pending } = useAsyncAction(() => toggle(lessonId));
  if (!enabled) return null;
  if (!user) {
    return (
      <Link className="done-hint" to={ROUTES.login} state={{ from: ROUTES.student.lesson(lessonId) }}>
        {t("progress.loginToTrack")}
      </Link>
    );
  }
  // Progress belongs to students only; staff browsing a lesson see the content alone
  if (role !== "student" || !ready) return null;
  const done = isDone(lessonId);
  return (
    <button
      type="button"
      className={`btn ${done ? "btn-done" : "btn-primary"}`}
      aria-pressed={done}
      disabled={pending}
      aria-busy={pending}
      onClick={run}
    >
      {t(done ? "progress.done" : "progress.markDone")}
    </button>
  );
}

function NavCard({ lesson, dir, className, href }) {
  const { t, pick } = useI18n();
  if (!lesson) return <div className="lesson-nav-empty" />;
  return (
    <Link className={className} to={href(lesson.id)}>
      <span className="dir">{t(`lesson.${dir}`)}</span>
      <span className="ttl">{pick(lesson, "title")}</span>
    </Link>
  );
}

// Rendered on the public site (/lesson/:id) and inside the student cabinet;
// lessonHref/backHref keep navigation within whichever area it was opened from.
export default function Lesson({ lessonHref = ROUTES.lesson, backHref = ROUTES.program, inShell = false }) {
  const { t, pick, lang } = useI18n();
  const id = Number.parseInt(useParams().id, 10);
  const lesson = getLesson(id);
  const title = lesson && pick(lesson, "title");

  useEffect(() => {
    document.title = lesson ? `${lesson.id}. ${title} — КодБилим` : "КодБилим";
  }, [lesson, title]);

  if (!lesson) {
    return (
      <Frame inShell={inShell}>
        <p>
          {t("lesson.notFound")} <Link to={backHref}>{t(inShell ? "lesson.backToLessons" : "lesson.back")}</Link>
        </p>
      </Frame>
    );
  }

  const guideHtml = lesson[`guide_${lang}_html`] ?? lesson.guide_kg_html;

  return (
    <Frame inShell={inShell}>
        <Link to={backHref} className="back-link">
          {t(inShell ? "lesson.backToLessons" : "lesson.back")}
        </Link>

        <div className="lesson-detail-head">
          <div className="lesson-crumb">
            <span className="eyebrow" style={{ marginBottom: 0 }}>
              {t("lesson.lessonLabel", { n: lesson.id })}
            </span>
            <span style={{ color: "var(--text-soft)", fontSize: "0.9rem" }}>
              {t("lesson.monthLabel", { n: lesson.month })} · {t("lesson.weekLabel", { n: lesson.week })}
            </span>
          </div>
          <h1>{title}</h1>
        </div>

        {!lesson.exam && <Video url={lesson.video} />}

        <div className="lesson-block homework">
          <h3>{t("lesson.homework")}</h3>
          <p>{pick(lesson, "homework")}</p>
          <HomeworkSubmit lessonId={lesson.id} />
        </div>

        {guideHtml && (
          <div className="lesson-block">
            <h3>{t("lesson.guide")}</h3>
            {/* Lesson guides are authored HTML from our own data file */}
            <div className="guide-content" dangerouslySetInnerHTML={{ __html: guideHtml }} />
          </div>
        )}

        {hasPlayground(lesson.playground) && (
          <Playground key={lesson.id} lessonId={lesson.id} playground={lesson.playground} />
        )}

        {lesson.links?.length > 0 && (
          <div className="lesson-block" style={{ display: "block" }}>
            <h3>{t("lesson.links")}</h3>
            <div className="links-inline">
              {lesson.links.map((link, i) => (
                <a key={i} className="link" href={link.href} target="_blank" rel="noopener">
                  {pick(link, "l")}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="lesson-done">
          <DoneButton lessonId={lesson.id} />
        </div>

        <div className="lesson-nav">
          <NavCard lesson={getLesson(id - 1)} dir="prev" href={lessonHref} />
          <NavCard lesson={getLesson(id + 1)} dir="next" className="next" href={lessonHref} />
        </div>
    </Frame>
  );
}

function Frame({ inShell, children }) {
  if (inShell) return <div className="lesson-page">{children}</div>;
  return (
    <section className="tight">
      <div className="container lesson-page">{children}</div>
    </section>
  );
}
