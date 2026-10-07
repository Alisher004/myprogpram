import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../auth/AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { ShellHead } from "../../components/AppShell";
import { Empty, LoadError, Loading } from "../../components/AsyncState";
import { formatDate } from "../../lib/format";
import { ROLES } from "../../lib/routes";

function RoleSelect({ user, isSelf }) {
  const { t } = useI18n();
  const [error, setError] = useState("");

  const { run: change, pending } = useAsyncAction(async (role) => {
    if (role === user.role) return;
    if (!confirm(t("admin.confirmRole", { name: user.name, role: t(`roles.${role}`) }))) return;
    setError("");
    try {
      await updateDoc(doc(db, "users", user.id), { role });
    } catch (err) {
      console.error(err);
      setError(t("homework.error"));
    }
  });

  return (
    <>
      <select
        id={`role-${user.id}`}
        className={`role-select role-${user.role}`}
        value={user.role}
        // Admins can't change their own role (also enforced by Firestore rules)
        disabled={pending || isSelf}
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
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export default function AdminUsers() {
  const { t, lang } = useI18n();
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(
    () =>
      onSnapshot(
        collection(db, "users"),
        (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setFailed(true)
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
      <ShellHead title={t("admin.usersTitle")} lead={t("admin.usersLead")} />

      <div className="filter-bar">
        <div className="segmented" role="tablist" aria-label={t("teacher.role")}>
          {["all", ...ROLES].map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={roleFilter === r}
              className={roleFilter === r ? "active" : undefined}
              onClick={() => setRoleFilter(r)}
            >
              {r === "all" ? t("admin.all") : t(`roles.${r}`)} <span className="segmented-count">{counts[r] ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          id="user-search"
          type="search"
          className="input search-input"
          placeholder={t("admin.search")}
          aria-label={t("admin.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {failed ? (
        <LoadError />
      ) : !users ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Empty title={t("admin.noMatches")} />
      ) : (
        <div className="table-wrap card table-card">
          <table className="cmd-table data-table">
            <thead>
              <tr>
                <th>{t("admin.user")}</th>
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
