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

function AccionBtn({ onClick, disabled, children, color = 'slate' }) {
  const colors = {
    slate:  'bg-slate-100 hover:bg-slate-200 text-slate-700',
    blue:   'bg-blue-100 hover:bg-blue-200 text-blue-700',
    green:  'bg-green-100 hover:bg-green-200 text-green-700',
    yellow: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-40 ${colors[color]}`}
    >
      {children}
    </button>
  );
}

export default function AdminCampeonatoEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const esNuevo = !id || id === 'nuevo';

  const [form, setForm] = useState({
    nombre: '', descripcion: '', imagenPortada: '',
    fechaInicio: '', fechaFin: '',
    fechaInscripcionInicio: '', fechaInscripcionFin: '',
    estado: 'INSCRIPCIONES',
  });

  const [categorias, setCategorias] = useState([]);
  const [catForm, setCatForm] = useState({ categoria: 5, modalidad: 'MASCULINO', maxParejas: '' });
  const [guardandoCat, setGuardandoCat] = useState(false);

  const [loading, setLoading] = useState(!esNuevo);
  const [saving, setSaving] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
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
          imagenPortada: c.imagenPortada ?? '',
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
        data.categorias = categorias.map((c) => ({
          categoria: c.categoria, modalidad: c.modalidad,
          maxParejas: c.maxParejas || null, nombre: c.nombre || null,
        }));
        const c = await campeonatosApi.create(data);
        navigate(`/admin/campeonatos/${c.id}`);
      } else {
        await campeonatosApi.update(id, data);
        showMensaje('Cambios guardados.');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizar = async () => {
    if (!confirm(`¿Finalizar "${form.nombre}"?\n\nEsto marcará el torneo como FINALIZADO.`)) return;
    setFinalizando(true);
    try {
      await campeonatosApi.update(id, { estado: 'FINALIZADO' });
      setForm((prev) => ({ ...prev, estado: 'FINALIZADO' }));
      showMensaje('¡Torneo finalizado!');
    } catch (err) {
      alert(err.message || 'Error al finalizar');
    } finally {
      setFinalizando(false);
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

  const handleAgregarCategoria = async () => {
    const cat = parseInt(catForm.categoria, 10);
    if (categorias.find((c) => c.categoria === cat && c.modalidad === catForm.modalidad)) {
      alert('Ya existe esa categoría/modalidad');
      return;
    }
    if (!esNuevo) {
      setGuardandoCat(true);
      try {
        const nueva = await campeonatosApi.addCategoria(id, {
          categoria: cat, modalidad: catForm.modalidad,
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
      setCategorias((prev) => [...prev, {
        categoria: cat, modalidad: catForm.modalidad,
        maxParejas: catForm.maxParejas ? parseInt(catForm.maxParejas, 10) : null,
        _temp: true,
      }]);
      setCatForm({ categoria: 5, modalidad: 'MASCULINO', maxParejas: '' });
    }
  };

  const handleEliminarCategoria = async (cat) => {
    if (cat._temp) { setCategorias((prev) => prev.filter((c) => c !== cat)); return; }
    if (!confirm(`¿Eliminar "${categoriaLabel(cat)}"? Esto borrará todos los grupos y partidos de esa categoría.`)) return;
    try {
      await campeonatosApi.deleteCategoria(id, cat.id);
      setCategorias((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (err) {
      alert(err.message || 'Error al eliminar categoría');
    }
  };

  const handleGenerarGrupos = async (categoriaId) => {
    const cant = prompt('¿Cuántos grupos?', '2');
    if (!cant || isNaN(parseInt(cant, 10))) return;
    setGenerandoGrupos(true);
    try {
      await campeonatosApi.generarGrupos(id, parseInt(cant, 10), categoriaId);
      showMensaje('Grupos generados correctamente.');
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
      alert(err.message || 'Error al generar partidos');
    } finally {
      setGenerandoPartidos(false);
    }
  };

  const handleGenerarEliminatorias = async (categoriaId) => {
    setGenerandoEliminatorias(true);
    try {
      const res = await campeonatosApi.generarEliminatorias(id, categoriaId);
      showMensaje(`Bracket generado: ${res.creados} partido(s).`);
    } catch (err) {
      alert(err.message || 'Error al generar bracket');
    } finally {
      setGenerandoEliminatorias(false);
    }
  };

  if (loading) return (
    <div className="max-w-2xl">
      <div className="h-4 w-40 bg-slate-200 rounded animate-pulse mb-6" />
      <div className="space-y-4">
        {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">

      {/* ── Navegación superior ── */}
      <div className="flex items-center justify-between mb-6">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link to="/admin/campeonatos" className="text-blue-600 hover:underline font-medium">
            ← Torneos
          </Link>
          {!esNuevo && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 truncate max-w-[180px]">{form.nombre || 'Editar'}</span>
            </>
          )}
        </nav>
        {!esNuevo && (
          <Link
            to={`/admin/campeonatos/${id}/partidos`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition"
          >
            Gestionar partidos →
          </Link>
        )}
      </div>

      {/* ── Título ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {esNuevo ? 'Nuevo torneo' : (form.nombre || 'Editar torneo')}
        </h1>
        {!esNuevo && (
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            form.estado === 'INSCRIPCIONES' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            form.estado === 'EN_CURSO'      ? 'bg-green-50 text-green-700 border-green-200' :
            'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {form.estado === 'INSCRIPCIONES' ? 'Inscripciones' : form.estado === 'EN_CURSO' ? 'En curso' : 'Finalizado'}
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {mensaje.texto && (
        <div className={`p-4 rounded-xl text-sm font-medium mb-6 ${
          mensaje.tipo === 'error'
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Datos básicos ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Datos del torneo</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del torneo *</label>
            <input
              name="nombre" type="text" value={form.nombre} onChange={handleChange} required
              placeholder="Ej: Copa Primavera 2026"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
              placeholder="Descripción opcional..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Imagen de portada (URL)</label>
            <input
              name="imagenPortada" type="url" value={form.imagenPortada} onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm"
            />
            {form.imagenPortada && (
              <div className="mt-2 rounded-lg overflow-hidden h-24 bg-slate-100">
                <img src={form.imagenPortada} alt="Portada" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inicio del torneo *</label>
              <input name="fechaInicio" type="datetime-local" value={form.fechaInicio} onChange={handleChange} required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin del torneo *</label>
              <input name="fechaFin" type="datetime-local" value={form.fechaFin} onChange={handleChange} required
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inscripciones desde</label>
              <input name="fechaInscripcionInicio" type="datetime-local" value={form.fechaInscripcionInicio} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inscripciones hasta</label>
              <input name="fechaInscripcionFin" type="datetime-local" value={form.fechaInscripcionFin} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
            </div>
          </div>

          {!esNuevo && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="INSCRIPCIONES">Inscripciones abiertas</option>
                <option value="EN_CURSO">En curso</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>
          )}
        </section>

        {/* ── Categorías ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Categorías</h2>
            <span className="text-xs text-slate-400">
              {categorias.length === 0 ? 'Ninguna agregada' : `${categorias.length} agregada${categorias.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {categorias.length > 0 && (
            <div className="space-y-3">
              {categorias.map((cat, i) => (
                <div key={cat.id ?? i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-sm text-slate-800">{categoriaLabel(cat)}</span>
                      {cat.maxParejas && (
                        <span className="ml-2 text-xs text-slate-500">máx. {cat.maxParejas} parejas</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEliminarCategoria(cat)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                    >
                      Eliminar
                    </button>
                  </div>

                  {!esNuevo && cat.id && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <AccionBtn onClick={() => handleGenerarGrupos(cat.id)} disabled={generandoGrupos} color="slate">
                        Generar grupos
                      </AccionBtn>
                      <AccionBtn onClick={() => handleGenerarPartidosGrupos(cat.id)} disabled={generandoPartidos} color="blue">
                        Generar partidos
                      </AccionBtn>
                      <AccionBtn onClick={() => handleGenerarEliminatorias(cat.id)} disabled={generandoEliminatorias} color="green">
                        Generar bracket
                      </AccionBtn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulario agregar categoría */}
          <div className="pt-2">
            <p className="text-xs font-medium text-slate-600 mb-2">Agregar categoría</p>
            <div className="flex flex-wrap gap-2">
              <select
                value={catForm.categoria}
                onChange={(e) => setCatForm((f) => ({ ...f, categoria: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {[1,2,3,4,5,6,7].map((n) => (
                  <option key={n} value={n}>{n}ta categoría</option>
                ))}
              </select>
              <select
                value={catForm.modalidad}
                onChange={(e) => setCatForm((f) => ({ ...f, modalidad: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {MODALIDAD_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                type="number" min={1} placeholder="Máx. parejas"
                value={catForm.maxParejas}
                onChange={(e) => setCatForm((f) => ({ ...f, maxParejas: e.target.value }))}
                className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <button
                type="button"
                onClick={handleAgregarCategoria}
                disabled={guardandoCat}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition"
              >
                {guardandoCat ? 'Agregando...' : '+ Agregar'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Acciones principales ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {saving ? 'Guardando...' : esNuevo ? 'Crear torneo' : 'Guardar cambios'}
            </button>

            {!esNuevo && form.estado === 'EN_CURSO' && (
              <button
                type="button" onClick={handleFinalizar} disabled={finalizando}
                className="px-6 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-500 disabled:opacity-50 transition"
              >
                {finalizando ? 'Finalizando...' : '🏆 Finalizar torneo'}
              </button>
            )}

            <Link
              to="/admin/campeonatos"
              className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
            >
              Cancelar
            </Link>

            {!esNuevo && (
              <button
                type="button" onClick={handleEliminar} disabled={eliminando}
                className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 disabled:opacity-40 transition ml-auto"
              >
                {eliminando ? 'Eliminando...' : 'Eliminar torneo'}
              </button>
            )}
          </div>
        </section>

      </form>
    </div>
  );
}
