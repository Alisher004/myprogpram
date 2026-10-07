import AppShell from "../../components/AppShell";
import { useI18n } from "../../i18n/I18nContext";
import { ROUTES } from "../../lib/routes";

export default function AdminArea() {
  const { t } = useI18n();
  const nav = [
    { to: ROUTES.admin.home, label: t("shell.nav.overview"), icon: "chart", end: true },
    { to: ROUTES.admin.users, label: t("admin.users"), icon: "users" },
    { to: ROUTES.admin.submissions, label: t("admin.submissions"), icon: "list" },
  ];
  return <AppShell area="admin" nav={nav} />;
}
