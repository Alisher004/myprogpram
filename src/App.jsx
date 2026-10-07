import { Suspense } from "react";
import { Link, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import Career from "./pages/Career";
import LoginPage from "./pages/auth/LoginPage";
import RequireRole, { PageLoader } from "./auth/RequireRole";
import { useI18n } from "./i18n/I18nContext";
import { ROUTES } from "./lib/routes";
import { lazyWithReload } from "./lib/chunkRecovery";

// Pages that pull in the 60-lesson data file or Firestore queries load on demand.
// lazyWithReload: a chunk missing after a deploy triggers one automatic reload.
const Programma = lazyWithReload(() => import("./pages/Programma"));
const Lesson = lazyWithReload(() => import("./pages/Lesson"));

const StudentArea = lazyWithReload(() => import("./pages/student/StudentArea"));
const StudentOverview = lazyWithReload(() => import("./pages/student/Overview"));
const StudentLessons = lazyWithReload(() => import("./pages/student/Lessons"));
const StudentLesson = lazyWithReload(() => import("./pages/student/LessonView"));
const StudentHomework = lazyWithReload(() => import("./pages/student/Homework"));
const StudentProfile = lazyWithReload(() => import("./pages/student/Profile"));

const TeacherArea = lazyWithReload(() => import("./pages/teacher/TeacherArea"));
const TeacherOverview = lazyWithReload(() => import("./pages/teacher/Overview"));
const Submissions = lazyWithReload(() => import("./pages/teacher/Submissions"));
const Students = lazyWithReload(() => import("./pages/teacher/Students"));

const AdminArea = lazyWithReload(() => import("./pages/admin/AdminArea"));
const AdminOverview = lazyWithReload(() => import("./pages/admin/Overview"));
const AdminUsers = lazyWithReload(() => import("./pages/admin/Users"));

const lazyPage = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

// Each area: role guard → its own shell → its pages
const area = (role, Shell) => (
  <RequireRole role={role}>{lazyPage(<Shell />)}</RequireRole>
);

// Old static URLs (lesson.html?id=5) keep working after the migration
function LegacyLessonRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={ROUTES.lesson(params.get("id") || 1)} replace />;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <section>
      <div className="container">
        <p>{t("common.notFound")}</p>
        <Link to={ROUTES.home}>{t("common.backHome")}</Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path={ROUTES.program} element={lazyPage(<Programma />)} />
        <Route path="/lesson/:id" element={lazyPage(<Lesson />)} />
        <Route path={ROUTES.resources} element={<Resources />} />
        <Route path={ROUTES.career} element={<Career />} />
        <Route path={ROUTES.login} element={<LoginPage portal="student" />} />
        <Route path={ROUTES.register} element={<LoginPage portal="student" initialMode="signup" />} />

        <Route path="/dashboard" element={<Navigate to={ROUTES.student.home} replace />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/programma.html" element={<Navigate to={ROUTES.program} replace />} />
        <Route path="/resources.html" element={<Navigate to={ROUTES.resources} replace />} />
        <Route path="/career.html" element={<Navigate to={ROUTES.career} replace />} />
        <Route path="/lesson.html" element={<LegacyLessonRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Student cabinet */}
      <Route path={ROUTES.student.base} element={area("student", StudentArea)}>
        <Route index element={<StudentOverview />} />
        <Route path="lessons" element={<StudentLessons />} />
        <Route path="lessons/:id" element={<StudentLesson />} />
        <Route path="homework" element={<StudentHomework />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Staff portals: login pages sit outside the guarded area */}
      <Route path={ROUTES.teacher.login} element={<LoginPage portal="teacher" />} />
      <Route path={ROUTES.teacher.base} element={area("teacher", TeacherArea)}>
        <Route index element={<TeacherOverview />} />
        <Route path="queue" element={<Submissions mode="pending" />} />
        <Route path="submissions" element={<Submissions mode="recent" />} />
        <Route path="students" element={<Students />} />
      </Route>

      <Route path={ROUTES.admin.login} element={<LoginPage portal="admin" />} />
      <Route path={ROUTES.admin.base} element={area("admin", AdminArea)}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="submissions" element={<Submissions mode="recent" readOnly />} />
      </Route>
    </Routes>
  );
}
