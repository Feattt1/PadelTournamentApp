import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campeonatosApi } from '../services/api';
import { useClub } from '../context/ClubContext';

const ESTADOS = { INSCRIPCIONES: 'Inscripciones abiertas', EN_CURSO: 'En curso', FINALIZADO: 'Finalizado' };

const estadoBadge = {
  INSCRIPCIONES: 'bg-blue-100 text-blue-700',
  EN_CURSO: 'bg-green-100 text-green-700',
  FINALIZADO: 'bg-slate-100 text-slate-600',
};

export default function Campeonatos() {
  const { club } = useClub();
  const [campeonatos, setCampeonatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ estado: '' });

  useEffect(() => {
    setLoading(true);
    campeonatosApi.list(filtro)
      .then(setCampeonatos)
      .catch(() => setCampeonatos([]))
      .finally(() => setLoading(false));
  }, [club?.id, filtro.estado]);

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Torneos</h1>
        <p className="text-slate-500">{club?.nombre}</p>
      </div>

      {/* Filtro */}
      <div className="mb-8 flex flex-wrap gap-2">
        {['', ...Object.keys(ESTADOS)].map((k) => (
          <button
            key={k}
            onClick={() => setFiltro({ estado: k })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filtro.estado === k
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
            }`}
          >
            {k === '' ? 'Todos' : ESTADOS[k]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Cargando torneos...</div>
      ) : campeonatos.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-xl font-semibold text-slate-700 mb-1">Sin resultados</p>
          <p className="text-slate-500 mb-4">No hay torneos para el filtro seleccionado.</p>
          <button
            onClick={() => setFiltro({ estado: '' })}
            className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition"
          >
            Ver todos
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-slate-500 mb-5">
            {campeonatos.length} torneo{campeonatos.length !== 1 ? 's' : ''}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {campeonatos.map((c) => (
              <Link
                key={c.id}
                to={`/campeonatos/${c.id}`}
                className="group block bg-white rounded-xl border border-slate-200 hover:border-yellow-400 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                <div className="p-5">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mb-3 ${estadoBadge[c.estado] ?? estadoBadge.EN_CURSO}`}>
                    {ESTADOS[c.estado] ?? c.estado}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-yellow-600 transition line-clamp-2">
                    {c.nombre}
                  </h3>
                  {c.categorias?.length > 0 && (
                    <p className="text-xs text-slate-500 mb-3">
                      {c.categorias.map((cat) => cat.nombre || `${cat.categoria}ta ${cat.modalidad.charAt(0) + cat.modalidad.slice(1).toLowerCase()}`).join(' · ')}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3 mt-3">
                    <span>{formatDate(c.fechaInicio)} — {formatDate(c.fechaFin)}</span>
                    <span>{c._count?.inscripciones ?? 0} inscriptos</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
