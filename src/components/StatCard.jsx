import { Link } from "react-router-dom";

// One KPI tile. With `to`, the whole tile links to the list behind the number.
export default function StatCard({ label, value, to, tone }) {
  const body = (
    <>
      <span className="stat-value">{value ?? "—"}</span>
      <span className="stat-label">{label}</span>
    </>
  );
  const cls = `stat-card${tone ? ` stat-${tone}` : ""}`;
  return to ? (
    <Link to={to} className={`${cls} stat-link`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
