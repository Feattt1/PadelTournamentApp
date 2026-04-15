import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campeonatosApi } from '../../services/api';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatFecha(d) {
  const date = new Date(d);
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function dateToInput(d) {
  // yyyy-mm-dd para input type="date"
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function calcularSlots(disp) {
  const [hIni, mIni] = disp.horaInicio.split(':').map(Number);
  const [hFin, mFin] = disp.horaFin.split(':').map(Number);
  const dur = disp.duracionMinutos;
  const minDisp = hFin * 60 + mFin - (hIni * 60 + mIni);
  const slotsPorCancha = Math.floor(minDisp / dur);
  return slotsPorCancha * disp.cantidadCanchas;
}

const FORM_EMPTY = { fecha: '', horaInicio: '09:00', horaFin: '20:00', cantidadCanchas: 2, duracionMinutos: 120 };

export default function AdminHorarios() {
  const { id } = useParams();
  const [campeonato, setCampeonato] = useState(null);
  const [disponibilidades, setDisponibilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(FORM_EMPTY);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [c, d] = await Promise.all([
        campeonatosApi.get(id),
        campeonatosApi.listDisponibilidad(id),
      ]);
      setCampeonato(c);
      setDisponibilidades(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const showMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!form.fecha) { showMensaje('Elegí una fecha', 'error'); return; }
    setGuardando(true);
    try {
      await campeonatosApi.saveDisponibilidad(id, {
        fecha: form.fecha,
        horaInicio: form.horaInicio,
        horaFin: form.horaFin,
        cantidadCanchas: parseInt(form.cantidadCanchas, 10),
        duracionMinutos: parseInt(form.duracionMinutos, 10),
      });
      const d = await campeonatosApi.listDisponibilidad(id);
      setDisponibilidades(d);
      setForm(FORM_EMPTY);
      showMensaje('Disponibilidad guardada.');
    } catch (err) {
      showMensaje(err.message || 'Error al guardar', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (dispId) => {
    if (!confirm('¿Eliminar esta disponibilidad?')) return;
    try {
      await campeonatosApi.deleteDisponibilidad(id, dispId);
      setDisponibilidades((prev) => prev.filter((d) => d.id !== dispId));
    } catch (err) {
      showMensaje(err.message || 'Error al eliminar', 'error');
    }
  };

  const handleEditar = (disp) => {
    setForm({
      fecha: dateToInput(disp.fecha),
      horaInicio: disp.horaInicio,
      horaFin: disp.horaFin,
      cantidadCanchas: disp.cantidadCanchas,
      duracionMinutos: disp.duracionMinutos,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fechas del torneo para el selector (range)
  const fechaMin = campeonato ? dateToInput(campeonato.fechaInicio) : '';
  const fechaMax = campeonato ? dateToInput(campeonato.fechaFin) : '';

  // Calcular total de slots disponibles
  const totalSlots = disponibilidades.reduce((acc, d) => acc + calcularSlots(d), 0);

  if (loading || !campeonato) return <div className="text-slate-500">Cargando...</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link to={`/admin/campeonatos/${id}/partidos`} className="text-blue-600 hover:underline text-sm">
          ← Volver a Partidos
        </Link>
        <h1 className="text-2xl font-bold mt-1">{campeonato.nombre} — Canchas y Horarios</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configurá los días disponibles, la cantidad de canchas y la duración de cada partido.
          Luego usá "Asignar horarios" en la página de partidos para distribuir automáticamente.
        </p>
      </div>

      {mensaje.texto && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {form.fecha && disponibilidades.find((d) => dateToInput(d.fecha) === form.fecha)
            ? 'Editar disponibilidad'
            : 'Agregar disponibilidad'}
        </h2>
        <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              min={fechaMin}
              max={fechaMax}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              required
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Canchas disponibles</label>
            <input
              type="number" min={1} max={50}
              value={form.cantidadCanchas}
              onChange={(e) => setForm((f) => ({ ...f, cantidadCanchas: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hora inicio</label>
            <input
              type="time"
              value={form.horaInicio}
              onChange={(e) => setForm((f) => ({ ...f, horaInicio: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hora fin</label>
            <input
              type="time"
              value={form.horaFin}
              onChange={(e) => setForm((f) => ({ ...f, horaFin: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium mb-1">Duración por partido (minutos)</label>
            <select
              value={form.duracionMinutos}
              onChange={(e) => setForm((f) => ({ ...f, duracionMinutos: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value={60}>60 min (1 hora)</option>
              <option value={90}>90 min (1h 30min)</option>
              <option value={120}>120 min (2 horas)</option>
              <option value={150}>150 min (2h 30min)</option>
              <option value={180}>180 min (3 horas)</option>
            </select>
          </div>

          <div className="col-span-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {form.horaInicio && form.horaFin && form.cantidadCanchas && form.duracionMinutos
                ? (() => {
                    const [hI, mI] = form.horaInicio.split(':').map(Number);
                    const [hF, mF] = form.horaFin.split(':').map(Number);
                    const dur = parseInt(form.duracionMinutos, 10);
                    const slots = Math.floor(((hF * 60 + mF) - (hI * 60 + mI)) / dur);
                    const total = slots * parseInt(form.cantidadCanchas, 10);
                    return `${slots} turnos × ${form.cantidadCanchas} canchas = ${total} partidos posibles`;
                  })()
                : ''}
            </p>
            <div className="flex gap-2">
              {form.fecha && (
                <button type="button" onClick={() => setForm(FORM_EMPTY)}
                  className="px-4 py-2 rounded-lg bg-slate-200 text-sm hover:bg-slate-300">
                  Cancelar
                </button>
              )}
              <button
                type="submit" disabled={guardando}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Lista de disponibilidades */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Días configurados</h2>
          {totalSlots > 0 && (
            <span className="text-sm text-slate-500">{totalSlots} partidos posibles en total</span>
          )}
        </div>

        {disponibilidades.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay disponibilidad cargada todavía.</p>
        ) : (
          <div className="space-y-3">
            {disponibilidades.map((d) => {
              const slots = calcularSlots(d);
              return (
                <div key={d.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                  <div>
                    <p className="font-medium text-sm capitalize">{formatFecha(d.fecha)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {d.horaInicio} – {d.horaFin} · {d.cantidadCanchas} {d.cantidadCanchas === 1 ? 'cancha' : 'canchas'} · {d.duracionMinutos} min/partido
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">{slots} partidos posibles</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditar(d)}
                      className="px-3 py-1 rounded bg-slate-200 text-xs hover:bg-slate-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(d.id)}
                      className="px-3 py-1 rounded bg-red-100 text-red-700 text-xs hover:bg-red-200"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
