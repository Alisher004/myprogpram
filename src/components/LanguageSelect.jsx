import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";

const LANGUAGES = [
  { code: "kg", label: "Кыргызча", short: "KG" },
  { code: "ru", label: "Русский", short: "RU" },
];

// tone: "dark" for dark bars (public header), "light" for white top bars (cabinets)
export default function LanguageSelect({ tone = "dark" }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (code) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div className={`lang-select lang-select-${tone}`} ref={rootRef}>
      <button
        type="button"
        className="lang-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("common.language")}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span className="lang-select-full">{current.label}</span>
        <span className="lang-select-short">{current.short}</span>
        <span className="lang-select-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-select-menu" role="listbox" id={listId} aria-label={t("common.language")}>
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button type="button" onClick={() => choose(l.code)}>
                <span>{l.label}</span>
                {l.code === lang && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
