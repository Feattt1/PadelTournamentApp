import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';

function isAdminOfClub(user, club) {
  if (!user || !club) return false;
  return user.rol === 'ADMIN' || (user.clubsAdmin || []).includes(club.id);
}

export default function Layout() {
  const { club, clubs, selectClub } = useClub();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const esAdminClub = isAdminOfClub(user, club);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [adminAbierto, setAdminAbierto] = useState(false);
  const [clubAbierto, setClubAbierto] = useState(false);
  const adminRef = useRef(null);
  const clubRef = useRef(null);

  // Cerrar menú mobile al cambiar de ruta
  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (adminRef.current && !adminRef.current.contains(e.target)) setAdminAbierto(false);
      if (clubRef.current && !clubRef.current.contains(e.target)) setClubAbierto(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuAbierto(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="text-white shadow-md border-b border-slate-800 bg-black sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl sm:text-2xl tracking-wider shrink-0">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">Padel</span>
              <span className="text-white">Championship</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-3 sm:gap-5">
              {/* Club selector — desktop */}
              {clubs.length > 1 && (
                <div className="relative" ref={clubRef}>
                  <button
                    onClick={() => setClubAbierto(!clubAbierto)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium text-sm text-white border border-slate-600 transition"
                  >
                    {club?.nombre || 'Club'} ▾
                  </button>
                  {clubAbierto && (
                    <div className="absolute top-full left-0 mt-2 py-2 bg-white rounded-lg shadow-xl text-slate-900 min-w-[200px] z-50 border border-slate-200">
                      {clubs.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { selectClub(c); setClubAbierto(false); }}
                          className={`block w-full text-left px-4 py-3 hover:bg-yellow-50 text-sm border-b border-slate-100 last:border-0 transition ${club?.id === c.id ? 'font-bold bg-yellow-100 text-yellow-900' : ''}`}
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Link to="/campeonatos" className="text-white hover:text-yellow-400 transition font-medium text-sm">
                Torneos
              </Link>

              {user ? (
                <>
                  <Link to="/mi-perfil" className="text-white hover:text-yellow-400 transition font-medium text-sm">
                    Perfil
                  </Link>
                  <Link to="/mis-inscripciones" className="text-white hover:text-yellow-400 transition font-medium text-sm hidden md:inline">
                    Mis inscripciones
                  </Link>

                  {esAdminClub && (
                    <div className="relative" ref={adminRef}>
                      <button
                        onClick={() => setAdminAbierto(!adminAbierto)}
                        className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold text-sm transition"
                      >
                        Admin ▾
                      </button>
                      {adminAbierto && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 border border-slate-200 z-50">
                          <Link to="/admin/campeonatos" onClick={() => setAdminAbierto(false)} className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100 font-medium">Campeonatos</Link>
                          <Link to="/admin/jugadores"   onClick={() => setAdminAbierto(false)} className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100">Jugadores</Link>
                          <Link to="/admin/parejas"     onClick={() => setAdminAbierto(false)} className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100">Parejas</Link>
                          <Link to="/admin/clubs"       onClick={() => setAdminAbierto(false)} className="block px-4 py-3 hover:bg-slate-100 text-sm text-slate-900">Clubes</Link>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg font-bold text-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900 transition"
                  >
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-white hover:text-yellow-400 transition font-medium text-sm">
                    Entrar
                  </Link>
                  <Link to="/register" className="px-4 py-2 rounded-lg font-bold text-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900 transition">
                    Registrarse
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: botón hamburguesa */}
            <button
              className="sm:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-lg hover:bg-slate-800 transition"
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-label="Menú"
            >
              <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuAbierto ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuAbierto ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-white transition-all duration-200 ${menuAbierto ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </nav>

        {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
        {menuAbierto && (
          <div className="sm:hidden bg-slate-900 border-t border-slate-700 px-4 py-4 space-y-1">
            {/* Club selector mobile */}
            {clubs.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Club activo</p>
                <div className="flex flex-wrap gap-2">
                  {clubs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { selectClub(c); setMenuAbierto(false); }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${club?.id === c.id ? 'bg-yellow-400 text-slate-900' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nav links */}
            <Link to="/campeonatos" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 font-medium text-sm transition">
              🏆 Torneos
            </Link>

            {user ? (
              <>
                <Link to="/mi-perfil" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 font-medium text-sm transition">
                  👤 Mi perfil
                </Link>
                <Link to="/mis-inscripciones" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 font-medium text-sm transition">
                  📋 Mis inscripciones
                </Link>

                {esAdminClub && (
                  <>
                    <div className="border-t border-slate-700 my-2" />
                    <p className="text-xs text-yellow-400 uppercase tracking-wider px-3 py-1 font-bold">Admin</p>
                    <Link to="/admin/campeonatos" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 font-medium text-sm transition">
                      🗂 Campeonatos
                    </Link>
                    <Link to="/admin/jugadores" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 text-sm transition">
                      👥 Jugadores
                    </Link>
                    <Link to="/admin/parejas" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 text-sm transition">
                      🤝 Parejas
                    </Link>
                    <Link to="/admin/clubs" className="flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 text-sm transition">
                      🏠 Clubes
                    </Link>
                  </>
                )}

                <div className="border-t border-slate-700 my-2" />
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-slate-400 text-sm">{user.nombre}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg font-bold text-sm bg-yellow-400 hover:bg-yellow-500 text-slate-900 transition"
                  >
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-t border-slate-700 my-2" />
                <div className="flex gap-3 px-3 py-2">
                  <Link to="/login" className="flex-1 text-center py-2.5 rounded-lg border border-slate-600 text-white text-sm font-medium hover:bg-slate-800 transition">
                    Entrar
                  </Link>
                  <Link to="/register" className="flex-1 text-center py-2.5 rounded-lg bg-yellow-400 text-slate-900 text-sm font-bold hover:bg-yellow-500 transition">
                    Registrarse
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white py-8 sm:py-12 mt-10 sm:mt-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="font-bold text-lg mb-3">Padel Championship</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                La plataforma más completa para gestionar torneos de pádel.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 text-yellow-400">Plataforma</h4>
              <ul className="text-slate-400 text-sm space-y-2">
                <li><Link to="/" className="hover:text-yellow-400 transition">Inicio</Link></li>
                <li><Link to="/campeonatos" className="hover:text-yellow-400 transition">Torneos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 text-yellow-400">Contacto</h4>
              <p className="text-slate-400 text-sm">info@padelchampionship.uy</p>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-center text-slate-500 text-xs">
            <p>© {new Date().getFullYear()} Padel Championship</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
