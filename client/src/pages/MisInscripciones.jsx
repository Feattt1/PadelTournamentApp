import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inscripcionesApi } from '../services/api';
import { useClub } from '../context/ClubContext';

export default function MisInscripciones() {
  const { club } = useClub();
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    inscripcionesApi.list({}, true)
      .then(setInscripciones)
      .catch(() => setInscripciones([]))
      .finally(() => setLoading(false));
  }, [club?.id]);

  const formatDate = (d) => new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Mis inscripciones</h1>

      {loading ? (
        <div className="text-slate-500">Cargando...</div>
      ) : inscripciones.length === 0 ? (
        <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-600">
          No tienes inscripciones.
          <Link to="/campeonatos" className="block mt-2 text-blue-600 hover:underline">
            Ver campeonatos disponibles
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {inscripciones.map((i) => (
            <Link
              key={i.id}
              to={`/campeonatos/${i.campeonatoId}`}
              className="block p-4 bg-white rounded-xl shadow border border-slate-200 hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{i.campeonato?.nombre}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(i.campeonato?.fechaInicio)} - {formatDate(i.campeonato?.fechaFin)}
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    Pareja: {i.pareja?.jugador1?.usuario?.nombre} / {i.pareja?.jugador2?.usuario?.nombre}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  i.estado === 'ACEPTADA' ? 'bg-green-100 text-green-700' :
                  i.estado === 'LISTA_ESPERA' ? 'bg-amber-100 text-amber-700' :
                  i.estado === 'PENDIENTE' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {i.estado} {i.posicionLista && `#${i.posicionLista}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
