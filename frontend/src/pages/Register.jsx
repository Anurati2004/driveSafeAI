import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext.jsx';
import { errMsg } from '../services/api';

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true); setError('');
    try { await register(form.name, form.email, form.password); navigate('/'); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand">Drive<span>Safe</span> AI</div>
        <h2>Create your account</h2>
        {error && <div className="alert-box">{error}</div>}
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password (8+ characters)<input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="muted small">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
