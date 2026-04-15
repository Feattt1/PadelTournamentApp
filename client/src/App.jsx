import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import SelectorClub from './pages/SelectorClub';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Campeonatos from './pages/Campeonatos';
import CampeonatoDetalle from './pages/CampeonatoDetalle';
import MisInscripciones from './pages/MisInscripciones';
import MiPerfil from './pages/MiPerfil';
import AdminCampeonatos from './pages/admin/AdminCampeonatos';
import AdminCampeonatoEditar from './pages/admin/AdminCampeonatoEditar';
import AdminPartidos from './pages/admin/AdminPartidos';
import AdminGestionarPartidos from './pages/admin/AdminGestionarPartidos';
import AdminHorarios from './pages/admin/AdminHorarios';
import AdminJugadores from './pages/admin/AdminJugadores';
import AdminParejas from './pages/admin/AdminParejas';
import AdminClubs from './pages/admin/AdminClubs';
import { useAuth } from './context/AuthContext';
import { useClub } from './context/ClubContext';

function isAdminOfClub(user, club) {
  if (!user || !club) return false;
  return user.rol === 'ADMIN' || (user.clubsAdmin || []).includes(club.id);
}

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  const { club } = useClub();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdminOfClub(user, club)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { club } = useClub();
  
  if (!club) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
        <header className="text-white shadow-md border-b border-slate-200" style={{ backgroundColor: '#000' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Championship Padel
              </span>
            </h1>
          </div>
        </header>
        <main className="flex-1">
          <SelectorClub />
        </main>
        <footer className="bg-slate-900 text-white py-8 mt-auto border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-sm">
            <p>© {new Date().getFullYear()} Championship Padel</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="campeonatos" element={<Campeonatos />} />
        <Route path="campeonatos/:id" element={<CampeonatoDetalle />} />

        <Route path="login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="mi-perfil" element={
          <PrivateRoute>
            <MiPerfil />
          </PrivateRoute>
        } />
        <Route path="mis-inscripciones" element={
          <PrivateRoute>
            <MisInscripciones />
          </PrivateRoute>
        } />

        <Route path="admin/campeonatos" element={
          <PrivateRoute adminOnly>
            <AdminCampeonatos />
          </PrivateRoute>
        } />
        <Route path="admin/jugadores" element={
          <PrivateRoute adminOnly>
            <AdminJugadores />
          </PrivateRoute>
        } />
        <Route path="admin/parejas" element={
          <PrivateRoute adminOnly>
            <AdminParejas />
          </PrivateRoute>
        } />
        <Route path="admin/clubs" element={
          <PrivateRoute adminOnly>
            <AdminClubs />
          </PrivateRoute>
        } />
        <Route path="admin/campeonatos/nuevo" element={
          <PrivateRoute adminOnly>
            <AdminCampeonatoEditar />
          </PrivateRoute>
        } />
        <Route path="admin/campeonatos/:id" element={
          <PrivateRoute adminOnly>
            <AdminCampeonatoEditar />
          </PrivateRoute>
        } />
        <Route path="admin/campeonatos/:id/partidos" element={
          <PrivateRoute adminOnly>
            <AdminPartidos />
          </PrivateRoute>
        } />
        <Route path="admin/campeonatos/:id/gestionar-partidos" element={
          <PrivateRoute adminOnly>
            <AdminGestionarPartidos />
          </PrivateRoute>
        } />
        <Route path="admin/campeonatos/:id/horarios" element={
          <PrivateRoute adminOnly>
            <AdminHorarios />
          </PrivateRoute>
        } />
      </Route>
    </Routes>
  );
}
