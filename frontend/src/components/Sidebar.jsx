import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext.jsx';

const links = [
  ['/', 'Dashboard'],
  ['/monitor', 'Live monitoring'],
  ['/history', 'History'],
  ['/settings', 'Settings'],
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <aside className="sidebar">
      <div className="brand">Drive<span>Safe</span> AI</div>
      <nav>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="muted small">{user?.name}</div>
        <button className="btn ghost" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
      </div>
    </aside>
  );
}
