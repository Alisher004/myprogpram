import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import Career from "./pages/Career";
import { useI18n } from "./i18n/I18nContext";

// Both pages pull in the 60-lesson data file — load it only when needed
const Programma = lazy(() => import("./pages/Programma"));
const Lesson = lazy(() => import("./pages/Lesson"));

// Old static URLs (lesson.html?id=5) keep working after the migration
function LegacyLessonRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={`/lesson/${params.get("id") || 1}`} replace />;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <section>
      <div className="container">
        <p>{t("common.notFound")}</p>
        <Link to="/">{t("common.backHome")}</Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="programma" element={<Suspense><Programma /></Suspense>} />
        <Route path="lesson/:id" element={<Suspense><Lesson /></Suspense>} />
        <Route path="resources" element={<Resources />} />
        <Route path="career" element={<Career />} />

        <Route path="index.html" element={<Navigate to="/" replace />} />
        <Route path="programma.html" element={<Navigate to="/programma" replace />} />
        <Route path="resources.html" element={<Navigate to="/resources" replace />} />
        <Route path="career.html" element={<Navigate to="/career" replace />} />
        <Route path="lesson.html" element={<LegacyLessonRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
