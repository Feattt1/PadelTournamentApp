import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';

function isAdminOfClub(user, club) {
  if (!user || !club) return false;
  return user.rol === 'ADMIN' || (user.clubsAdmin || []).includes(club.id);
}

export default function Layout() {
  const { club, clubs, selectClub } = useClub();
  const [mostrarClubs, setMostrarClubs] = useState(false);
  const { user, logout } = useAuth();
  const esAdminClub = isAdminOfClub(user, club);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="text-white shadow-md border-b border-slate-200" style={{ backgroundColor: '#000' }}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl tracking-wider group">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">Padel</span>
              <span className="hidden sm:inline text-white">Championship</span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-6">
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setMostrarClubs(!mostrarClubs)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium transition text-sm text-white border border-slate-600"
                >
                  {club?.nombre || 'Club'}
                </button>
                {mostrarClubs && (
                  <div className="absolute top-full left-0 mt-2 py-2 bg-white rounded-lg shadow-xl text-slate-900 min-w-[200px] z-50 border border-slate-200">
                    {clubs.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { selectClub(c); setMostrarClubs(false); }}
                        className={`block w-full text-left px-4 py-3 hover:bg-yellow-50 transition text-sm border-b border-slate-100 last:border-0 ${club?.id === c.id ? 'font-bold bg-yellow-100 text-yellow-900' : ''}`}
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Link to="/campeonatos" className="text-white hover:text-yellow-400 transition font-medium text-sm hidden sm:inline">
                Torneos
              </Link>
              
              {user ? (
                <>
                  <Link to="/mi-perfil" className="text-white hover:text-yellow-400 transition font-medium text-sm hidden sm:inline">
                    Perfil
                  </Link>
                  <Link to="/mis-inscripciones" className="text-white hover:text-yellow-400 transition font-medium text-sm hidden md:inline">
                    Mis inscripciones
                  </Link>
                  {esAdminClub && (
                    <div className="relative group hidden sm:block">
                      <button className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold text-sm transition">
                        Admin
                      </button>
                      <div className="absolute right-0 mt-0 w-48 bg-white rounded-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-slate-200 z-50">
                        <Link to="/admin/campeonatos" className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100 font-medium">
                          Campeonatos
                        </Link>
                        <Link to="/admin/jugadores" className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100">
                          Jugadores
                        </Link>
                        <Link to="/admin/parejas" className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100">
                          Parejas
                        </Link>
                        <Link to="/admin/clubs" className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900">
                          Clubes
                        </Link>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-300 hidden md:inline font-medium">{user.nombre}</span>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-lg font-bold transition text-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900"
                    >
                      Salir
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-white hover:text-yellow-400 transition font-medium text-sm hidden sm:inline">
                    Entrar
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-lg font-bold transition text-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-white py-12 mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Padel Championship</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                La plataforma más completa para gestionar torneos de pádel.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 text-yellow-400">Plataforma</h4>
              <ul className="text-slate-400 text-sm space-y-2">
                <li><Link to="/" className="hover:text-yellow-400 transition">Inicio</Link></li>
                <li><Link to="/campeonatos" className="hover:text-yellow-400 transition">Torneos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4 text-yellow-400">Contacto</h4>
              <p className="text-slate-400 text-sm">info@padelchampionship.uy</p>
              <p className="text-slate-500 text-xs mt-4">info@padelchampionship.uy</p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-xs">
            <p>© {new Date().getFullYear()} Padel Championship</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
