import { Component, useEffect, useRef } from "react";
import { useI18n } from "../i18n/I18nContext";
import { isChunkLoadError } from "../lib/chunkRecovery";

function Fallback({ error, inline, showDetails, onRetry, onReload }) {
  const { t } = useI18n();
  const headingRef = useRef(null);
  // A missing chunk can't be retried in place (React.lazy caches the failure): reload only
  const updated = isChunkLoadError(error);

  // Move keyboard/screen-reader focus to the message
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className={`error-fallback${inline ? " error-fallback-inline" : ""}`} role="alert">
      <h1 ref={headingRef} tabIndex={-1}>
        {t(updated ? "errors.update.title" : "errors.boundary.title")}
      </h1>
      <p>{t(updated ? "errors.update.body" : "errors.boundary.body")}</p>
      <div className="hw-actions">
        {!updated && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            {t("common.retry")}
          </button>
        )}
        <button type="button" className={`btn ${updated ? "btn-primary" : "btn-outline"}`} onClick={onReload}>
          {t("common.reload")}
        </button>
      </div>
      {/* Stack traces only in development: production users never see internals */}
      {showDetails && (
        <details>
          <summary>{t("errors.details")}</summary>
          <pre>{String(error?.stack || error)}</pre>
        </details>
      )}
    </div>
  );
}

// Catches render/lazy-load errors below it and shows a recoverable fallback instead
// of a blank page. `resetKey` (e.g. the pathname) clears the error on navigation,
// so a broken page doesn't keep the rest of the app down. Reloading keeps the
// Firebase session (it lives in IndexedDB), so nobody is signed out.
export default class ErrorBoundary extends Component {
  static defaultProps = {
    showDetails: import.meta.env.DEV,
    reload: () => window.location.reload(),
    inline: false,
  };

  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI error caught by ErrorBoundary", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  retry = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <Fallback
        error={error}
        inline={this.props.inline}
        showDetails={this.props.showDetails}
        onRetry={this.retry}
        onReload={this.props.reload}
      />
    );
  }
}
