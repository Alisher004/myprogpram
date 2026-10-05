import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import kg from "./kg.json";
import ru from "./ru.json";

const DICTS = { kg, ru };
const STORAGE_KEY = "site-lang";

const I18nContext = createContext(null);

function readSavedLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved in DICTS ? saved : "kg";
  } catch {
    return "kg";
  }
}

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readSavedLang);

  useEffect(() => {
    document.documentElement.lang = lang === "ru" ? "ru" : "ky";
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, [lang]);

  // t("lesson.monthLabel", { n: 2 }) → "2-ай"
  const t = useCallback(
    (key, vars) => {
      let text = lookup(DICTS[lang], key) ?? lookup(DICTS.kg, key) ?? key;
      if (vars) text = text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
      return text;
    },
    [lang]
  );

  // pick(lesson, "title") → lesson.title_kg / lesson.title_ru
  const pick = useCallback((obj, field) => obj[`${field}_${lang}`] ?? obj[`${field}_kg`], [lang]);

  const value = useMemo(() => ({ lang, setLang, t, pick }), [lang, t, pick]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
