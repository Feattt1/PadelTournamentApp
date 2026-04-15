import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { usuario, token } = await authApi.login(email, password);
      login(usuario, token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h1>
          <p className="text-slate-500">Iniciá sesión en tu cuenta</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-yellow-400 focus:outline-none text-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-yellow-400 focus:outline-none text-slate-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold disabled:opacity-50 transition"
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="text-xs text-slate-400">O</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          <p className="text-center text-slate-600 text-sm">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-yellow-600 hover:text-yellow-700 font-semibold">
              Registrate aquí
            </Link>
          </p>
        </div>

        <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-1">Demo</p>
          <p className="text-xs text-slate-500 font-mono">admin@torneos.local / admin123</p>
        </div>
      </div>
    </div>
  );
}
