import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campeonatosApi, partidosApi, parejasApi } from '../../services/api';

export default function AdminGestionarPartidos() {
  const { id } = useParams();
  const [campeonato, setCampeonato] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [tab, setTab] = useState('partidos'); // 'partidos' | 'cronograma' | 'mover'

  // Formulario asignar horario
  const [formHorario, setFormHorario] = useState({ partidoId: '', fecha: '', hora: '', cancha: '' });
  const [editandoPartidoId, setEditandoPartidoId] = useState(null);

  // Formulario mover pareja
  const [formMover, setFormMover] = useState({ parejaId: '', grupoActual: '', grupoNuevo: '' });

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const [c, p] = await Promise.all([
          campeonatosApi.get(id),
          partidosApi.list({ campeonatoId: id }),
        ]);
        setCampeonato(c);
        setPartidos(p);
        setGrupos(c.grupos || []);
      } catch (err) {
        showMensaje('Error al cargar datos', 'error');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  const showMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const formatearFecha = (d) => new Date(d).toLocaleDateString('es-ES', {
    weekday: 'short', day: '2-digit', month: '2-digit',
  });

  const formatearHora = (d) => new Date(d).toLocaleTimeString('es-ES', {
    hour: '2-digit', minute: '2-digit',
  });

  // ─── Asignar Horario ───────────────────────────────────────────────────────────
  const handleAsignarHorario = async (e) => {
    e.preventDefault();
    if (!formHorario.partidoId || !formHorario.fecha || !formHorario.hora || !formHorario.cancha) {
      showMensaje('Completa todos los campos', 'error');
      return;
    }

    const fechaHora = new Date(`${formHorario.fecha}T${formHorario.hora}`);
    try {
      const actualizado = await partidosApi.asignarHorario(
        formHorario.partidoId,
        fechaHora.toISOString(),
        formHorario.cancha
      );
      setPartidos((prev) =>
        prev.map((p) => p.id === actualizado.id ? actualizado : p)
      );
      setFormHorario({ partidoId: '', fecha: '', hora: '', cancha: '' });
      setEditandoPartidoId(null);
      showMensaje('Horario asignado correctamente');
    } catch (err) {
      showMensaje(err.message || 'Error al asignar horario', 'error');
    }
  };

  // ─── Desasignar Horario ─────────────────────────────────────────────────────────
  const handleDesasignarHorario = async (partidoId) => {
    if (!confirm('¿Desasignar este horario?')) return;
    try {
      const actualizado = await partidosApi.desasignarHorario(partidoId);
      setPartidos((prev) =>
        prev.map((p) => p.id === actualizado.id ? actualizado : p)
      );
      showMensaje('Horario desasignado');
    } catch (err) {
      showMensaje(err.message || 'Error al desasignar', 'error');
    }
  };

  // ─── Mover Pareja ─────────────────────────────────────────────────────────────
  const handleMoverPareja = async (e) => {
    e.preventDefault();
    if (!formMover.parejaId || !formMover.grupoActual || !formMover.grupoNuevo) {
      showMensaje('Selecciona pareja y grupos', 'error');
      return;
    }
    try {
      await parejasApi.moverGrupo(formMover.parejaId, formMover.grupoActual, formMover.grupoNuevo);
      setFormMover({ parejaId: '', grupoActual: '', grupoNuevo: '' });
      // Recargar partidos
      const p = await partidosApi.list({ campeonatoId: id });
      setPartidos(p);
      showMensaje('Pareja movida exitosamente');
    } catch (err) {
      showMensaje(err.message || 'Error al mover pareja', 'error');
    }
  };

  // ─── Obtener cronograma por cancha ────────────────────────────────────────────
  const cronogramaObj = partidos
    .filter((p) => p.fechaHora && p.pista)
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
    .reduce((acc, p) => {
      const cancha = p.pista;
      if (!acc[cancha]) acc[cancha] = [];
      acc[cancha].push(p);
      return acc;
    }, {});

  if (loading || !campeonato) {
    return <div className="text-slate-500">Cargando...</div>;
  }

  const sinHorario = partidos.filter((p) => !p.fechaHora);
  const conHorario = partidos.filter((p) => p.fechaHora);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link to={`/admin/campeonatos/${id}`} className="text-blue-600 hover:underline text-sm">
          ← Volver al campeonato
        </Link>
        <h1 className="text-2xl font-bold mt-1">{campeonato.nombre} — Gestionar Partidos</h1>
      </div>

      {mensaje.texto && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6">
        {[
          { key: 'partidos', label: `Partidos (${partidos.length})` },
          { key: 'cronograma', label: `Cronograma (${conHorario.length})` },
          { key: 'mover', label: 'Mover Parejas' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-medium transition ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── PARTIDOS ─── */}
      {tab === 'partidos' && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>{conHorario.length}</strong> partidos con horario asignado
              <br />
              <strong>{sinHorario.length}</strong> partidos sin horario
            </p>
          </div>

          {/* Formulario Asignar */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editandoPartidoId ? 'Modificar horario' : 'Asignar horario a partido'}
            </h2>
            <form onSubmit={handleAsignarHorario} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Partido</label>
                <select
                  value={formHorario.partidoId}
                  onChange={(e) => {
                    setFormHorario((prev) => ({ ...prev, partidoId: e.target.value }));
                    setEditandoPartidoId(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {(editandoPartidoId ? conHorario : sinHorario).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.parejaLocal?.nombre || 'TBD'} vs {p.parejaVisitante?.nombre || 'TBD'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <input
                  type="date"
                  value={formHorario.fecha}
                  onChange={(e) => setFormHorario((prev) => ({ ...prev, fecha: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora</label>
                <input
                  type="time"
                  value={formHorario.hora}
                  onChange={(e) => setFormHorario((prev) => ({ ...prev, hora: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cancha</label>
                <input
                  type="text"
                  placeholder="ej: 1, 2, A, B"
                  value={formHorario.cancha}
                  onChange={(e) => setFormHorario((prev) => ({ ...prev, cancha: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Asignar
                </button>
              </div>
            </form>
          </div>

          {/* Partidos Sin Horario */}
          {sinHorario.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-red-600">Sin horario ({sinHorario.length})</h3>
              <div className="grid gap-3">
                {sinHorario.map((p) => (
                  <div key={p.id} className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {p.parejaLocal?.nombre || 'TBD'} vs {p.parejaVisitante?.nombre || 'TBD'}
                      </p>
                      <p className="text-sm text-slate-500">Grupo: {p.grupo?.nombre || '—'} | Fase: {p.fase}</p>
                    </div>
                    <button
                      onClick={() => {
                        setFormHorario((prev) => ({ ...prev, partidoId: p.id }));
                        setEditandoPartidoId(p.id);
                        document.querySelector('[type="date"]')?.focus();
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Asignar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Partidos Con Horario */}
          {conHorario.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-600">Con horario ({conHorario.length})</h3>
              <div className="grid gap-3">
                {conHorario.map((p) => (
                  <div key={p.id} className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {p.parejaLocal?.nombre || 'TBD'} vs {p.parejaVisitante?.nombre || 'TBD'}
                      </p>
                      <p className="text-sm text-slate-500">
                        🕐 {formatearFecha(p.fechaHora)} {formatearHora(p.fechaHora)} | 🏀 Cancha {p.pista}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setFormHorario({
                            partidoId: p.id,
                            fecha: p.fechaHora.split('T')[0],
                            hora: p.fechaHora.split('T')[1].slice(0, 5),
                            cancha: p.pista || '',
                          });
                          setEditandoPartidoId(p.id);
                        }}
                        className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-700"
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => handleDesasignarHorario(p.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Desasignar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CRONOGRAMA ─── */}
      {tab === 'cronograma' && (
        <div>
          {Object.keys(cronogramaObj).length === 0 ? (
            <p className="text-slate-500 text-center py-8">No hay partidos con horario asignado</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {Object.entries(cronogramaObj).map(([cancha, ps]) => (
                <div key={cancha} className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 text-blue-600">🏀 Cancha {cancha}</h3>
                  <div className="space-y-3">
                    {ps.map((p) => (
                      <div key={p.id} className="bg-slate-50 rounded p-3 text-sm border-l-4 border-blue-600">
                        <p className="font-medium">{formatearFecha(p.fechaHora)} {formatearHora(p.fechaHora)}</p>
                        <p className="text-slate-600">
                          {p.parejaLocal?.nombre || 'TBD'} vs {p.parejaVisitante?.nombre || 'TBD'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MOVER PAREJAS ─── */}
      {tab === 'mover' && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Mover pareja entre grupos</h2>
          <form onSubmit={handleMoverPareja} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pareja a mover</label>
              <select
                value={formMover.parejaId}
                onChange={(e) => setFormMover((prev) => ({ ...prev, parejaId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Seleccionar...</option>
                {partidos.map((p) => [p.parejaLocal, p.parejaVisitante])
                  .flat()
                  .filter((p) => p)
                  .reduce((acc, p) => (acc.some((x) => x.id === p.id) ? acc : [...acc, p]), [])
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || `Pareja ${p.id.slice(0, 4)}`}
                    </option>
                  ))
                }
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grupo actual</label>
              <select
                value={formMover.grupoActual}
                onChange={(e) => setFormMover((prev) => ({ ...prev, grupoActual: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Seleccionar...</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nuevo grupo</label>
              <select
                value={formMover.grupoNuevo}
                onChange={(e) => setFormMover((prev) => ({ ...prev, grupoNuevo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Seleccionar...</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Mover Pareja
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
