import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campeonatosApi, partidosApi, gruposApi, inscripcionesApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';

const MODALIDAD_LABEL = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', MIXTO: 'Mixto' };

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

// Genera todos los slots posibles a partir de las DisponibilidadHoraria del torneo.
// Usa setUTCHours para que las keys coincidan con los tiempos que guarda el servidor (que corre en UTC).
function generarSlots(disponibilidades = []) {
  const slots = [];
  for (const disp of disponibilidades) {
    const [hI, mI] = disp.horaInicio.split(':').map(Number);
    const [hF, mF] = disp.horaFin.split(':').map(Number);
    const dur = disp.duracionMinutos;
    const minFin = hF * 60 + mF;
    let min = hI * 60 + mI;
    while (min + dur <= minFin) {
      for (let c = 1; c <= disp.cantidadCanchas; c++) {
        const fechaHora = new Date(disp.fecha);
        fechaHora.setUTCHours(Math.floor(min / 60), min % 60, 0, 0);
        const canchaLabel = `Cancha ${c}`;
        slots.push({
          key: `${fechaHora.toISOString()}|${canchaLabel}`,
          fechaHora,
          cancha: canchaLabel,
          fechaLabel: new Date(disp.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
          horaLabel: `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`,
        });
      }
      min += dur;
    }
  }
  return slots;
}

function slotKey(partido) {
  if (!partido?.fechaHora || !partido?.pista) return null;
  return `${new Date(partido.fechaHora).toISOString()}|${partido.pista}`;
}

function setsLabel(partido) {
  if (partido.estado !== 'FINALIZADO') return null;
  if (partido.sets && partido.sets.length > 0) {
    return partido.sets.map((s) => `${s.gamesLocal}/${s.gamesVisitante}`).join(' - ');
  }
  const sL = partido.setsLocal ?? partido.puntosLocal;
  const sV = partido.setsVisitante ?? partido.puntosVisitante;
  if (sL == null) return null;
  return `${sL} - ${sV}`;
}

function parejaLabel(p) {
  if (!p) return 'TBD';
  const j1 = p.jugador1?.usuario?.nombre || '-';
  const j2 = p.jugador2?.usuario?.nombre || '-';
  return `${j1} / ${j2}`;
}

function SetInput({ sets, onChange }) {
  const addSet = () => onChange([...sets, { gamesLocal: '', gamesVisitante: '' }]);
  const removeSet = (i) => onChange(sets.filter((_, idx) => idx !== i));
  const update = (i, field, val) => onChange(sets.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  return (
    <div className="flex flex-col gap-2">
      {sets.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-10">Set {i + 1}</span>
          <input
            type="number" min={0} max={99} value={s.gamesLocal}
            onChange={(e) => update(i, 'gamesLocal', e.target.value)}
            placeholder="6"
            className="w-14 px-2 py-1 rounded border text-center text-sm"
          />
          <span className="text-slate-400">/</span>
          <input
            type="number" min={0} max={99} value={s.gamesVisitante}
            onChange={(e) => update(i, 'gamesVisitante', e.target.value)}
            placeholder="3"
            className="w-14 px-2 py-1 rounded border text-center text-sm"
          />
          {sets.length > 1 && (
            <button onClick={() => removeSet(i)} className="text-red-400 text-xs hover:text-red-600">✕</button>
          )}
        </div>
      ))}
      {sets.length < 5 && (
        <button onClick={addSet} className="text-xs text-blue-600 hover:underline self-start mt-1">
          + Agregar set
        </button>
      )}
    </div>
  );
}

// Etiqueta para M1/M2/M3 dentro del grupo
function ordenLabel(p) {
  if (p.fase !== 'GRUPOS' || !p.ordenRonda) return null;
  if (p.ordenRonda === 1) return 'Partido 1';
  if (p.ordenRonda === 2) return 'Partido 2 · Ganador vs P3';
  if (p.ordenRonda === 3) return 'Partido 3 · Perdedor vs P3';
  return null;
}

