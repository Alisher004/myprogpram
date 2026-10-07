import { useI18n } from "../i18n/I18nContext";
import { ROUTES } from "../lib/routes";
import ProgramList from "../components/ProgramList";

export default function Programma() {
  const { t } = useI18n();

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
          <ProgramList lessonHref={ROUTES.lesson} />
        </div>
      </section>
    </>
  );
}
