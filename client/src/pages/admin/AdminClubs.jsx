import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clubsApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';
import { useAuth } from '../../context/AuthContext';

export default function AdminClubs() {
  const { club, clubs, loadClubs, selectClub, clearClub } = useClub();
  const { user } = useAuth();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [asignando, setAsignando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [emailAdmin, setEmailAdmin] = useState({});
  const [adminsPorClub, setAdminsPorClub] = useState({});

  const esAdminPlataforma = user?.rol === 'ADMIN';

  useEffect(() => {
    if (esAdminPlataforma && clubs.length > 0) {
      Promise.all(clubs.map((c) => clubsApi.listAdmins(c.id).catch(() => [])))
        .then((listas) => {
          const obj = {};
          clubs.forEach((c, i) => { obj[c.id] = listas[i] || []; });
          setAdminsPorClub(obj);
        });
    }
  }, [clubs, esAdminPlataforma]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreando(true);
    try {
      await clubsApi.create(nombre.trim());
      setNombre('');
      setMostrarForm(false);
      loadClubs();
    } catch (err) {
      setError(err.message || 'Error al crear club');
    } finally {
      setCreando(false);
    }
  };

  const handleEliminar = async (c) => {
    if (!confirm(`¿Eliminar el club "${c.nombre}"? Los campeonatos, jugadores y parejas del club quedarán sin club asignado.`)) return;
    setEliminando(c.id);
    try {
      await clubsApi.delete(c.id);
      if (club?.id === c.id) {
        const otros = clubs.filter((x) => x.id !== c.id);
        if (otros.length > 0) selectClub(otros[0]);
        else clearClub();
      }
      loadClubs();
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  const handleAsignarAdmin = async (clubId) => {
    const email = (emailAdmin[clubId] || '').trim();
    if (!email) return;
    setAsignando(clubId);
    try {
      await clubsApi.assignAdmin(clubId, email);
      setEmailAdmin((prev) => ({ ...prev, [clubId]: '' }));
      const list = await clubsApi.listAdmins(clubId);
      setAdminsPorClub((prev) => ({ ...prev, [clubId]: list }));
    } catch (err) {
      alert(err.message || 'Error al asignar admin');
    } finally {
      setAsignando(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clubes</h1>
        <Link to="/admin/campeonatos" className="text-blue-600 hover:underline text-sm">
          ← Volver a campeonatos
        </Link>
      </div>

      <p className="text-slate-600 mb-6">
        {esAdminPlataforma
          ? 'Como admin de plataforma puedes crear clubes y asignar admins a cada uno.'
          : 'Eres admin del club actual. Solo puedes gestionar los datos de tu(s) club(es).'}
      </p>

      {esAdminPlataforma && (
        <div className="mb-6">
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
          >
            {mostrarForm ? 'Cancelar' : '+ Nuevo club'}
          </button>
        </div>
      )}

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-xl border border-slate-200 max-w-md">
          <h2 className="text-xl font-semibold mb-4">Crear club</h2>
          {error && <div className="p-3 rounded-lg bg-red-100 text-red-700 mb-4">{error}</div>}
          <div className="flex gap-2">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del club"
              required
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300"
            />
            <button
              type="submit"
              disabled={creando}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {creando ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {clubs.map((c) => (
          <div key={c.id} className="p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <span className="font-medium text-lg">{c.nombre}</span>
              {esAdminPlataforma && (
                <div className="flex gap-2 items-center">
                  <input
                    type="email"
                    placeholder="Email del usuario a asignar como admin"
                    value={emailAdmin[c.id] || ''}
                    onChange={(e) => setEmailAdmin((p) => ({ ...p, [c.id]: e.target.value }))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm w-64"
                  />
                  <button
                    type="button"
                    onClick={() => handleAsignarAdmin(c.id)}
                    disabled={asignando === c.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-sm hover:bg-slate-500 disabled:opacity-50"
                  >
                    {asignando === c.id ? '...' : 'Asignar admin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(c)}
                    disabled={eliminando === c.id}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm hover:bg-red-200 disabled:opacity-50"
                  >
                    {eliminando === c.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              )}
            </div>
            {adminsPorClub[c.id]?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">Admins: </span>
                {adminsPorClub[c.id].map((a) => (
                  <span key={a.id} className="text-sm text-slate-700 mr-2">
                    {a.usuario?.nombre} ({a.usuario?.email})
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
