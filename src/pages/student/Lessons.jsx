import { useI18n } from "../../i18n/I18nContext";
import { useProgress } from "../../auth/useProgress";
import { LESSONS } from "../../data/lessons";
import { ShellHead } from "../../components/AppShell";
import ProgramList from "../../components/ProgramList";
import { ROUTES } from "../../lib/routes";

export default function StudentLessons() {
  const { t } = useI18n();
  const { count } = useProgress();
  return (
    <>
      <ShellHead title={t("shell.nav.lessons")} lead={t("dashboard.lessonsDone", { done: count, total: LESSONS.length })} />
      <ProgramList lessonHref={ROUTES.student.lesson} />
    </>
  );
}
