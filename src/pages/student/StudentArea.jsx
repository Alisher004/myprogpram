import AppShell from "../../components/AppShell";
import { useI18n } from "../../i18n/I18nContext";
import { ROUTES } from "../../lib/routes";

export default function StudentArea() {
  const { t } = useI18n();
  const nav = [
    { to: ROUTES.student.home, label: t("shell.nav.overview"), icon: "home", end: true },
    { to: ROUTES.student.lessons, label: t("shell.nav.lessons"), icon: "book" },
    { to: ROUTES.student.homework, label: t("homework.mine"), icon: "task" },
    { to: ROUTES.student.profile, label: t("shell.nav.profile"), icon: "user" },
  ];
  // Students also use the public site (resources, career), so keep a way back
  return <AppShell area="student" nav={nav} footer={{ to: ROUTES.home, label: t("shell.toSite"), icon: "external" }} />;
}
