import { createContext, useContext, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const store = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const login = async (email, password) => store((await api.post('/auth/login', { email, password })).data);
  const register = async (name, email, password) =>
    store((await api.post('/auth/register', { name, email, password })).data);
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user && !!localStorage.getItem('token'), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
