import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campeonatosApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';

const ESTADOS = { INSCRIPCIONES: 'Inscripciones', EN_CURSO: 'En curso', FINALIZADO: 'Finalizado' };

export default function AdminCampeonatos() {
  const { club } = useClub();
  const [campeonatos, setCampeonatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eliminando, setEliminando] = useState(null);

  const cargar = () => {
    setLoading(true);
    campeonatosApi.list()
      .then(setCampeonatos)
      .catch(() => setCampeonatos([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, [club?.id]);

  const handleEliminar = async (c) => {
    if (!confirm(`¿Eliminar el campeonato "${c.nombre}"? Se borrarán todas las inscripciones, grupos y partidos asociados.`)) return;
    setEliminando(c.id);
    try {
      await campeonatosApi.delete(c.id);
      setCampeonatos((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Administrar campeonatos</h1>
        <div className="flex gap-2">
          <Link to="/admin/jugadores" className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm">
            Jugadores
          </Link>
          <Link to="/admin/parejas" className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm">
            Parejas
          </Link>
          <Link to="/admin/clubs" className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm">
            Clubes
          </Link>
          <Link
          to="/admin/campeonatos/nuevo"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition"
        >
          Nuevo campeonato
        </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Cargando...</div>
      ) : campeonatos.length === 0 ? (
        <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-600">
          No hay campeonatos. Crea uno nuevo.
        </div>
      ) : (
        <div className="space-y-4">
          {campeonatos.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl shadow border border-slate-200"
            >
              <div>
                <h3 className="font-semibold text-lg">{c.nombre}</h3>
                <p className="text-sm text-slate-500">
                  {c.modalidad} — Categoría {c.categoria}ª • {formatDate(c.fechaInicio)} - {formatDate(c.fechaFin)}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {c._count?.inscripciones ?? 0} inscripciones
                  {c.maxParejas && ` / ${c.maxParejas}`}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                c.estado === 'INSCRIPCIONES' ? 'bg-green-100 text-green-700' :
                c.estado === 'EN_CURSO' ? 'bg-blue-100 text-blue-700' :
                c.estado === 'FINALIZADO' ? 'bg-slate-100 text-slate-600' :
                'bg-amber-100 text-amber-700'
              }`}>
                {ESTADOS[c.estado] || c.estado}
              </span>
              <div className="flex gap-2 items-center">
                <Link
                  to={`/admin/campeonatos/${c.id}`}
                  className="px-3 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-sm"
                >
                  Editar
                </Link>
                <Link
                  to={`/admin/campeonatos/${c.id}/partidos`}
                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm"
                >
                  Partidos
                </Link>
                <button
                  onClick={() => handleEliminar(c)}
                  disabled={eliminando === c.id}
                  className="px-3 py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium text-sm disabled:opacity-50"
                >
                  {eliminando === c.id ? '...' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
