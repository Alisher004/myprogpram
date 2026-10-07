import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { getLesson } from "../../data/lessons";
import { watchMySubmissions } from "../../data/submissions";
import { StatusBadge } from "../../components/HomeworkSubmit";
import { Empty, LoadError, Loading } from "../../components/AsyncState";
import { ROUTES } from "../../lib/routes";

// limit: show only the latest N (overview); omit for the full list
export default function MySubmissions({ limit }) {
  const { t, pick } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => watchMySubmissions(user.uid, setItems, () => setFailed(true)), [user.uid]);

  if (failed) return <LoadError />;
  if (!items) return <Loading />;
  if (items.length === 0) {
    return (
      <Empty
        title={t("homework.none")}
        hint={t("homework.noneHint")}
        action={
          <Link className="btn btn-outline btn-sm" to={ROUTES.student.lessons}>
            {t("shell.nav.lessons")}
          </Link>
        }
      />
    );
  }

  const shown = limit ? [...items].sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0)).slice(0, limit) : items;
  return (
    <ul className="row-list">
      {shown.map((s) => (
        <li key={s.id}>
          <Link className="row-main" to={ROUTES.student.lesson(s.lessonId)}>
            <strong>{t("lesson.lessonLabel", { n: s.lessonId })}</strong>
            <span className="muted">{pick(getLesson(s.lessonId) ?? {}, "title")}</span>
          </Link>
          {s.grade != null && <strong className="grade">{s.grade}/5</strong>}
          <StatusBadge status={s.status} />
        </li>
      ))}
    </ul>
  );
}
