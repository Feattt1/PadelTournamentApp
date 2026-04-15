import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campeonatosApi } from '../services/api';
import { useClub } from '../context/ClubContext';

export default function Home() {
  const { club } = useClub();
  const [campeonatos, setCampeonatos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    campeonatosApi.list({})
      .then(setCampeonatos)
      .catch(() => setCampeonatos([]))
      .finally(() => setLoading(false));
  }, [club?.id]);

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Agrupar campeonatos por estado
  const campeonatosPorEstado = {
    INSCRIPCIONES: campeonatos.filter(c => c.estado === 'INSCRIPCIONES'),
    EN_CURSO: campeonatos.filter(c => c.estado === 'EN_CURSO'),
    FINALIZADO: campeonatos.filter(c => c.estado === 'FINALIZADO'),
  };

  const estadoConfig = {
    INSCRIPCIONES: {
      label: 'Inscripciones Abiertas',
      tagBg: 'bg-blue-100 text-blue-700'
    },
    EN_CURSO: {
      label: 'En Curso',
      tagBg: 'bg-green-100 text-green-700'
    },
    FINALIZADO: {
      label: 'Finalizados',
      tagBg: 'bg-slate-200 text-slate-700'
    },
  };

  const renderizarGrupo = (estado, campeonatos) => {
    if (campeonatos.length === 0) return null;
    const config = estadoConfig[estado];

    return (
      <section key={estado} className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {config.label}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {campeonatos.length} {campeonatos.length === 1 ? 'torneo' : 'torneos'}
            </p>
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campeonatos.map((c) => (
            <Link
              key={c.id}
              to={`/campeonatos/${c.id}`}
              className="group block bg-white rounded-xl border border-slate-200 hover:border-yellow-400 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500" />
              <div className="p-5">
                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mb-3 ${config.tagBg}`}>
                  {config.label}
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
      </section>
    );
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="mb-16 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-black">
          {/* Fondo decorativo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          </div>

          {/* Contenido */}
          <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-20 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Bienvenido a
              <span className="block bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Championship Padel
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              La plataforma completa para gestionar torneos de pádel. 
              Inscripciones, cruces, partidos y horarios en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/campeonatos"
                className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 font-bold rounded-lg hover:shadow-lg hover:shadow-yellow-500/50 transition-all transform hover:scale-105"
              >
                Explorar Torneos →
              </Link>
              <a 
                href="#campeonatos"
                className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-slate-900 transition-all"
              >
                Ir a Torneos ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Estadísticas rápidas */}
      {!loading && campeonatos.length > 0 && (
        <section className="mb-16 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:border-yellow-400 transition text-center">
            <div className="text-3xl font-bold text-slate-900">{campeonatos.length}</div>
            <p className="text-slate-600 text-sm mt-2">Torneos Totales</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:border-yellow-400 transition text-center">
            <div className="text-3xl font-bold text-blue-600">{campeonatosPorEstado.INSCRIPCIONES.length}</div>
            <p className="text-slate-600 text-sm mt-2">En Inscripciones</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:border-yellow-400 transition text-center">
            <div className="text-3xl font-bold text-green-600">{campeonatosPorEstado.EN_CURSO.length}</div>
            <p className="text-slate-600 text-sm mt-2">En Curso</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:border-yellow-400 transition text-center">
            <div className="text-3xl font-bold text-slate-500">{campeonatosPorEstado.FINALIZADO.length}</div>
            <p className="text-slate-600 text-sm mt-2">Finalizados</p>
          </div>
        </section>
      )}

      {/* Sección de torneos */}
      <section id="campeonatos">
        {loading ? (
          <div className="text-slate-500 text-lg py-16 text-center">
            <p>Cargando campeonatos...</p>
          </div>
        ) : campeonatos.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 text-center border-2 border-dashed border-slate-300 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No hay campeonatos disponibles</h2>
            <p className="text-slate-600 mb-6">Vuelve pronto para ver emocionantes torneos de pádel</p>
            <Link 
              to="/campeonatos"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              Explorar todas las secciones →
            </Link>
          </div>
        ) : (
          <>
            {renderizarGrupo('INSCRIPCIONES', campeonatosPorEstado.INSCRIPCIONES)}
            {renderizarGrupo('EN_CURSO', campeonatosPorEstado.EN_CURSO)}
            {renderizarGrupo('FINALIZADO', campeonatosPorEstado.FINALIZADO)}
          </>
        )}
      </section>
    </div>
  );
}
