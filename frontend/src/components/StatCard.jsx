export default function StatCard({ label, value, tone }) {
  return (
    <div className={`card stat ${tone || ''}`}>
      <div className="stat-value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
