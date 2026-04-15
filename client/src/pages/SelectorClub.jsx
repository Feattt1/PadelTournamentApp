import { useState } from 'react';
import { useClub } from '../context/ClubContext';
import { clubsApi } from '../services/api';

function FormularioPrimerClub({ onCreado }) {
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreando(true);
    try {
      const club = await clubsApi.setup(nombre.trim());
      onCreado(club);
    } catch (err) {
      setError(err.message || 'Error al crear club');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Crear primer club</h2>
      <p className="text-sm text-slate-500 mb-6">No hay clubes registrados. Creá uno para comenzar.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del club"
          required
          className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-yellow-400 focus:outline-none font-medium"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={creando}
          className="w-full px-4 py-3 rounded-lg text-slate-900 font-bold bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 transition"
        >
          {creando ? 'Creando...' : 'Crear club'}
        </button>
      </form>
    </div>
  );
}

export default function SelectorClub() {
  const { clubs, clubsLoading, clubsError, loadClubs, selectClub } = useClub();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-slate-50">
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3 tracking-tight">
          Championship Padel
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Seleccioná tu club para acceder a torneos, partidos y cronogramas
        </p>
      </div>

      <div className="w-full max-w-4xl">
        {clubsLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-slate-500 font-medium">Cargando clubes...</p>
          </div>
        ) : clubsError ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-red-900 mb-2">Error de conexión</h2>
            <p className="text-red-700 mb-4">{clubsError}</p>
            <p className="text-sm text-slate-600 mb-6">
              Asegurate de que el servidor esté corriendo con <code className="bg-slate-100 px-2 py-1 rounded font-mono">npm run dev</code>
            </p>
            <button
              onClick={loadClubs}
              className="px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-bold transition"
            >
              Reintentar
            </button>
          </div>
        ) : clubs.length === 0 ? (
          <div className="flex justify-center">
            <FormularioPrimerClub onCreado={(c) => { loadClubs(); selectClub(c); }} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map((c) => (
              <button
                key={c.id}
                onClick={() => selectClub(c)}
                className="bg-white border border-slate-200 rounded-xl p-8 text-center font-bold text-lg hover:border-yellow-400 hover:shadow-md transition-all duration-200 group"
              >
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-medium">Club</p>
                <p className="text-2xl font-bold text-slate-900 group-hover:text-yellow-600 transition">{c.nombre}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-16 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Championship Padel</p>
      </div>
    </div>
  );
}
