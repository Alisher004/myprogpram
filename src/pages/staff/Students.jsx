import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useI18n } from "../../i18n/I18nContext";
import { LESSONS } from "../../data/lessons";
import { formatDate } from "./format";

function StudentsTable() {
  const { t, lang } = useI18n();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "progress")),
      getDocs(collection(db, "submissions")),
    ]).then(([users, progress, submissions]) => {
      const done = Object.fromEntries(progress.docs.map((d) => [d.id, Object.keys(d.data().completed ?? {}).length]));
      const subs = {};
      for (const d of submissions.docs) subs[d.data().uid] = (subs[d.data().uid] ?? 0) + 1;
      setData(
        users.docs
          .filter((d) => d.data().role === "student")
          .map((d) => ({ id: d.id, ...d.data(), done: done[d.id] ?? 0, subs: subs[d.id] ?? 0 }))
          .sort((a, b) => b.done - a.done)
      );
    });
  }, []);

  if (!data) return null;
  if (!data.length) return <p className="muted">{t("teacher.noStudents")}</p>;
  return (
    <div className="table-wrap">
      <table className="cmd-table students-table">
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
              <td>
                {u.done}/{LESSONS.length}
              </td>
              <td>{u.subs}</td>
              <td>{formatDate(u.createdAt, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Students() {
  const { t } = useI18n();
  return (
    <>
      <div className="staff-head">
        <h1>{t("teacher.tabs.students")}</h1>
      </div>
      <StudentsTable />
    </>
  );
}
