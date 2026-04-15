import { useState, useEffect } from 'react';
import { jugadoresApi, parejasApi, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';

export default function MiPerfil() {
  const { user } = useAuth();
  const { club } = useClub();
  const [jugador, setJugador] = useState(null);
  const [parejas, setParejas] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creandoJugador, setCreandoJugador] = useState(false);
  const [creandoPareja, setCreandoPareja] = useState(false);
  const [formJugador, setFormJugador] = useState({ categoria: 5, nivel: '' });
  const [formPareja, setFormPareja] = useState({ jugador1Id: '', jugador2Id: '', nombre: '' });
  const [formPassword, setFormPassword] = useState({ actual: '', nueva: '', repetir: '' });
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  const cargar = async () => {
    try {
      const [jList, pList] = await Promise.all([
        jugadoresApi.list(),
        parejasApi.list(),
      ]);
      setJugadores(jList);
      setParejas(pList);
      const miJugador = jList.find((j) => j.usuario?.id === user?.id);
      setJugador(miJugador || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) cargar();
  }, [user, club?.id]);

  const handleCrearJugador = async (e) => {
    e.preventDefault();
    setCreandoJugador(true);
    try {
      await jugadoresApi.create(formJugador);
      await cargar();
    } catch (err) {
      alert(err.message || 'Error al crear perfil');
    } finally {
      setCreandoJugador(false);
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (formPassword.nueva !== formPassword.repetir) {
      alert('Las contraseñas nuevas no coinciden');
      return;
    }
    setCambiandoPassword(true);
    try {
      await authApi.changePassword(formPassword.actual, formPassword.nueva);
      setFormPassword({ actual: '', nueva: '', repetir: '' });
      alert('Contraseña actualizada correctamente');
    } catch (err) {
      alert(err.message || 'Error al cambiar contraseña');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const handleCrearPareja = async (e) => {
    e.preventDefault();
    if (!formPareja.jugador1Id || !formPareja.jugador2Id) {
      alert('Selecciona ambos jugadores');
      return;
    }
    if (formPareja.jugador1Id === formPareja.jugador2Id) {
      alert('Los dos jugadores deben ser distintos');
      return;
    }
    setCreandoPareja(true);
    try {
      await parejasApi.create(
        formPareja.jugador1Id,
        formPareja.jugador2Id,
        formPareja.nombre || undefined
      );
      setFormPareja({ jugador1Id: '', jugador2Id: '', nombre: '' });
      await cargar();
    } catch (err) {
      alert(err.message || 'Error al crear pareja');
    } finally {
      setCreandoPareja(false);
    }
  };

  if (loading) return <div className="text-slate-500">Cargando...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Mi perfil de jugador</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Perfil de jugador</h2>
        {jugador ? (
          <div className="p-4 bg-white rounded-xl border border-slate-200">
            <p><strong>Categoría:</strong> {jugador.categoria}ª</p>
            <p><strong>Nivel:</strong> {jugador.nivel || '-'}</p>
          </div>
        ) : (
          <form onSubmit={handleCrearJugador} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium mb-1">Categoría (1-7)</label>
              <select
                value={formJugador.categoria}
                onChange={(e) => setFormJugador((f) => ({ ...f, categoria: parseInt(e.target.value, 10) }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n}ª categoría</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nivel (opcional)</label>
              <input
                type="text"
                value={formJugador.nivel}
                onChange={(e) => setFormJugador((f) => ({ ...f, nivel: e.target.value }))}
                placeholder="ej: Principiante, Intermedio..."
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <button
              type="submit"
              disabled={creandoJugador}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {creandoJugador ? 'Creando...' : 'Crear perfil de jugador'}
            </button>
          </form>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleCambiarPassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium mb-1">Contraseña actual</label>
            <input
              type="password"
              value={formPassword.actual}
              onChange={(e) => setFormPassword((f) => ({ ...f, actual: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nueva contraseña (mín. 6 caracteres)</label>
            <input
              type="password"
              value={formPassword.nueva}
              onChange={(e) => setFormPassword((f) => ({ ...f, nueva: e.target.value }))}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Repetir nueva contraseña</label>
            <input
              type="password"
              value={formPassword.repetir}
              onChange={(e) => setFormPassword((f) => ({ ...f, repetir: e.target.value }))}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={cambiandoPassword}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {cambiandoPassword ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Mis parejas</h2>
        {parejas.length > 0 && (
          <div className="space-y-2 mb-6">
            {parejas.map((p) => (
              <div key={p.id} className="p-3 bg-white rounded-lg border border-slate-200">
                {p.nombre ? <p className="font-medium">{p.nombre}</p> : null}
                <p className="text-sm text-slate-600">
                  {p.jugador1?.usuario?.nombre} / {p.jugador2?.usuario?.nombre}
                </p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleCrearPareja} className="space-y-4 max-w-md">
          <p className="text-sm text-slate-600">
            Para crear una pareja, selecciona dos jugadores (deben tener perfil de jugador).
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Jugador 1</label>
              <select
                value={formPareja.jugador1Id}
                onChange={(e) => setFormPareja((f) => ({ ...f, jugador1Id: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Selecciona</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.usuario?.nombre} (Cat. {j.categoria})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jugador 2</label>
              <select
                value={formPareja.jugador2Id}
                onChange={(e) => setFormPareja((f) => ({ ...f, jugador2Id: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-slate-300"
              >
                <option value="">Selecciona</option>
                {jugadores.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.usuario?.nombre} (Cat. {j.categoria})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre pareja (opcional)</label>
            <input
              type="text"
              value={formPareja.nombre}
              onChange={(e) => setFormPareja((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej: Los Campeones"
              className="w-full px-4 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={creandoPareja}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {creandoPareja ? 'Creando...' : 'Crear pareja'}
          </button>
        </form>
      </section>
    </div>
  );
}
