import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDocs } from "firebase/firestore";
import { useI18n } from "../../i18n/I18nContext";
import { countSubmissionsByStatus, countUsersByRole, newestUsersQuery } from "../../data/stats";
import { ShellHead } from "../../components/AppShell";
import StatCard from "../../components/StatCard";
import { LoadError, Loading } from "../../components/AsyncState";
import { formatDate } from "../../lib/format";
import { ROUTES } from "../../lib/routes";

export default function AdminOverview() {
  const { t, lang } = useI18n();
  const [stats, setStats] = useState(null);
  const [newest, setNewest] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      countUsersByRole("student"),
      countUsersByRole("teacher"),
      countUsersByRole("admin"),
      countSubmissionsByStatus("pending"),
      countSubmissionsByStatus("accepted"),
      countSubmissionsByStatus("needs_work"),
      getDocs(newestUsersQuery()),
    ])
      .then(([student, teacher, admin, pending, accepted, needsWork, users]) => {
        setStats({ student, teacher, admin, pending, accepted, needsWork });
        setNewest(users.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((err) => {
        console.error(err);
        setFailed(true);
      });
  }, []);

  if (failed) return <LoadError />;

  return (
    <>
      <ShellHead
        title={t("admin.overviewTitle")}
        lead={t("admin.overviewLead")}
        action={
          <Link to={ROUTES.admin.users} className="btn btn-primary">
            {t("admin.manageUsers")}
          </Link>
        }
      />

      <h2 className="group-title">{t("admin.users")}</h2>
      <div className="stat-grid">
        <StatCard label={t("roles.student")} value={stats?.student} to={ROUTES.admin.users} />
        <StatCard label={t("roles.teacher")} value={stats?.teacher} to={ROUTES.admin.users} />
        <StatCard label={t("roles.admin")} value={stats?.admin} to={ROUTES.admin.users} />
      </div>

      <h2 className="group-title">{t("admin.submissions")}</h2>
      <div className="stat-grid">
        <StatCard label={t("homework.status.pending")} value={stats?.pending} to={ROUTES.admin.submissions} tone="attention" />
        <StatCard label={t("homework.status.accepted")} value={stats?.accepted} to={ROUTES.admin.submissions} />
        <StatCard label={t("homework.status.needs_work")} value={stats?.needsWork} to={ROUTES.admin.submissions} />
      </div>

      <section className="panel">
        <h2 className="panel-title">{t("admin.newestUsers")}</h2>
        {!newest ? (
          <Loading />
        ) : (
          <ul className="row-list">
            {newest.map((u) => (
              <li key={u.id}>
                <div className="row-main">
                  <strong>{u.name}</strong>
                  <span className="muted">{u.email}</span>
                </div>
                <span className={`role-chip role-${u.role}`}>{t(`roles.${u.role}`)}</span>
                <span className="muted">{formatDate(u.createdAt, lang)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