function PartidoRow({ p, onEditar, partidoEditando, sets, onSetsChange, onGuardar, onCancelar, onRefresh, allSlots, todosPartidos }) {
  const editing = partidoEditando === p.id;
  const resultado = setsLabel(p);
  const fecha = formatDate(p.fechaHora);
  const oLabel = ordenLabel(p);

  const [editandoHorario, setEditandoHorario] = useState(false);
  const [slotSel, setSlotSel] = useState('');
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  // Slot que tiene actualmente este partido
  const miSlotKey = slotKey(p);

  // Slots ocupados por OTROS partidos (no este)
  const ocupados = new Set(
    (todosPartidos || [])
      .filter((x) => x.id !== p.id)
      .map(slotKey)
      .filter(Boolean)
  );

  // Agrupar slots por fecha para los optgroups
  const slotsPorFecha = {};
  for (const s of allSlots || []) {
    if (!slotsPorFecha[s.fechaLabel]) slotsPorFecha[s.fechaLabel] = [];
    slotsPorFecha[s.fechaLabel].push(s);
  }

  const abrirEditHorario = () => {
    // Si la key del partido no está en las opciones disponibles (ej. desfase de zona horaria
    // en partidos viejos), inicializar en '' para que display y estado coincidan.
    const keyExiste = (allSlots || []).some((s) => s.key === miSlotKey);
    setSlotSel(keyExiste ? (miSlotKey || '') : '');
    setEditandoHorario(true);
  };

  const guardarHorario = async () => {
    setGuardandoHorario(true);
    try {
      if (!slotSel) {
        await partidosApi.desasignarHorario(p.id);
      } else {
        const slot = (allSlots || []).find((s) => s.key === slotSel);
        if (slot) await partidosApi.asignarHorario(p.id, slot.fechaHora.toISOString(), slot.cancha);
      }
      setEditandoHorario(false);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Error al guardar horario');
    } finally {
      setGuardandoHorario(false);
    }
  };

  // M2/M3 sin local todavía: mostrar como pendiente de M1
  const esperandoM1 = p.fase === 'GRUPOS' && p.ordenRonda > 1 && !p.parejaLocal && p.estado !== 'FINALIZADO';

  return (
    <div className={`flex flex-wrap items-start gap-3 p-4 bg-white rounded-xl border ${
      esperandoM1 ? 'border-slate-100 opacity-70' : 'border-slate-200'
    }`}>
      <div className="flex flex-col gap-1 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
          p.fase === 'GRUPOS' ? 'bg-slate-200 text-slate-700' : 'bg-yellow-300 text-slate-900'
        }`}>
          {p.fase === 'GRUPOS' ? (p.grupo?.nombre || 'Grupo') : p.fase}
        </span>
        {oLabel && <span className="text-xs text-slate-400 px-1">{oLabel}</span>}
      </div>

      {/* Horario: mostrar o editar con selector */}
      {editandoHorario ? (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 shrink-0">
          <select
            value={slotSel}
            onChange={(e) => setSlotSel(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white max-w-[260px]"
          >
            <option value="">— Sin horario —</option>
            {Object.entries(slotsPorFecha).map(([fechaLabel, slots]) => (
              <optgroup key={fechaLabel} label={fechaLabel}>
                {slots.map((s) => {
                  const esEste = s.key === miSlotKey;
                  const ocupado = ocupados.has(s.key);
                  return (
                    <option
                      key={s.key}
                      value={s.key}
                      disabled={ocupado && !esEste}
                    >
                      {s.horaLabel} · {s.cancha}{ocupado && !esEste ? ' (ocupado)' : ''}
                    </option>
                  );
                })}
              </optgroup>
            ))}
            {(allSlots || []).length === 0 && (
              <option disabled>No hay slots configurados</option>
            )}
          </select>
          <button onClick={guardarHorario} disabled={guardandoHorario}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 font-medium">
            {guardandoHorario ? '...' : 'Guardar'}
          </button>
          <button onClick={() => setEditandoHorario(false)}
            className="text-xs px-2 py-1.5 bg-slate-200 rounded hover:bg-slate-300">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={abrirEditHorario}
          className={`text-xs px-2 py-1 rounded border transition shrink-0 ${
            fecha
              ? 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
              : 'text-slate-400 border-dashed border-slate-300 hover:border-slate-400 hover:text-slate-500'
          }`}
        >
          {fecha ? `${fecha}${p.pista ? ` · ${p.pista}` : ''}` : '+ Asignar horario'}
        </button>
      )}

      <div className="flex-1 flex flex-wrap items-start gap-3 min-w-0">
        <span className="font-medium text-sm min-w-[140px]">{parejaLabel(p.parejaLocal)}</span>

        {editing ? (
          <div className="flex flex-col gap-3">
            <SetInput sets={sets} onChange={onSetsChange} />
            <div className="flex gap-2">
              <button onClick={onGuardar} className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-500">
                Guardar
              </button>
              <button onClick={onCancelar} className="px-3 py-1 rounded bg-slate-200 text-sm hover:bg-slate-300">
                Cancelar
              </button>
            </div>
          </div>
        ) : resultado ? (
          <span className="font-bold text-blue-600 text-sm">{resultado}</span>
        ) : esperandoM1 ? (
          <span className="text-xs text-slate-400 italic">Esperando resultado Partido 1</span>
        ) : (
          <button onClick={() => onEditar(p.id)} className="px-3 py-1 rounded bg-slate-200 text-sm hover:bg-slate-300">
            Cargar resultado
          </button>
        )}

        <span className="font-medium text-sm min-w-[140px]">{parejaLabel(p.parejaVisitante)}</span>
      </div>
    </div>
  );
}

export default function AdminPartidos() {
  const { id } = useParams();
  const { club } = useClub();
  const [campeonato, setCampeonato] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [partidoEditando, setPartidoEditando] = useState(null);
  const [sets, setSets] = useState([{ gamesLocal: '', gamesVisitante: '' }]);
  const [generandoEliminatorias, setGenerandoEliminatorias] = useState(false);
  const [asignandoHorarios, setAsignandoHorarios] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [grupos, setGrupos] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [seleccionEnGrupo, setSeleccionEnGrupo] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        campeonatosApi.get(id).catch(() => null),
        partidosApi.list({ campeonatoId: id }).catch(() => []),
      ]);
      setCampeonato(c);
      setPartidos(p);
      if (c?.categorias?.length > 0 && !categoriaActiva) {
        setCategoriaActiva(c.categorias[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGrupos = async (catId) => {
    if (!catId) { setGrupos([]); setInscripciones([]); return; }
    const [g, insc] = await Promise.all([
      gruposApi.list(id, catId).catch(() => []),
      inscripcionesApi.list({ campeonatoId: id, categoriaId: catId, estado: 'ACEPTADA' }).catch(() => []),
    ]);
    setGrupos(g);
    setInscripciones(insc);
    setSeleccionEnGrupo({});
  };

  useEffect(() => { load(); }, [id, club?.id]);
  useEffect(() => { loadGrupos(categoriaActiva); }, [categoriaActiva]);

  const showMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const handleGuardar = async (partidoId) => {
    for (const s of sets) {
      if (s.gamesLocal === '' || s.gamesVisitante === '') {
        alert('Completá los games de cada set');
        return;
      }
    }
    let sL = 0; let sV = 0;
    for (const s of sets) {
      const gL = parseInt(s.gamesLocal, 10);
      const gV = parseInt(s.gamesVisitante, 10);
      if (gL > gV) sL++;
      else if (gV > gL) sV++;
    }
    if (sL === sV) {
      alert('El resultado no puede terminar en empate de sets');
      return;
    }
    try {
      await partidosApi.actualizarResultado(partidoId, sets.map((s) => ({
        gamesLocal: parseInt(s.gamesLocal, 10),
        gamesVisitante: parseInt(s.gamesVisitante, 10),
      })));
      const p = await partidosApi.list({ campeonatoId: id });
      setPartidos(p);
      setPartidoEditando(null);
      setSets([{ gamesLocal: '', gamesVisitante: '' }]);
    } catch (err) {
      alert(err.message || 'Error al cargar resultado');
    }
  };

  const handleCancelar = () => {
    setPartidoEditando(null);
    setSets([{ gamesLocal: '', gamesVisitante: '' }]);
  };

  const handleGenerarEliminatorias = async () => {
    setGenerandoEliminatorias(true);
    try {
      const res = await campeonatosApi.generarEliminatorias(id, categoriaActiva || undefined);
      const p = await partidosApi.list({ campeonatoId: id });
      setPartidos(p);
      showMensaje(`Bracket generado: ${res.creados} partidos de eliminatorias creados.`);
    } catch (err) {
      showMensaje(err.message || 'Error al generar eliminatorias', 'error');
    } finally {
      setGenerandoEliminatorias(false);
    }
  };

  const handleAsignarHorarios = async () => {
    setAsignandoHorarios(true);
    try {
      const res = await campeonatosApi.asignarHorarios(id, categoriaActiva || undefined);
      const p = await partidosApi.list({ campeonatoId: id });
      setPartidos(p);
      showMensaje(`${res.asignados} partidos con horario asignado.`);
    } catch (err) {
      showMensaje(err.message || 'Error al asignar horarios', 'error');
    } finally {
      setAsignandoHorarios(false);
    }
  };

  const handleCrearGrupo = async () => {
    const nextLetra = String.fromCharCode(65 + grupos.length);
    const nombre = prompt('Nombre del grupo:', `Grupo ${nextLetra}`);
    if (!nombre?.trim()) return;
    try {
      await gruposApi.crear(id, categoriaActiva, nombre.trim());
      await loadGrupos(categoriaActiva);
      showMensaje('Grupo creado.');
    } catch (err) {
      showMensaje(err.message || 'Error al crear grupo', 'error');
    }
  };

  const handleEliminarGrupo = async (grupoId, grupoNombre) => {
    if (!confirm(`¿Eliminar "${grupoNombre}"? Se borrarán sus partidos y clasificaciones.`)) return;
    try {
      await gruposApi.eliminar(grupoId);
      await loadGrupos(categoriaActiva);
      showMensaje('Grupo eliminado.');
    } catch (err) {
      showMensaje(err.message || 'Error al eliminar grupo', 'error');
    }
  };

  const handleAgregarPareja = async (grupoId) => {
    const parejaId = seleccionEnGrupo[grupoId];
    if (!parejaId) return;
    try {
      await gruposApi.agregarPareja(grupoId, parejaId);
      await loadGrupos(categoriaActiva);
    } catch (err) {
      showMensaje(err.message || 'Error al agregar pareja', 'error');
    }
  };

  const handleQuitarPareja = async (grupoId, parejaId) => {
    if (!confirm('¿Quitar esta pareja del grupo?')) return;
    try {
      await gruposApi.quitarPareja(grupoId, parejaId);
      await loadGrupos(categoriaActiva);
    } catch (err) {
      showMensaje(err.message || 'Error al quitar pareja', 'error');
    }
  };

  const handleRegenerarPartidosGrupo = async (grupoId, grupoNombre) => {
    if (!confirm(`¿Regenerar los partidos del grupo "${grupoNombre}"? Se borrarán los partidos actuales y se crearán nuevos.`)) return;
    try {
      const res = await gruposApi.regenerarPartidos(grupoId);
      const p = await partidosApi.list({ campeonatoId: id });
      setPartidos(p);
      showMensaje(res.mensaje || 'Partidos regenerados.');
    } catch (err) {
      showMensaje(err.message || 'Error al regenerar partidos', 'error');
    }
  };

  if (loading || !campeonato) return <div className="text-slate-500">Cargando...</div>;

  const categorias = campeonato.categorias ?? [];
  const allSlots = generarSlots(campeonato.disponibilidades ?? []);
  const partidosFiltrados = categoriaActiva
    ? partidos.filter((p) => p.categoriaId === categoriaActiva)
    : partidos;

  const partidosGrupos = partidosFiltrados.filter((p) => p.fase === 'GRUPOS');
  const partidosEliminatorias = partidosFiltrados.filter((p) => ['CUARTOS', 'SEMIS', 'FINAL'].includes(p.fase));
  const todosGruposFinalizados = partidosGrupos.length > 0 && partidosGrupos.every((p) => p.estado === 'FINALIZADO');
  const hayCanchas = (campeonato.pistas?.length ?? 0) > 0 || (campeonato.disponibilidades?.length ?? 0) > 0;
  const hayPartidosSinHorario = partidosFiltrados.some((p) => !p.fechaHora && p.estado !== 'FINALIZADO');

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-sm mb-2">
            <Link to="/admin/campeonatos" className="text-blue-600 hover:underline font-medium">
              Torneos
            </Link>
            <span className="text-slate-300">/</span>
            <Link to={`/admin/campeonatos/${id}`} className="text-blue-600 hover:underline truncate max-w-[160px]">
              {campeonato.nombre}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Partidos</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold">{campeonato.nombre}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de grupos, partidos y eliminatorias</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hayCanchas && hayPartidosSinHorario && (
            <button
              onClick={handleAsignarHorarios}
              disabled={asignandoHorarios}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {asignandoHorarios ? 'Asignando...' : 'Asignar horarios'}
            </button>
          )}
          <Link
            to={`/admin/campeonatos/${id}/horarios`}
            className="px-3 py-2 rounded-lg bg-slate-200 text-sm font-medium hover:bg-slate-300"
          >
            Canchas
          </Link>
        </div>
      </div>

      {/* Tabs de categorías — scrollable horizontal en mobile */}
      {categorias.length > 1 && (
        <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto pb-px -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <button
            onClick={() => setCategoriaActiva(null)}
            className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              categoriaActiva === null
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.id)}
              className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                categoriaActiva === cat.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {cat.nombre || `${cat.categoria}ta ${MODALIDAD_LABEL[cat.modalidad]}`}
            </button>
          ))}
        </div>
      )}

      {/* Mensaje feedback */}
      {mensaje.texto && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Gestión de grupos — solo cuando hay categoría activa y grupos creados */}
      {categoriaActiva && (() => {
        const parejasEnGrupos = new Set(grupos.flatMap((g) => g.clasificaciones.map((c) => c.parejaId)));
        const disponibles = inscripciones.filter((i) => !parejasEnGrupos.has(i.parejaId));
        return (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Grupos</h2>
              <button
                onClick={handleCrearGrupo}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
              >
                + Nuevo grupo
              </button>
            </div>
            {grupos.length === 0 && (
              <p className="text-slate-500 text-sm mb-4">No hay grupos. Usá "+ Nuevo grupo" para crear uno.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grupos.map((grupo) => (
                <div key={grupo.id} className="border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{grupo.nombre}</h3>
                    <div className="flex gap-1 flex-wrap">
                      {grupo.clasificaciones.length === 3 && (
                        <button
                          onClick={() => handleRegenerarPartidosGrupo(grupo.id, grupo.nombre)}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 border border-blue-200"
                          title="Borra los partidos del grupo y los regenera con las parejas actuales"
                        >
                          Regenerar partidos
                        </button>
                      )}
                      <button
                        onClick={() => handleEliminarGrupo(grupo.id, grupo.nombre)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded hover:bg-red-50"
                      >
                        Eliminar grupo
                      </button>
                    </div>
                  </div>

                  {grupo.clasificaciones.length === 0 ? (
                    <p className="text-xs text-slate-400 mb-3 italic">Sin parejas asignadas</p>
                  ) : (
                    <ul className="space-y-2 mb-3">
                      {grupo.clasificaciones.map((c) => (
                        <li key={c.parejaId} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{parejaLabel(c.pareja)}</span>
                          <button
                            onClick={() => handleQuitarPareja(grupo.id, c.parejaId)}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5 rounded hover:bg-red-50"
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {disponibles.length > 0 && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <select
                        value={seleccionEnGrupo[grupo.id] || ''}
                        onChange={(e) => setSeleccionEnGrupo((prev) => ({ ...prev, [grupo.id]: e.target.value }))}
                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="">Agregar pareja...</option>
                        {disponibles.map((i) => (
                          <option key={i.parejaId} value={i.parejaId}>
                            {parejaLabel(i.pareja)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAgregarPareja(grupo.id)}
                        disabled={!seleccionEnGrupo[grupo.id]}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40"
                      >
                        + Agregar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {disponibles.length > 0 && (
              <p className="text-xs text-slate-500 mt-3">
                {disponibles.length} pareja{disponibles.length !== 1 ? 's' : ''} sin grupo:{' '}
                {disponibles.map((i) => parejaLabel(i.pareja)).join(', ')}
              </p>
            )}
            {disponibles.length === 0 && (
              <p className="text-xs text-green-700 mt-3">Todas las parejas están asignadas a un grupo.</p>
            )}
          </section>
        );
      })()}

      {/* Partidos de grupos */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Partidos de grupos</h2>
        {partidosGrupos.length === 0 ? (
          <p className="text-slate-500">No hay partidos de grupos creados.</p>
        ) : (
          <div className="space-y-3">
            {partidosGrupos.map((p) => (
              <PartidoRow
                key={p.id} p={p}
                onEditar={(pid) => { setPartidoEditando(pid); setSets([{ gamesLocal: '', gamesVisitante: '' }]); }}
                partidoEditando={partidoEditando}
                sets={sets} onSetsChange={setSets}
                onGuardar={() => handleGuardar(p.id)}
                onCancelar={handleCancelar}
                onRefresh={load}
                allSlots={allSlots}
                todosPartidos={partidos}
              />
            ))}
          </div>
        )}
      </section>

      {/* Eliminatorias */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Eliminatorias</h2>
          {partidosEliminatorias.length === 0 && todosGruposFinalizados && (
            <button
              onClick={handleGenerarEliminatorias}
              disabled={generandoEliminatorias}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              {generandoEliminatorias ? 'Generando...' : 'Generar bracket'}
            </button>
          )}
        </div>
        {partidosEliminatorias.length === 0 ? (
          <p className="text-slate-500">
            {todosGruposFinalizados
              ? 'Todos los grupos están completos. Hacé click en "Generar bracket".'
              : 'Completá todos los partidos de grupos para habilitar las eliminatorias.'}
          </p>
        ) : (
          <div className="space-y-3">
            {partidosEliminatorias.map((p) => (
              <PartidoRow
                key={p.id} p={p}
                onEditar={(pid) => { setPartidoEditando(pid); setSets([{ gamesLocal: '', gamesVisitante: '' }]); }}
                partidoEditando={partidoEditando}
                sets={sets} onSetsChange={setSets}
                onGuardar={() => handleGuardar(p.id)}
                onCancelar={handleCancelar}
                onRefresh={load}
                allSlots={allSlots}
                todosPartidos={partidos}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
