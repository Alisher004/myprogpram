import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useI18n } from "../../i18n/I18nContext";
import { LESSONS } from "../../data/lessons";
import { ShellHead } from "../../components/AppShell";
import { Empty, LoadError, Loading } from "../../components/AsyncState";
import { formatDate } from "../../lib/format";

export default function Students() {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Teachers may only list student accounts (enforced by Firestore rules too)
    Promise.all([
      getDocs(query(collection(db, "users"), where("role", "==", "student"))),
      getDocs(collection(db, "progress")),
      getDocs(collection(db, "submissions")),
    ])
      .then(([users, progress, submissions]) => {
        const done = Object.fromEntries(progress.docs.map((d) => [d.id, Object.keys(d.data().completed ?? {}).length]));
        const subs = {};
        for (const d of submissions.docs) subs[d.data().uid] = (subs[d.data().uid] ?? 0) + 1;
        setData(
          users.docs
            .map((d) => ({ id: d.id, ...d.data(), done: done[d.id] ?? 0, subs: subs[d.id] ?? 0 }))
            .sort((a, b) => b.done - a.done)
        );
      })
      .catch((err) => {
        console.error(err);
        setFailed(true);
      });
  }, []);

  return (
    <>
      <ShellHead title={t("teacher.tabs.students")} lead={t("teacher.lead.students")} />
      {failed ? (
        <LoadError />
      ) : !data ? (
        <Loading />
      ) : data.length === 0 ? (
        <Empty title={t("teacher.noStudents")} />
      ) : (
        <div className="table-wrap card table-card">
          <table className="cmd-table data-table">
            <thead>
              <tr>
                <th>{t("teacher.student")}</th>
                <th>{t("teacher.progress")}</th>
                <th>{t("teacher.submissions")}</th>
                <th>{t("teacher.joined")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <br />
                    <span className="muted">{u.email}</span>
                  </td>
                  <td className="num-cell">
                    {u.done}/{LESSONS.length}
                  </td>
                  <td className="num-cell">{u.subs}</td>
                  <td>{formatDate(u.createdAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
