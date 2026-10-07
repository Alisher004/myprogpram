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

// onRetry: re-run the failed load. The caller swaps this component for <Loading />
// as soon as a retry starts, so repeated clicks can't stack requests.
export function LoadError({ onRetry }) {
  const { t } = useI18n();
  return (
    <div className="load-error" role="alert">
      <p className="form-error">{t("common.loadError")}</p>
      {onRetry && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
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
