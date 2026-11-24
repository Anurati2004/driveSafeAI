import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import api, { errMsg } from '../services/api';
import { fmtDuration, fmtDateTime } from '../services/format';
import StatCard from '../components/StatCard.jsx';

function Chart({ title, data, dataKey, color }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid stroke="#1f2f5c" vertical={false} />
          <XAxis dataKey="label" stroke="#8b9ac8" fontSize={12} />
          <YAxis stroke="#8b9ac8" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#111c3d', border: '1px solid #1f2f5c' }} cursor={{ fill: '#1a2850' }} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard', { params: { tz_offset: new Date().getTimezoneOffset() } })
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)));
  }, []);

  if (error) return <div className="alert-box">{error}</div>;
  if (!data) return <p className="muted">Loading dashboard…</p>;
  const { totals, recent, weekly } = data;

  return (
    <>
      <h1>Dashboard</h1>
      <div className="grid4">
        <StatCard label="Monitoring sessions" value={totals.sessions} />
        <StatCard label="Total monitoring time" value={fmtDuration(totals.duration)} />
        <StatCard label="Total blinks" value={totals.blinks} />
        <StatCard label="Drowsiness alerts" value={totals.alerts} tone={totals.alerts ? 'warn' : ''} />
      </div>
      <div className="grid2">
        <Chart title="Minutes monitored (last 7 days)" data={weekly} dataKey="minutes" color="#3b82f6" />
        <Chart title="Drowsiness alerts (last 7 days)" data={weekly} dataKey="alerts" color="#f59e0b" />
      </div>
      <div className="card">
        <h3>Recent activity</h3>
        {recent.length === 0 ? (
          <p className="muted">No sessions yet. <Link to="/monitor">Start your first monitoring session.</Link></p>
        ) : (
          <table>
            <thead><tr><th>Started</th><th>Duration</th><th>Blinks</th><th>Alerts</th><th /></tr></thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id}>
                  <td>{fmtDateTime(s.start_time)}</td><td>{fmtDuration(s.duration)}</td>
                  <td>{s.total_blinks}</td><td>{s.total_alerts}</td>
                  <td><Link to={`/history/${s.id}`}>Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
