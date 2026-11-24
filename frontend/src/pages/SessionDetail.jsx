import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import { fmtDuration, fmtDateTime, fmtTime } from '../services/format';
import StatCard from '../components/StatCard.jsx';

export default function SessionDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/sessions/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  if (error) return <div className="alert-box">{error}</div>;
  if (!data) return <p className="muted">Loading session…</p>;
  const { session: s, events } = data;

  return (
    <>
      <p><Link to="/history">← Back to history</Link></p>
      <h1>Session on {fmtDateTime(s.start_time)}</h1>
      <div className="grid4">
        <StatCard label="Duration" value={fmtDuration(s.duration)} />
        <StatCard label="Blinks" value={s.total_blinks} />
        <StatCard label="Drowsiness alerts" value={s.total_alerts} tone={s.total_alerts ? 'warn' : ''} />
        <StatCard label="Ended" value={fmtTime(s.end_time)} />
      </div>
      <div className="card">
        <h3>Drowsiness events</h3>
        {events.length === 0 ? <p className="muted">No drowsiness events in this session.</p> : (
          <table>
            <thead><tr><th>Time</th><th>Type</th><th>EAR at alert</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{fmtTime(e.event_time)}</td>
                  <td>{e.event_type.replace(/_/g, ' ')}</td>
                  <td>{e.eye_aspect_ratio ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
