import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campeonatosApi, gruposApi, partidosApi, inscripcionesApi, parejasApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';

const MODALIDAD_LABEL = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', MIXTO: 'Mixto' };
const FASE_LABEL = { GRUPOS: 'Grupos', CUARTOS: 'Cuartos de final', SEMIS: 'Semifinales', FINAL: 'Final' };
const FASE_ORDER = { GRUPOS: 0, CUARTOS: 1, SEMIS: 2, FINAL: 3 };

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function setsLabel(partido) {
  if (partido.sets && partido.sets.length > 0) {
    return partido.sets.map((s) => `${s.gamesLocal}/${s.gamesVisitante}`).join(' — ');
  }
  const sL = partido.setsLocal ?? partido.puntosLocal;
  const sV = partido.setsVisitante ?? partido.puntosVisitante;
  if (sL == null) return null;
  return `${sL} — ${sV}`;
}

function parejaLabel(p) {
  if (!p) return 'TBD';
  return `${p.jugador1?.usuario?.nombre || '-'} / ${p.jugador2?.usuario?.nombre || '-'}`;
}

function categoriaLabel(cat) {
  return cat.nombre || `${cat.categoria}ta ${MODALIDAD_LABEL[cat.modalidad] ?? cat.modalidad}`;
}

function PartidoCard({ p }) {
  const res = p.estado === 'FINALIZADO' ? setsLabel(p) : null;
  const fecha = formatDate(p.fechaHora);
  return (
    <div className={`p-4 bg-white rounded-xl border ${p.estado === 'FINALIZADO' ? 'border-slate-200' : 'border-blue-100'}`}>
      {fecha && (
        <p className="text-xs text-slate-500 mb-2">
          {fecha}{p.pista ? ` · ${p.pista}` : ''}
        </p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`font-medium text-sm flex-1 min-w-[140px] ${res && p.setsLocal > p.setsVisitante ? 'text-blue-700' : ''}`}>
          {parejaLabel(p.parejaLocal)}
        </span>
        {res ? (
          <span className="font-bold text-blue-600 text-sm shrink-0">{res}</span>
        ) : (
          <span className="text-slate-400 text-sm shrink-0">vs</span>
        )}
        <span className={`font-medium text-sm flex-1 min-w-[140px] text-right ${res && p.setsVisitante > p.setsLocal ? 'text-blue-700' : ''}`}>
          {parejaLabel(p.parejaVisitante)}
        </span>
      </div>
    </div>
  );
}

function BracketCategoria({ partidos, grupos }) {
  const fases = [...new Set(partidos.map((p) => p.fase))].sort((a, b) => FASE_ORDER[a] - FASE_ORDER[b]);

  return (
    <div className="space-y-8">
      {fases.map((fase) => {
        const pp = partidos.filter((p) => p.fase === fase);
        return (
          <div key={fase}>
            <h3 className="text-lg font-semibold mb-3 text-slate-700">{FASE_LABEL[fase] ?? fase}</h3>

            {fase === 'GRUPOS' ? (
              // Agrupados por grupo
              <div className="space-y-6">
                {grupos.map((g) => {
                  const gPartidos = pp.filter((p) => p.grupoId === g.id);
                  if (gPartidos.length === 0) return null;
                  return (
                    <div key={g.id}>
                      <p className="text-sm font-medium text-slate-500 mb-2">{g.nombre}</p>
                      <div className="space-y-2">
                        {gPartidos.map((p) => <PartidoCard key={p.id} p={p} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {pp.map((p) => <PartidoCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClasificacionCategoria({ grupos }) {
  if (grupos.length === 0) return <p className="text-slate-500">No hay clasificación disponible aún.</p>;
  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <div key={g.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <h3 className="font-semibold p-4 bg-slate-50 text-slate-700">{g.nombre}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-600">
                  <th className="p-3 pl-4">#</th>
                  <th className="p-3">Pareja</th>
                  <th className="p-3 text-center">Pts</th>
                  <th className="p-3 text-center">PJ</th>
                  <th className="p-3 text-center">PG</th>
                  <th className="p-3 text-center">Sets+</th>
                  <th className="p-3 text-center">Sets-</th>
                  <th className="p-3 text-center">Games+</th>
                  <th className="p-3 text-center">Games-</th>
                </tr>
              </thead>
              <tbody>
                {(g.clasificaciones ?? [])
                  .sort((a, b) => b.puntos - a.puntos || b.setsGanados - a.setsGanados || b.gamesGanados - a.gamesGanados)
                  .map((cl, idx) => (
                    <tr key={cl.id} className={`border-t ${idx < 2 ? 'bg-green-50' : ''}`}>
                      <td className="p-3 pl-4 text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-medium">
                        {cl.pareja?.jugador1?.usuario?.nombre} / {cl.pareja?.jugador2?.usuario?.nombre}
                        {idx < 2 && <span className="ml-1 text-xs text-green-600">↑</span>}
                      </td>
                      <td className="p-3 text-center font-bold">{cl.puntos}</td>
                      <td className="p-3 text-center">{cl.partidosJugados}</td>
                      <td className="p-3 text-center">{cl.partidosGanados}</td>
                      <td className="p-3 text-center">{cl.setsGanados}</td>
                      <td className="p-3 text-center">{cl.setsPerdidos}</td>
                      <td className="p-3 text-center">{cl.gamesGanados}</td>
                      <td className="p-3 text-center">{cl.gamesPerdidos}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function getWinner(partido) {
  if (partido.estado !== 'FINALIZADO') return null;
  let sL = 0, sV = 0;
  if (partido.sets?.length > 0) {
    for (const s of partido.sets) {
      if (s.gamesLocal > s.gamesVisitante) sL++;
      else if (s.gamesVisitante > s.gamesLocal) sV++;
    }
  } else {
    sL = partido.setsLocal ?? 0;
    sV = partido.setsVisitante ?? 0;
  }
  if (sL > sV) return 'local';
  if (sV > sL) return 'visitante';
  return null;
}

function BracketMatchCard({ partido }) {
  const winner = getWinner(partido);

  const renderRow = (pareja, side) => {
    const isWin = winner === side;
    const scores = partido.sets?.length > 0
      ? partido.sets.map((s) => (side === 'local' ? s.gamesLocal : s.gamesVisitante))
      : [];
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${isWin ? 'bg-white' : 'bg-transparent'}`}>
        <span
          className={`text-xs truncate flex-1 ${isWin ? 'text-slate-900 font-bold' : 'text-slate-400'}`}
          style={{ maxWidth: 138 }}
        >
          {parejaLabel(pareja)}
        </span>
        <div className="flex gap-1.5 shrink-0">
          {scores.map((s, i) => (
            <span key={i} className={`text-xs font-bold w-4 text-center ${isWin ? 'text-slate-900' : 'text-slate-500'}`}>
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg overflow-hidden border border-[#383838] bg-[#242424]" style={{ width: 216 }}>
      {renderRow(partido.parejaLocal, 'local')}
      <div className="h-px bg-[#383838]" />
      {renderRow(partido.parejaVisitante, 'visitante')}
    </div>
  );
}

function BracketVisual({ partidos }) {
  const eliPartidos = partidos.filter((p) => ['CUARTOS', 'SEMIS', 'FINAL'].includes(p.fase));

  if (eliPartidos.length === 0) {
    return (
      <div className="py-12 text-center bg-[#181818] rounded-2xl">
        <p className="text-slate-500">El bracket se generará cuando finalicen los grupos.</p>
      </div>
    );
  }

  const byFase = (fase) =>
    eliPartidos.filter((p) => p.fase === fase).sort((a, b) => (a.ordenRonda || 0) - (b.ordenRonda || 0));

  const cuartos = byFase('CUARTOS');
  const semis = byFase('SEMIS');
  const final_ = byFase('FINAL');

  const rounds = [];
  if (cuartos.length > 0) rounds.push({ label: 'Cuartos de final', matches: cuartos });
  if (semis.length > 0) rounds.push({ label: 'Semifinales', matches: semis });
  if (final_.length > 0) rounds.push({ label: 'Final', matches: final_ });

  if (rounds.length === 0) return null;

  const CARD_W = 216;
  const CARD_H = 65;
  const SIB_GAP = 16;
  const COL_GAP = 44;
  const COL_W = CARD_W + COL_GAP;
  const LABEL_H = 32;
  const PAD = 24;

  // Calculate Y position of each match per round
  const yPos = [];
  yPos[0] = rounds[0].matches.map((_, i) => i * (CARD_H + SIB_GAP));
  for (let r = 1; r < rounds.length; r++) {
    yPos[r] = rounds[r].matches.map((_, i) => {
      const y1 = yPos[r - 1][i * 2] ?? 0;
      const y2 = yPos[r - 1][i * 2 + 1] ?? y1;
      return (y1 + y2) / 2;
    });
  }

  // Build SVG connector paths
  const paths = [];
  for (let r = 0; r < rounds.length - 1; r++) {
    for (let i = 0; i < rounds[r + 1].matches.length; i++) {
      const y1 = yPos[r][i * 2];
      const y2 = yPos[r][i * 2 + 1];
      if (y1 == null || y2 == null) continue;

      const xRight = r * COL_W + CARD_W;
      const midX = xRight + COL_GAP / 2;
      const xNext = (r + 1) * COL_W;
      const cy1 = y1 + CARD_H / 2;
      const cy2 = y2 + CARD_H / 2;
      const midY = (cy1 + cy2) / 2;

      paths.push(`M ${xRight} ${cy1} H ${midX} V ${cy2}`);  // feeder1 horiz + full vertical
      paths.push(`M ${xRight} ${cy2} H ${midX}`);            // feeder2 horiz to junction
      paths.push(`M ${midX} ${midY} H ${xNext}`);            // midpoint to parent
    }
  }

  const maxY = Math.max(...yPos.flat()) + CARD_H;
  const totalW = rounds.length * COL_W - COL_GAP;

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-block relative bg-[#181818] rounded-2xl"
        style={{ width: totalW + 2 * PAD, height: maxY + LABEL_H + 2 * PAD, minWidth: '100%' }}
      >
        {/* Round labels */}
        {rounds.map((round, r) => (
          <div
            key={r}
            className="absolute text-[10px] text-slate-500 font-medium uppercase tracking-widest text-center"
            style={{ left: r * COL_W + PAD, top: PAD, width: CARD_W }}
          >
            {round.label}
          </div>
        ))}

        {/* SVG connector lines */}
        <svg
          className="absolute pointer-events-none"
          style={{ left: PAD, top: PAD + LABEL_H, width: totalW, height: maxY }}
        >
          {paths.map((d, i) => (
            <path key={i} d={d} stroke="#3a3a3a" strokeWidth="2" fill="none" strokeLinecap="round" />
          ))}
        </svg>

        {/* Match cards */}
        {rounds.map((round, r) =>
          round.matches.map((match, i) => (
            <div
              key={match.id}
              className="absolute"
              style={{ left: r * COL_W + PAD, top: yPos[r][i] + PAD + LABEL_H, width: CARD_W }}
            >
              <BracketMatchCard partido={match} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function CampeonatoDetalle() {
  const { id } = useParams();
  const { user } = useAuth();
  const { club } = useClub();
  const [campeonato, setCampeonato] = useState(null);
  const [grupos, setGrupos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bracket');
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [parejaSeleccionada, setParejaSeleccionada] = useState('');
  const [categoriaInscripcion, setCategoriaInscripcion] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const [parejasDisponibles, setParejasDisponibles] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [c, g, p, i] = await Promise.all([
        campeonatosApi.get(id).catch(() => null),
        gruposApi.list(id).catch(() => []),
        partidosApi.list({ campeonatoId: id }).catch(() => []),
        inscripcionesApi.list({ campeonatoId: id }).catch(() => []),
      ]);
      setCampeonato(c);
      setGrupos(g);
      setPartidos(p);
      setInscripciones(i);
      if (c?.categorias?.length > 0 && !categoriaActiva) {
        setCategoriaActiva(c.categorias[0].id);
        setCategoriaInscripcion(c.categorias[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id, club?.id]);

  const esAdminClub = campeonato?.clubId && (user?.rol === 'ADMIN' || (user?.clubsAdmin || []).includes(campeonato.clubId));

  useEffect(() => {
    if (esAdminClub || user?.rol === 'JUGADOR') {
      parejasApi.list()
        .then((list) => {
          if (user?.rol === 'JUGADOR' && user?.jugador?.id) {
            return list.filter((p) => p.jugador1Id === user.jugador.id || p.jugador2Id === user.jugador.id);
          }
          return list;
        })
        .then(setParejasDisponibles)
        .catch(() => []);
    }
  }, [user, club?.id, esAdminClub]);

  const handleInscribir = async () => {
    if (!parejaSeleccionada) return;
    setInscribiendo(true);
    try {
      await inscripcionesApi.inscribir(id, parejaSeleccionada, categoriaInscripcion || undefined);
      await load();
      setParejaSeleccionada('');
    } catch (e) {
      alert(e.message || 'Error al inscribir');
    } finally {
      setInscribiendo(false);
    }
  };

  const handleEliminarInscripcion = async (inscripcionId) => {
    if (!confirm('¿Quitar esta pareja?')) return;
    setEliminando(inscripcionId);
    try {
      await inscripcionesApi.eliminar(inscripcionId);
      await load();
    } catch (e) {
      alert(e.message || 'Error al eliminar');
    } finally {
      setEliminando(null);
    }
  };

  if (loading || !campeonato) return <div className="text-slate-500">Cargando...</div>;

  const categorias = campeonato.categorias ?? [];
  const catActiva = categorias.find((c) => c.id === categoriaActiva) ?? categorias[0];

  // Filtrar datos por categoría activa
  const gruposFiltrados = catActiva
    ? grupos.filter((g) => g.categoriaId === catActiva.id || (!g.categoriaId && categorias.length === 0))
    : grupos;
  const partidosFiltrados = catActiva
    ? partidos.filter((p) => p.categoriaId === catActiva.id || (!p.categoriaId && categorias.length === 0))
    : partidos;

  const parejasInscritas = inscripciones.map((i) => i.parejaId);
  const puedeInscribirseAdmin = esAdminClub && parejasDisponibles.length > 0;
  const puedeInscribirseJugador = !esAdminClub && campeonato.estado === 'INSCRIPCIONES' && user && parejasDisponibles.length > 0;

  const tabs = [
    { key: 'bracket', label: 'Bracket' },
    { key: 'clasificacion', label: 'Clasificación' },
    { key: 'inscripciones', label: `Inscripciones (${inscripciones.length})` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{campeonato.nombre}</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {formatDate(campeonato.fechaInicio)} — {formatDate(campeonato.fechaFin)}
          {campeonato.estado && <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">{campeonato.estado}</span>}
        </p>
        {campeonato.descripcion && <p className="text-slate-600 mt-2">{campeonato.descripcion}</p>}
      </div>

      {/* Tabs de categorías */}
      {categorias.length > 1 && (
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoriaActiva(cat.id); setCategoriaInscripcion(cat.id); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                categoriaActiva === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {categoriaLabel(cat)}
            </button>
          ))}
        </div>
      )}

      {/* Tabs de sección */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bracket */}
      {tab === 'bracket' && (
        <BracketCategoria partidos={partidosFiltrados} grupos={gruposFiltrados} />
      )}

      {/* Clasificación */}
      {tab === 'clasificacion' && (
        <ClasificacionCategoria grupos={gruposFiltrados} />
      )}

      {/* Inscripciones */}
      {tab === 'inscripciones' && (
        <div className="space-y-4">
          {(puedeInscribirseAdmin || puedeInscribirseJugador) && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="font-medium text-slate-800 mb-3">{esAdminClub ? 'Agregar pareja' : 'Inscribir mi pareja'}</p>
              <div className="flex flex-wrap gap-2">
                {categorias.length > 1 && (
                  <select
                    value={categoriaInscripcion}
                    onChange={(e) => setCategoriaInscripcion(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{categoriaLabel(cat)}</option>
                    ))}
                  </select>
                )}
                <select
                  value={parejaSeleccionada}
                  onChange={(e) => setParejaSeleccionada(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex-1"
                >
                  <option value="">Seleccionar pareja...</option>
                  {parejasDisponibles
                    .filter((p) => !parejasInscritas.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.jugador1?.usuario?.nombre} / {p.jugador2?.usuario?.nombre}
                      </option>
                    ))}
                </select>
                <button
                  onClick={handleInscribir}
                  disabled={inscribiendo || !parejaSeleccionada}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {inscribiendo ? 'Agregando...' : 'Inscribir'}
                </button>
              </div>
            </div>
          )}

          {inscripciones.length === 0 ? (
            <p className="text-slate-500">No hay inscripciones aún.</p>
          ) : (
            <div className="space-y-2">
              {inscripciones.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <div>
                    <span className="font-medium text-sm">
                      {i.pareja?.jugador1?.usuario?.nombre} / {i.pareja?.jugador2?.usuario?.nombre}
                    </span>
                    {i.categoria && (
                      <span className="ml-2 text-xs text-slate-500">{categoriaLabel(i.categoria)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      i.estado === 'ACEPTADA' ? 'bg-green-100 text-green-700' :
                      i.estado === 'LISTA_ESPERA' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {i.estado}
                    </span>
                    {esAdminClub && (
                      <button
                        onClick={() => handleEliminarInscripcion(i.id)}
                        disabled={eliminando === i.id}
                        className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin links */}
      {esAdminClub && (
        <div className="mt-8 pt-6 border-t flex flex-wrap gap-2">
          <Link to={`/admin/campeonatos/${id}`} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium hover:bg-slate-600">
            Editar torneo
          </Link>
          <Link to={`/admin/campeonatos/${id}/partidos`} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500">
            Gestionar partidos
          </Link>
          <Link to={`/admin/campeonatos/${id}/horarios`} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-300">
            Configurar canchas
          </Link>
        </div>
      )}
    </div>
  );
}
