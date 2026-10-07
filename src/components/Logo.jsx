import { useI18n } from "../i18n/I18nContext";

// tone="dark": white "Код" for dark backgrounds (header, footer, staff sidebar)
// tone="light": navy "Код", as in the original logo, for light backgrounds
export default function Logo({ tone = "dark", size = "md", tagline = false, sub }) {
  const { t } = useI18n();
  return (
    <span className={`logo logo-${tone} logo-${size}`}>
      <span className="logo-mark">
        <img src="/brand/logo-mark.png" alt="" width="256" height="256" />
      </span>
      <span className="logo-text">
        <span className="wordmark" aria-label={t("common.brand")}>
          <span className="wm-kod">Код</span>
          <span className="wm-bilim">Билим</span>
        </span>
        {tagline && <span className="logo-tagline">{t("common.tagline")}</span>}
        {sub && <span className="logo-sub">{sub}</span>}
      </span>
    </span>
  );
}
