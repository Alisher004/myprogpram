import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { useI18n } from "../../i18n/I18nContext";
import { watchPendingSubmissions } from "../../data/submissions";
import { ROUTES } from "../../lib/routes";

export default function TeacherArea() {
  const { t } = useI18n();
  const [pending, setPending] = useState(0);
  useEffect(() => watchPendingSubmissions((items) => setPending(items.length)), []);

  const nav = [
    { to: ROUTES.teacher.home, label: t("shell.nav.overview"), icon: "home", end: true },
    { to: ROUTES.teacher.queue, label: t("teacher.tabs.pending"), icon: "inbox", badge: pending },
    { to: ROUTES.teacher.submissions, label: t("teacher.tabs.recent"), icon: "list" },
    { to: ROUTES.teacher.students, label: t("teacher.tabs.students"), icon: "users" },
  ];
  return <AppShell area="teacher" nav={nav} />;
}
