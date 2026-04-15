import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campeonatosApi, partidosApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';

const MODALIDAD_LABEL = { MASCULINO: 'Masculino', FEMENINO: 'Femenino', MIXTO: 'Mixto' };

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
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

function PartidoRow({ p, onEditar, partidoEditando, sets, onSetsChange, onGuardar, onCancelar }) {
  const editing = partidoEditando === p.id;
  const resultado = setsLabel(p);
  const fecha = formatDate(p.fechaHora);
  const oLabel = ordenLabel(p);

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

      {fecha && (
        <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shrink-0">
          {fecha}{p.pista ? ` · ${p.pista}` : ''}
        </span>
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

  useEffect(() => { load(); }, [id, club?.id]);

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

  if (loading || !campeonato) return <div className="text-slate-500">Cargando...</div>;

  const categorias = campeonato.categorias ?? [];
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
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <Link to={`/admin/campeonatos/${id}`} className="text-blue-600 hover:underline text-sm">
            ← Volver al campeonato
          </Link>
          <h1 className="text-2xl font-bold mt-1">{campeonato.nombre} — Partidos</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hayCanchas && hayPartidosSinHorario && !categoriaActiva && (
            <button
              onClick={handleAsignarHorarios}
              disabled={asignandoHorarios}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {asignandoHorarios ? 'Asignando...' : 'Asignar horarios'}
            </button>
          )}
          <Link
            to={`/admin/campeonatos/${id}/horarios`}
            className="px-4 py-2 rounded-lg bg-slate-200 text-sm font-medium hover:bg-slate-300"
          >
            Canchas
          </Link>
        </div>
      </div>

      {/* Tabs de categorías */}
      {categorias.length > 1 && (
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          <button
            onClick={() => setCategoriaActiva(null)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
