import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { campeonatosApi } from '../../services/api';

const MODALIDAD_OPTS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'MIXTO', label: 'Mixto' },
];

function categoriaLabel(cat) {
  const m = MODALIDAD_OPTS.find((o) => o.value === cat.modalidad)?.label ?? cat.modalidad;
  return cat.nombre || `${cat.categoria}ta ${m}`;
}

export default function AdminCampeonatoEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esNuevo = !id || id === 'nuevo';

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    fechaInicio: '',
    fechaFin: '',
    fechaInscripcionInicio: '',
    fechaInscripcionFin: '',
    estado: 'INSCRIPCIONES',
  });

  // Categorías del torneo
  const [categorias, setCategorias] = useState([]); // [{ categoria, modalidad, maxParejas, nombre }]
  const [catForm, setCatForm] = useState({ categoria: 5, modalidad: 'MASCULINO', maxParejas: '' });
  const [guardandoCat, setGuardandoCat] = useState(false);

  const [loading, setLoading] = useState(!esNuevo);
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');
  const [generandoGrupos, setGenerandoGrupos] = useState(false);
  const [generandoPartidos, setGenerandoPartidos] = useState(false);
  const [generandoEliminatorias, setGenerandoEliminatorias] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    if (esNuevo) return;
    campeonatosApi.get(id)
      .then((c) => {
        setForm({
          nombre: c.nombre ?? '',
          descripcion: c.descripcion ?? '',
          fechaInicio: c.fechaInicio ? c.fechaInicio.slice(0, 16) : '',
          fechaFin: c.fechaFin ? c.fechaFin.slice(0, 16) : '',
          fechaInscripcionInicio: c.fechaInscripcionInicio ? c.fechaInscripcionInicio.slice(0, 16) : '',
          fechaInscripcionFin: c.fechaInscripcionFin ? c.fechaInscripcionFin.slice(0, 16) : '',
          estado: c.estado ?? 'INSCRIPCIONES',
        });
        setCategorias(c.categorias ?? []);
      })
      .catch(() => setError('No se pudo cargar el campeonato'))
      .finally(() => setLoading(false));
  }, [id, esNuevo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const showMensaje = (texto, tipo = 'ok') => {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = {
        ...form,
        fechaInicio: new Date(form.fechaInicio).toISOString(),
        fechaFin: new Date(form.fechaFin).toISOString(),
        fechaInscripcionInicio: form.fechaInscripcionInicio ? new Date(form.fechaInscripcionInicio).toISOString() : null,
        fechaInscripcionFin: form.fechaInscripcionFin ? new Date(form.fechaInscripcionFin).toISOString() : null,
      };
      if (esNuevo) {
        // Al crear, incluir categorías directamente
        data.categorias = categorias.map((c) => ({
          categoria: c.categoria,
          modalidad: c.modalidad,
          maxParejas: c.maxParejas || null,
          nombre: c.nombre || null,
        }));
        const c = await campeonatosApi.create(data);
        navigate(`/admin/campeonatos/${c.id}`);
      } else {
        await campeonatosApi.update(id, data);
        showMensaje('Campeonato actualizado.');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm(`¿Eliminar "${form.nombre}"? Se borrarán todas las inscripciones, grupos y partidos.`)) return;
    setEliminando(true);
    try {
      await campeonatosApi.delete(id);
      navigate('/admin/campeonatos');
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  // ── Gestión de categorías ──────────────────────────────────────────────────

  const handleAgregarCategoria = async () => {
    const cat = parseInt(catForm.categoria, 10);
    const dup = categorias.find((c) => c.categoria === cat && c.modalidad === catForm.modalidad);
    if (dup) { alert('Ya agregaste esa categoría/modalidad'); return; }

    if (!esNuevo) {
      // Persiste directamente al servidor
      setGuardandoCat(true);
      try {
        const nueva = await campeonatosApi.addCategoria(id, {
          categoria: cat,
          modalidad: catForm.modalidad,
          maxParejas: catForm.maxParejas ? parseInt(catForm.maxParejas, 10) : undefined,
        });
        setCategorias((prev) => [...prev, nueva]);
        setCatForm({ categoria: 5, modalidad: 'MASCULINO', maxParejas: '' });
      } catch (err) {
        alert(err.message || 'Error al agregar categoría');
      } finally {
        setGuardandoCat(false);
      }
    } else {
      // Solo en memoria hasta guardar
      setCategorias((prev) => [...prev, {
        categoria: cat,
        modalidad: catForm.modalidad,
        maxParejas: catForm.maxParejas ? parseInt(catForm.maxParejas, 10) : null,
        _temp: true,
      }]);
      setCatForm({ categoria: 5, modalidad: 'MASCULINO', maxParejas: '' });
    }
  };

  const handleEliminarCategoria = async (cat) => {
    if (cat._temp) {
      setCategorias((prev) => prev.filter((c) => c !== cat));
      return;
    }
    if (!confirm(`¿Eliminar "${categoriaLabel(cat)}"? Esto borrará todos los grupos y partidos de esa categoría.`)) return;
    try {
      await campeonatosApi.deleteCategoria(id, cat.id);
      setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      alert(err.message || 'Error al eliminar categoría');
    }
  };

  // ── Fixtures ───────────────────────────────────────────────────────────────

  const handleGenerarGrupos = async (categoriaId) => {
    const cant = prompt('¿Cuántos grupos?', '2');
    if (!cant || isNaN(parseInt(cant, 10))) return;
    setGenerandoGrupos(true);
    try {
      await campeonatosApi.generarGrupos(id, parseInt(cant, 10), categoriaId);
      showMensaje('Grupos generados.');
    } catch (err) {
      alert(err.message || 'Error al generar grupos');
    } finally {
      setGenerandoGrupos(false);
    }
  };

  const handleGenerarPartidosGrupos = async (categoriaId) => {
    setGenerandoPartidos(true);
    try {
      const res = await campeonatosApi.generarPartidosGrupos(id, categoriaId);
      showMensaje(`${res.creados} partido(s) de grupos generados.`);
    } catch (err) {
      alert(err.message || 'Error al generar partidos de grupos');
    } finally {
      setGenerandoPartidos(false);
    }
  };

  const handleGenerarEliminatorias = async (categoriaId) => {
    setGenerandoEliminatorias(true);
    try {
      const res = await campeonatosApi.generarEliminatorias(id, categoriaId);
      showMensaje(`Bracket generado: ${res.creados} partido(s) de eliminatorias.`);
    } catch (err) {
      alert(err.message || 'Error al generar eliminatorias');
    } finally {
      setGenerandoEliminatorias(false);
    }
  };

  if (loading) return <div className="text-slate-500">Cargando...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">
        {esNuevo ? 'Nuevo torneo' : 'Editar torneo'}
      </h1>

      {error && <div className="p-3 rounded-lg bg-red-100 text-red-700 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del torneo</label>
          <input
            name="nombre" type="text" value={form.nombre} onChange={handleChange} required
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción (opcional)</label>
          <textarea
            name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
            className="w-full px-4 py-2 rounded-lg border border-slate-300"
          />
        </div>

        {/* Fechas del torneo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inicio del torneo</label>
            <input name="fechaInicio" type="datetime-local" value={form.fechaInicio} onChange={handleChange} required
              className="w-full px-4 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fin del torneo</label>
            <input name="fechaFin" type="datetime-local" value={form.fechaFin} onChange={handleChange} required
              className="w-full px-4 py-2 rounded-lg border border-slate-300" />
          </div>
        </div>

        {/* Fechas inscripción */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inscripciones desde</label>
            <input name="fechaInscripcionInicio" type="datetime-local" value={form.fechaInscripcionInicio} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inscripciones hasta</label>
            <input name="fechaInscripcionFin" type="datetime-local" value={form.fechaInscripcionFin} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300" />
          </div>
        </div>

        {/* Estado (solo en edición) */}
        {!esNuevo && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select name="estado" value={form.estado} onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-300">
              <option value="INSCRIPCIONES">Inscripciones abiertas</option>
              <option value="EN_CURSO">En curso</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>
        )}

        {/* ── Categorías ── */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-slate-800">
            Categorías
            <span className="ml-2 text-xs font-normal text-slate-500">
              {categorias.length === 0 ? '(agregar al menos una)' : `${categorias.length} agregada${categorias.length > 1 ? 's' : ''}`}
            </span>
          </h2>

          {/* Lista de categorías */}
          {categorias.length > 0 && (
            <div className="space-y-2">
              {categorias.map((cat, i) => (
                <div key={cat.id ?? i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg">
                  <div>
                    <span className="font-medium text-sm">{categoriaLabel(cat)}</span>
                    {cat.maxParejas && (
                      <span className="ml-2 text-xs text-slate-500">máx. {cat.maxParejas} parejas</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!esNuevo && cat.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleGenerarGrupos(cat.id)}
                          disabled={generandoGrupos}
                          className="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
                        >
                          Grupos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerarPartidosGrupos(cat.id)}
                          disabled={generandoPartidos}
                          className="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
                        >
                          Partidos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerarEliminatorias(cat.id)}
                          disabled={generandoEliminatorias}
                          className="text-xs px-2 py-1 rounded bg-slate-200 hover:bg-slate-300 disabled:opacity-50"
                        >
                          Bracket
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEliminarCategoria(cat)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario para agregar categoría */}
          <div className="flex flex-wrap gap-2 pt-1">
            <select
              value={catForm.categoria}
              onChange={(e) => setCatForm((f) => ({ ...f, categoria: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n}ta categoría</option>
              ))}
            </select>
            <select
              value={catForm.modalidad}
              onChange={(e) => setCatForm((f) => ({ ...f, modalidad: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            >
              {MODALIDAD_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              type="number" min={1} placeholder="Máx parejas"
              value={catForm.maxParejas}
              onChange={(e) => setCatForm((f) => ({ ...f, maxParejas: e.target.value }))}
              className="w-32 px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            />
            <button
              type="button"
              onClick={handleAgregarCategoria}
              disabled={guardandoCat}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
            >
              {guardandoCat ? '...' : '+ Agregar'}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {mensaje.texto && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Botones principales */}
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : esNuevo ? 'Crear torneo' : 'Guardar cambios'}
          </button>

          {!esNuevo && (
            <Link
              to={`/admin/campeonatos/${id}/partidos`}
              className="px-6 py-2.5 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-600"
            >
              Ver partidos
            </Link>
          )}

          <Link to="/admin/campeonatos" className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
            Cancelar
          </Link>

          {!esNuevo && (
            <button
              type="button" onClick={handleEliminar} disabled={eliminando}
              className="px-6 py-2.5 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 disabled:opacity-50 ml-auto"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar torneo'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
