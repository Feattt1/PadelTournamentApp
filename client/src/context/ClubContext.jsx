import { createContext, useContext, useState, useEffect } from 'react';

const ClubContext = createContext(null);
const CLUB_KEY = 'padel_club';

async function fetchClubs() {
  const res = await fetch('/api/clubs');
  if (res.ok) return res.json();
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || `Error ${res.status} al cargar clubes`);
}

export function ClubProvider({ children }) {
  const [club, setClub] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubsError, setClubsError] = useState(null);

  const loadClubs = () => {
    setClubsLoading(true);
    setClubsError(null);
    fetchClubs()
      .then((data) => {
        const list = data || [];
        setClubs(list);

        // Restaurar club guardado solo si todavía existe en la BD
        const saved = localStorage.getItem(CLUB_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const stillExists = list.find((c) => c.id === parsed.id);
            if (stillExists) {
              setClub(stillExists); // usa datos frescos
            } else {
              localStorage.removeItem(CLUB_KEY); // stale → re-selección
            }
          } catch {
            localStorage.removeItem(CLUB_KEY);
          }
        }
      })
      .catch((err) => {
        setClubsError(err?.message || 'No se pudo conectar con el servidor. ¿Está ejecutándose?');
        setClubs([]);
      })
      .finally(() => setClubsLoading(false));
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const selectClub = (c) => {
    setClub(c);
    localStorage.setItem(CLUB_KEY, JSON.stringify(c));
  };

  const clearClub = () => {
    setClub(null);
    localStorage.removeItem(CLUB_KEY);
  };

  return (
    <ClubContext.Provider value={{ club, clubs, clubsLoading, clubsError, loadClubs, selectClub, clearClub }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within ClubProvider');
  return ctx;
}
