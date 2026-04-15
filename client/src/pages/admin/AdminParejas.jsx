import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jugadoresApi, parejasApi } from '../../services/api';
import { useClub } from '../../context/ClubContext';

export default function AdminParejas() {
  const [jugadores, setJugadores] = useState([]);
  const [parejas, setParejas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ jugador1Id: '', jugador2Id: '', tipoPareja: 'ABIERTO', nombre: '' });
  const [error, setError] = useState('');
  const { club } = useClub();

  const cargar = () => {
    Promise.all([jugadoresApi.list(), parejasApi.list()])
      .then(([j, p]) => {
        setJugadores(j);
        setParejas(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    cargar();
  }, [club?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.jugador1Id === form.jugador2Id) {
      setError('Selecciona dos jugadores distintos');
      return;
    }
    setCreando(true);
    try {
      await parejasApi.create(form.jugador1Id, form.jugador2Id, form.tipoPareja, form.nombre || undefined);
      setForm({ jugador1Id: '', jugador2Id: '', tipoPareja: 'ABIERTO', nombre: '' });
      setMostrarForm(false);
      cargar();
    } catch (err) {
      setError(err.message || 'Error al crear pareja');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Parejas del club</h1>
        <Link to="/admin/campeonatos" className="text-blue-600 hover:underline text-sm">
          ← Volver a campeonatos
        </Link>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          {mostrarForm ? 'Cancelar' : '+ Nueva pareja'}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-xl border border-slate-200 max-w-lg">
          <h2 className="text-xl font-semibold mb-4">Crear pareja</h2>
          {error && <div className="p-3 rounded-lg bg-red-100 text-red-700 mb-4">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Jugador 1</label>
              <select
                value={form.jugador1Id}
                onChange={(e) => setForm((f) => ({ ...f, jugador1Id: e.target.value }))}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Selecciona</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.usuario?.nombre} (Cat. {j.categoria}ª)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jugador 2</label>
              <select
                value={form.jugador2Id}
                onChange={(e) => setForm((f) => ({ ...f, jugador2Id: e.target.value }))}
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Selecciona</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.usuario?.nombre} (Cat. {j.categoria}ª)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de pareja</label>
              <select
                value={form.tipoPareja}
                onChange={(e) => setForm((f) => ({ ...f, tipoPareja: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              >
                <option value="ABIERTO">Abierto</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre pareja (opcional)</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Los Campeones"
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <button type="submit" disabled={creando} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
              {creando ? 'Creando...' : 'Crear pareja'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-slate-500">Cargando...</div>
      ) : parejas.length === 0 ? (
        <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-600">
          No hay parejas. Crea jugadores primero y luego parejas.
        </div>
      ) : (
        <div className="space-y-2">
          {parejas.map((p) => (
            <div key={p.id} className="p-4 bg-white rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                {p.nombre && <span className="font-medium text-slate-800">{p.nombre} — </span>}
                <span className="text-slate-600">
                  {p.jugador1?.usuario?.nombre} / {p.jugador2?.usuario?.nombre}
                </span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {p.tipoPareja === 'ABIERTO' ? 'Abierto' : p.tipoPareja === 'MASCULINO' ? 'Masculino' : 'Femenino'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
