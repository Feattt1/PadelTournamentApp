import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campeonatosApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';

const ESTADO_CONFIG = {
  INSCRIPCIONES: { label: 'Inscripciones', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  EN_CURSO:      { label: 'En curso',       color: 'bg-green-100 text-green-700 border-green-200' },
  FINALIZADO:    { label: 'Finalizado',     color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

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

  useEffect(() => { cargar(); }, [club?.id]);

  const handleEliminar = async (c) => {
    if (!confirm(`¿Eliminar "${c.nombre}"? Se borrarán todas las inscripciones, grupos y partidos asociados.`)) return;
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
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div>
      {/* Breadcrumb */}
      <p className="text-xs text-slate-400 mb-1">Panel de administración</p>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Torneos</h1>
          {!loading && (
            <p className="text-slate-500 text-sm mt-1">
              {campeonatos.length === 0 ? 'Sin torneos todavía' : `${campeonatos.length} torneo${campeonatos.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <Link
          to="/admin/campeonatos/nuevo"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition shadow-sm"
        >
          + Nuevo torneo
        </Link>
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link to="/" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 hover:border-slate-300 transition">
          ← Inicio
        </Link>
        <Link to="/admin/jugadores" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 hover:border-slate-300 transition">
          Jugadores
        </Link>
        <Link to="/admin/parejas" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 hover:border-slate-300 transition">
          Parejas
        </Link>
        <Link to="/admin/clubs" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 hover:border-slate-300 transition">
          Clubes
        </Link>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : campeonatos.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-4xl mb-4">🏆</p>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">No hay torneos todavía</h2>
          <p className="text-slate-500 text-sm mb-6">Creá el primer torneo para este club.</p>
          <Link
            to="/admin/campeonatos/nuevo"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition"
          >
            + Crear primer torneo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campeonatos.map((c) => {
            const cfg = ESTADO_CONFIG[c.estado] ?? ESTADO_CONFIG.FINALIZADO;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate">{c.nombre}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(c.fechaInicio)} — {formatDate(c.fechaFin)}
                      </p>
                      {(c._count?.inscripciones > 0 || c.categorias?.length > 0) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {c._count?.inscripciones ?? 0} inscripciones
                          {c.categorias?.length > 0 && ` · ${c.categorias.length} categoría${c.categorias.length !== 1 ? 's' : ''}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                    <Link
                      to={`/admin/campeonatos/${c.id}/partidos`}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition"
                    >
                      Gestionar partidos
                    </Link>
                    <Link
                      to={`/admin/campeonatos/${c.id}`}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm transition"
                    >
                      Editar
                    </Link>
                    <Link
                      to={`/campeonatos/${c.id}`}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition"
                    >
                      Ver público
                    </Link>
                    <button
                      onClick={() => handleEliminar(c)}
                      disabled={eliminando === c.id}
                      className="px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm disabled:opacity-40 transition ml-auto"
                    >
                      {eliminando === c.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
