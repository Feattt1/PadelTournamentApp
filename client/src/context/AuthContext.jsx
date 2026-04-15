import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'padel_token';
const USER_KEY = 'padel_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (usuario, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    const { password, ...userData } = usuario;
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
