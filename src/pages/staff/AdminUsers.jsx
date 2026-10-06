import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { formatDate } from "./format";

const ROLES = ["student", "teacher", "admin"];

function RoleSelect({ user, isSelf }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const change = async (role) => {
    if (role === user.role) return;
    if (!confirm(t("admin.confirmRole", { name: user.name, role: t(`roles.${role}`) }))) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.id), { role });
    } catch (err) {
      console.error(err);
      setError(t("homework.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <select
        className={`role-select role-${user.role}`}
        value={user.role}
        // Admins can't demote themselves — it would lock everyone out of this page
        disabled={saving || isSelf}
        title={isSelf ? t("admin.selfLocked") : undefined}
        aria-label={t("teacher.role")}
        onChange={(e) => change(e.target.value)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}`)}
          </option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
    </>
  );
}

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(
    () =>
      onSnapshot(collection(db, "users"), (snap) =>
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const counts = useMemo(() => {
    const c = { all: users?.length ?? 0 };
    for (const u of users ?? []) c[u.role] = (c[u.role] ?? 0) + 1;
    return c;
  }, [users]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? [])
      .filter((u) => roleFilter === "all" || u.role === roleFilter)
      .filter((u) => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  }, [users, search, roleFilter]);

  return (
    <>
      <div className="staff-head">
        <h1>{t("admin.usersTitle")}</h1>
        <p className="muted">{t("admin.usersLead")}</p>
      </div>

      <div className="staff-stats">
        {["all", ...ROLES].map((r) => (
          <button
            key={r}
            type="button"
            className={`staff-stat${roleFilter === r ? " active" : ""}`}
            onClick={() => setRoleFilter(r)}
          >
            <strong>{counts[r] ?? 0}</strong>
            <span>{r === "all" ? t("admin.all") : t(`roles.${r}`)}</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        className="staff-search"
        placeholder={t("admin.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {users && (
        <div className="table-wrap">
          <table className="cmd-table students-table">
            <thead>
              <tr>
                <th>{t("teacher.student")}</th>
                <th>{t("teacher.role")}</th>
                <th>{t("teacher.joined")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    {u.id === me.uid && <span className="muted"> ({t("admin.you")})</span>}
                    <br />
                    <span className="muted">{u.email}</span>
                  </td>
                  <td>
                    <RoleSelect user={u} isSelf={u.id === me.uid} />
                  </td>
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
