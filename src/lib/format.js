export function formatDate(ts, lang) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleString(lang === "ru" ? "ru-RU" : "ky-KG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
