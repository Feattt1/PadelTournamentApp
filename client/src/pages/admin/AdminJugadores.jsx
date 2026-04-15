import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jugadoresApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';

export default function AdminJugadores() {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    categoria: 5,
    nivel: '',
  });
  const [mensaje, setMensaje] = useState(null);
  const { club } = useClub();

  const cargar = () => {
    jugadoresApi.list()
      .then(setJugadores)
      .catch(() => setJugadores([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    cargar();
  }, [club?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'categoria' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreando(true);
    setMensaje(null);
    try {
      const res = await jugadoresApi.createAdmin(form);
      setMensaje({
        tipo: 'success',
        texto: `Jugador creado. Email: ${res.usuario?.email}. Contraseña temporal: Padel2024 (el jugador puede cambiarla si entra)`,
      });
      setForm({ nombre: '', email: '', telefono: '', categoria: 5, nivel: '' });
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message || 'Error al crear' });
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Jugadores del club</h1>
        <Link to="/admin/campeonatos" className="text-blue-600 hover:underline text-sm">
          ← Volver a campeonatos
        </Link>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-lg mb-6 ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo jugador'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-xl border border-slate-200 max-w-lg">
          <h2 className="text-xl font-semibold mb-4">Crear jugador</h2>
          <p className="text-sm text-slate-600 mb-4">
            Crea jugadores para el club. Si no indicas email, se generará uno automático. Contraseña por defecto: Padel2024
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email (opcional)</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Si vacío, se genera automáticamente"
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                name="telefono"
                type="tel"
                value={form.telefono}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categoría (1-7)</label>
                <select name="categoria" value={form.categoria} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n}ª</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nivel</label>
                <input
                  name="nivel"
                  type="text"
                  value={form.nivel}
                  onChange={handleChange}
                  placeholder="Ej: Principiante"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>
            <button type="submit" disabled={creando} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
              {creando ? 'Creando...' : 'Crear jugador'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-500">Cargando...</div>
      ) : jugadores.length === 0 ? (
        <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-600">
          No hay jugadores. Crea el primero.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3">Nombre</th>
                <th className="p-3">Email</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((j) => (
                <tr key={j.id} className="border-t border-slate-200">
                  <td className="p-3 font-medium">{j.usuario?.nombre}</td>
                  <td className="p-3 text-slate-600">{j.usuario?.email}</td>
                  <td className="p-3 text-slate-600">{j.usuario?.telefono || '-'}</td>
                  <td className="p-3">{j.categoria}ª</td>
                  <td className="p-3 text-slate-600">{j.nivel || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
