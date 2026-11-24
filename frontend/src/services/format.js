export function fmtDuration(sec = 0) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${r}s`;
  return `${r}s`;
}
export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString() : '—');
