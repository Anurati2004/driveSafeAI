import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext.jsx';
import { errMsg } from '../services/api';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); navigate('/'); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">Drive<span>Safe</span> AI</div>
        <h2>Log in</h2>
        {error && <div className="alert-box">{error}</div>}
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted small">No account? <Link to="/register">Create one</Link></p>
      </form>
    </div>
  );
}
