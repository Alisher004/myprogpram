import { useI18n } from "../i18n/I18nContext";

// Shared loading / error / empty states for data-driven pages
export function Loading() {
  const { t } = useI18n();
  return (
    <p className="state-line" role="status">
      <span className="spinner" aria-hidden="true" /> {t("common.loading")}
    </p>
  );
}

export function LoadError() {
  const { t } = useI18n();
  return (
    <p className="form-error" role="alert">
      {t("common.loadError")}
    </p>
  );
}

export function Empty({ title, hint, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {action}
    </div>
  );
}
