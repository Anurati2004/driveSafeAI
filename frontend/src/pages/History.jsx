import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import { fmtDuration, fmtDateTime } from '../services/format';

export default function History() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/sessions').then((r) => setRows(r.data.sessions)).catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert-box">{error}</div>;
  if (!rows) return <p className="muted">Loading history…</p>;

  return (
    <>
      <h1>Monitoring history</h1>
      <div className="card table-wrap">
        {rows.length === 0 ? (
          <p className="muted">No sessions recorded yet. <Link to="/monitor">Start monitoring.</Link></p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Duration</th><th>Blinks</th><th>Alerts</th><th /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDateTime(s.start_time)}</td><td>{fmtDuration(s.duration)}</td>
                  <td>{s.total_blinks}</td>
                  <td><span className={`pill ${s.total_alerts ? 'warn' : 'ok'}`}>{s.total_alerts}</span></td>
                  <td><Link to={`/history/${s.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
