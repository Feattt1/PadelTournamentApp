import { useState, useEffect } from 'react';
import { useClub } from '../context/ClubContext';
import { clubsApi } from '../services/api';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const ROW_BG = ['bg-yellow-50', 'bg-slate-50', 'bg-orange-50/40'];
const MODALIDAD_LABEL = { MASCULINO: 'Masc.', FEMENINO: 'Fem.', MIXTO: 'Mixto' };

function parejaLabel(pareja) {
  if (!pareja) return '—';
  return `${pareja.jugador1?.usuario?.nombre || '?'} / ${pareja.jugador2?.usuario?.nombre || '?'}`;
}

function catKey(cat) { return `${cat.categoria}_${cat.modalidad}`; }
function catLabel(cat) { return `${cat.categoria}ta ${MODALIDAD_LABEL[cat.modalidad] ?? cat.modalidad}`; }

export default function Ranking() {
  const { club } = useClub();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [catSel, setCatSel] = useState(null); // { categoria, modalidad } | null = todas
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!club?.id) return;
    setLoading(true);
    setError('');
    clubsApi.ranking(club.id, year, catSel?.categoria, catSel?.modalidad)
      .then((res) => {
        setData(res);
        // Si no hay categoría seleccionada y hay categorías disponibles, seleccionar la primera
        if (!catSel && res.categorias?.length > 0) {
          setCatSel(res.categorias[0]);
        }
      })
      .catch((e) => setError(e.message || 'Error al cargar el ranking'))
      .finally(() => setLoading(false));
  }, [club?.id, year, catSel?.categoria, catSel?.modalidad]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const ranking = data?.ranking ?? [];
  const categorias = data?.categorias ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">
          {club?.nombre}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Ranking anual</h1>
            <p className="text-slate-500 text-sm mt-1">
              Acumulado de puntos en todos los torneos del club.
            </p>
          </div>
          {/* Selector de año */}
          <div className="flex gap-1 flex-wrap">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => { setYear(y); setCatSel(null); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  year === y
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selector de categoría */}
      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categorias.map((cat) => {
            const sel = catSel && catKey(catSel) === catKey(cat);
            return (
              <button
                key={catKey(cat)}
                onClick={() => setCatSel(sel ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                  sel
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {catLabel(cat)}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      ) : ranking.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-slate-500 font-medium">Sin datos para {year}</p>
          <p className="text-slate-400 text-sm mt-1">
            El ranking se construye a partir de los torneos jugados en el año.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 podio */}
          {ranking.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[ranking[1], ranking[0], ranking[2]].map((r, visualIdx) => {
                if (!r) return <div key={visualIdx} />;
                const realIdx = visualIdx === 0 ? 1 : visualIdx === 1 ? 0 : 2;
                const minHeights = ['min-h-28', 'min-h-36', 'min-h-24'];
                const colors = [
                  'border-slate-300 bg-slate-50',
                  'border-yellow-300 bg-yellow-50',
                  'border-orange-200 bg-orange-50/60',
                ];
                return (
                  <div
                    key={r.parejaId}
                    className={`flex flex-col items-center justify-end ${minHeights[visualIdx]} rounded-xl border-2 ${colors[visualIdx]} p-3 text-center`}
                  >
                    <span className="text-2xl mb-1">{MEDALLAS[realIdx]}</span>
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      {parejaLabel(r.pareja)}
                    </p>
                    <p className="text-sm font-bold text-blue-600 mt-1">{r.puntos} pts</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tabla completa */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-4 py-3 w-10">#</th>
                    <th className="px-4 py-3">Pareja</th>
                    <th className="px-4 py-3 text-center">Torneos</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    <th className="px-4 py-3 text-center">PJ</th>
                    <th className="px-4 py-3 text-center">PG</th>
                    <th className="px-4 py-3 text-center">S+</th>
                    <th className="px-4 py-3 text-center">S-</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">G+</th>
                    <th className="px-4 py-3 text-center hidden sm:table-cell">G-</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, idx) => (
                    <tr
                      key={r.parejaId}
                      className={`border-t border-slate-100 transition-colors ${
                        idx < 3 ? ROW_BG[idx] : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-center font-bold leading-none">
                        {idx < 3
                          ? <span className="text-lg">{MEDALLAS[idx]}</span>
                          : <span className="text-slate-400 text-sm font-normal">{idx + 1}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{parejaLabel(r.pareja)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">{r.torneos}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600 text-base">{r.puntos}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{r.partidosJugados}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{r.partidosGanados}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{r.setsGanados}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{r.setsPerdidos}</td>
                      <td className="px-4 py-3 text-center text-slate-500 hidden sm:table-cell">{r.gamesGanados}</td>
                      <td className="px-4 py-3 text-center text-slate-500 hidden sm:table-cell">{r.gamesPerdidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            {ranking.length} pareja{ranking.length !== 1 ? 's' : ''} · Torneos {year} · {club?.nombre}
          </p>
        </>
      )}
    </div>
  );
}
