import { useI18n } from "../../i18n/I18nContext";
import { ShellHead } from "../../components/AppShell";
import MySubmissions from "./MySubmissions";

export default function StudentHomework() {
  const { t } = useI18n();
  return (
    <>
      <ShellHead title={t("homework.mine")} lead={t("homework.mineLead")} />
      <section className="panel">
        <MySubmissions />
      </section>
    </>
  );
}
