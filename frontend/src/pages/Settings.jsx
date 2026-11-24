import { useEffect, useState } from 'react';
import api, { errMsg } from '../services/api';

const HINT = { low: 'Alert after 2.0 s of continuous eye closure', medium: 'Alert after 1.5 s of continuous eye closure', high: 'Alert after 1.0 s of continuous eye closure' };

export default function Settings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/settings').then((r) => setS(r.data)).catch((e) => setMsg({ type: 'error', text: errMsg(e) }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/settings', s);
      setS(data);
      setMsg({ type: 'ok', text: 'Settings saved. They apply to your next monitoring session.' });
    } catch (err) { setMsg({ type: 'error', text: errMsg(err) }); }
  };

  if (!s) return msg.text ? <div className="alert-box">{msg.text}</div> : <p className="muted">Loading settings…</p>;

  return (
    <>
      <h1>Settings</h1>
      <form className="card settings" onSubmit={save}>
        {msg.text && <div className={msg.type === 'ok' ? 'ok-box' : 'alert-box'}>{msg.text}</div>}
        <label className="row">
          <input type="checkbox" checked={s.alert_enabled} onChange={(e) => setS({ ...s, alert_enabled: e.target.checked })} />
          <span>Play an audio alarm when drowsiness is detected</span>
        </label>
        <p className="muted small">The visual warning always appears, even with audio off.</p>

        <label>Detection sensitivity
          <select value={s.sensitivity} onChange={(e) => setS({ ...s, sensitivity: e.target.value })}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </label>
        <p className="muted small">{HINT[s.sensitivity]}.</p>

        <label>EAR threshold: <strong>{Number(s.ear_threshold).toFixed(3)}</strong>
          <input type="range" min="0.15" max="0.30" step="0.005" value={s.ear_threshold}
                 onChange={(e) => setS({ ...s, ear_threshold: parseFloat(e.target.value) })} />
        </label>
        <p className="muted small">Eyes count as closed below this value. Raise it if closed eyes are missed; lower it if normal blinking or squinting triggers warnings. Typical open-eye EAR is about 0.25–0.35.</p>
        <button className="btn">Save settings</button>
      </form>
    </>
  );
}
