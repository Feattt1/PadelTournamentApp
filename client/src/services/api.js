const API_URL = import.meta.env.VITE_API_URL || '/api';

function getClubId() {
  try {
    const saved = localStorage.getItem('padel_club');
    if (saved) {
      const club = JSON.parse(saved);
      return club?.id;
    }
  } catch {}
  return null;
}

function getHeaders(includeAuth = true) {
  const token = localStorage.getItem('padel_token');
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth && token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Error en la petición');
  return res.status === 204 ? null : data;
}

export const clubsApi = {
  list: () => request('/clubs'),
  create: (nombre) => request('/clubs', { method: 'POST', body: JSON.stringify({ nombre }) }),
  assignAdmin: (clubId, emailOrUsuarioId) => {
    const body = typeof emailOrUsuarioId === 'string' && emailOrUsuarioId.includes('@')
      ? { email: emailOrUsuarioId }
      : { usuarioId: emailOrUsuarioId };
    return request(`/clubs/${clubId}/admins`, { method: 'POST', body: JSON.stringify(body) });
  },
  listAdmins: (clubId) => request(`/clubs/${clubId}/admins`),
  delete: (id) => request(`/clubs/${id}`, { method: 'DELETE' }),
  setup: async (nombre) => {
    const res = await fetch(`${API_URL}/clubs/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error al crear club');
    return data;
  },
};

export const authApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: getHeaders(false),
    }),
  register: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: getHeaders(false),
    }),
  changePassword: (passwordActual, passwordNueva) =>
    request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ passwordActual, passwordNueva }),
    }),
};

export const campeonatosApi = {
  list: (params = {}) => {
    const clubId = getClubId();
    if (clubId) params.clubId = clubId;
    const q = new URLSearchParams(params).toString();
    return request(`/campeonatos${q ? '?' + q : ''}`)
      .then((res) => res?.data ?? res);
  },
  get: (id) => request(`/campeonatos/${id}`),
  create: (data) => {
    const clubId = getClubId();
    return request('/campeonatos', { method: 'POST', body: JSON.stringify({ ...data, clubId }) });
  },
  update: (id, data) => request(`/campeonatos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/campeonatos/${id}`, { method: 'DELETE' }),

  // Categorías
  listCategorias: (id) => request(`/campeonatos/${id}/categorias`),
  addCategoria: (id, data) =>
    request(`/campeonatos/${id}/categorias`, { method: 'POST', body: JSON.stringify(data) }),
  deleteCategoria: (id, catId) =>
    request(`/campeonatos/${id}/categorias/${catId}`, { method: 'DELETE' }),

  // Disponibilidad horaria
  listDisponibilidad: (id) => request(`/campeonatos/${id}/disponibilidad`),
  saveDisponibilidad: (id, data) =>
    request(`/campeonatos/${id}/disponibilidad`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDisponibilidad: (id, dispId) =>
    request(`/campeonatos/${id}/disponibilidad/${dispId}`, { method: 'DELETE' }),
  asignarHorarios: (id, categoriaId) =>
    request(`/campeonatos/${id}/partidos/asignar-horarios`, {
      method: 'POST',
      body: JSON.stringify(categoriaId ? { categoriaId } : {}),
    }),

  // Generación de fixtures
  generarGrupos: (id, cantidadGrupos, categoriaId) =>
    request(`/campeonatos/${id}/grupos`, {
      method: 'POST',
      body: JSON.stringify({ cantidadGrupos, ...(categoriaId ? { categoriaId } : {}) }),
    }),
  generarPartidosGrupos: (id, categoriaId) =>
    request(`/campeonatos/${id}/partidos/grupos`, {
      method: 'POST',
      body: JSON.stringify(categoriaId ? { categoriaId } : {}),
    }),
  generarEliminatorias: (id, categoriaId) =>
    request(`/campeonatos/${id}/partidos/eliminatorias`, {
      method: 'POST',
      body: JSON.stringify(categoriaId ? { categoriaId } : {}),
    }),
};

export const inscripcionesApi = {
  list: (params = {}, mis = false) => {
    if (mis) params.mis = 'true';
    const q = new URLSearchParams(params).toString();
    return request(`/inscripciones${q ? '?' + q : ''}`);
  },
  inscribir: (campeonatoId, parejaId, categoriaId) =>
    request('/inscripciones', {
      method: 'POST',
      body: JSON.stringify({ campeonatoId, parejaId, ...(categoriaId ? { categoriaId } : {}) }),
    }),
  eliminar: (id) => request(`/inscripciones/${id}`, { method: 'DELETE' }),
  actualizar: (id, estado) =>
    request(`/inscripciones/${id}`, { method: 'PUT', body: JSON.stringify({ estado }) }),
};

export const partidosApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/partidos${q ? '?' + q : ''}`)
      .then((res) => res?.data ?? res);
  },
  create: (data) => request('/partidos', { method: 'POST', body: JSON.stringify(data) }),
  // sets: [{gamesLocal, gamesVisitante}, ...] — uno por set jugado
  actualizarResultado: (id, sets) =>
    request(`/partidos/${id}/resultado`, { method: 'PUT', body: JSON.stringify({ sets }) }),
  actualizar: (id, data) =>
    request(`/partidos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  asignarHorario: (id, fechaHora, cancha) =>
    request(`/partidos/${id}/asignar-horario`, {
      method: 'POST',
      body: JSON.stringify({ fechaHora, cancha }),
    }),
  desasignarHorario: (id) =>
    request(`/partidos/${id}/horario`, { method: 'DELETE' }),
};

export const gruposApi = {
  list: (campeonatoId, categoriaId) => {
    const params = { campeonatoId };
    if (categoriaId) params.categoriaId = categoriaId;
    const q = new URLSearchParams(params).toString();
    return request(`/grupos?${q}`);
  },
  get: (id) => request(`/grupos/${id}`),
  crear: (campeonatoId, categoriaId, nombre) =>
    request('/grupos', { method: 'POST', body: JSON.stringify({ campeonatoId, categoriaId: categoriaId ?? null, nombre }) }),
  eliminar: (grupoId) =>
    request(`/grupos/${grupoId}`, { method: 'DELETE' }),
  agregarPareja: (grupoId, parejaId) =>
    request(`/grupos/${grupoId}/parejas`, { method: 'POST', body: JSON.stringify({ parejaId }) }),
  quitarPareja: (grupoId, parejaId) =>
    request(`/grupos/${grupoId}/parejas/${parejaId}`, { method: 'DELETE' }),
};

export const jugadoresApi = {
  list: () => {
    const clubId = getClubId();
    const q = clubId ? `?clubId=${clubId}` : '';
    return request(`/jugadores${q}`);
  },
  create: (data) => request('/jugadores', { method: 'POST', body: JSON.stringify(data) }),
  createAdmin: (data) => {
    const clubId = getClubId();
    return request('/jugadores/admin', { method: 'POST', body: JSON.stringify({ ...data, clubId }) });
  },
};

export const parejasApi = {
  list: () => {
    const clubId = getClubId();
    const q = clubId ? `?clubId=${clubId}` : '';
    return request(`/parejas${q}`);
  },
  create: (jugador1Id, jugador2Id, tipoPareja, nombre) => {
    const clubId = getClubId();
    return request('/parejas', {
      method: 'POST',
      body: JSON.stringify({ jugador1Id, jugador2Id, clubId, tipoPareja, nombre }),
    });
  },
  moverGrupo: (parejaId, grupoIdActual, grupoIdNuevo) =>
    request(`/parejas/${parejaId}/mover-grupo`, {
      method: 'POST',
      body: JSON.stringify({ grupoIdActual, grupoIdNuevo }),
    }),
};
