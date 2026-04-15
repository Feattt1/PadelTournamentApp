# 📁 Guía de Áreas del Repositorio - Padel Championship Manager

## Estructura Completa

```
padel-championship-manager/
│
├── 📄 package.json                  # Workspace root (monorepo)
├── 📄 README.md                     # Overview original
├── 📄 DOCUMENTACION.md              # Este archivo (guía completa)
│
├── 📁 client/                       # ========== FRONTEND (React + Vite) ==========
│   ├── 📄 package.json              # Dependencias del cliente
│   ├── 📄 vite.config.js            # Configuración de Vite (HMR, puerto 5173)
│   ├── 📄 tailwind.config.js        # Configuración de Tailwind CSS
│   ├── 📄 postcss.config.js         # Configuración de PostCSS
│   ├── 📄 index.html                # Punto de entrada HTML
│   │
│   ├── 📁 public/                   # Archivos estáticos
│   │   └── (assets, favicons, etc)
│   │
│   └── 📁 src/                      # Código fuente del frontend
│       ├── 📄 main.jsx              # Entry point (ReactDOM.render)
│       ├── 📄 App.jsx               # Componente raíz (routing)
│       ├── 📄 index.css             # Estilos globales + Tailwind imports
│       │
│       ├── 📁 components/           # Componentes reutilizables
│       │   └── 📄 Layout.jsx        # Layout principal (navbar, footer, etc)
│       │
│       ├── 📁 context/              # Context API (estado global)
│       │   ├── 📄 AuthContext.jsx   # Contexto de autenticación (login, token, usuario)
│       │   └── 📄 ClubContext.jsx   # Contexto de cliente (club seleccionado)
│       │
│       ├── 📁 pages/                # Páginas/Vistas de la aplicación
│       │   ├── 📄 Home.jsx          # Página principal
│       │   ├── 📄 Login.jsx         # Página de login
│       │   ├── 📄 Register.jsx      # Página de registro
│       │   ├── 📄 SelectorClub.jsx  # Selector de club (si user es admin de múltiples)
│       │   ├── 📄 MiPerfil.jsx      # Perfil del usuario
│       │   ├── 📄 MisInscripciones.jsx # Mis inscripciones en campeonatos
│       │   ├── 📄 Campeonatos.jsx   # Listar campeonatos disponibles
│       │   ├── 📄 CampeonatoDetalle.jsx # Detalles de campeonato específico
│       │   │
│       │   └── 📁 admin/            # Vistas de administración
│       │       ├── 📄 AdminCampeonatos.jsx   # Gestionar campeonatos
│       │       ├── 📄 AdminCampeonatoEditar.jsx # Editar campeonato
│       │       ├── 📄 AdminPartidos.jsx      # Gestionar partidos y resultados
│       │       ├── 📄 AdminHorarios.jsx      # Gestionar disponibilidad
│       │       ├── 📄 AdminJugadores.jsx     # Gestionar jugadores del club
│       │       ├── 📄 AdminParejas.jsx       # Gestionar parejas del club
│       │       └── 📄 AdminClubs.jsx         # Gestionar clubs (superadmin)
│       │
│       └── 📁 services/             # Servicios de API y utilidades
│           └── 📄 api.js            # Cliente HTTP (Axios wrapper) para llamadas a backend
│
├── 📁 server/                       # ========== BACKEND (Node.js + Express) ==========
│   ├── 📄 index.js                  # Servidor principal (configuración Express, rutas)
│   ├── 📄 package.json              # Dependencias del servidor
│   ├── 📄 nodemon.json              # Configuración de auto-reload en desarrollo
│   │
│   ├── 📁 config/                   # Configuración
│   │   └── 📄 db.js                 # Inicialización de cliente Prisma
│   │
│   ├── 📁 middleware/               # Middlewares de Express
│   │   └── 📄 auth.js               # Middleware de autenticación JWT
│   │
│   ├── 📁 routes/                   # Endpoints API (rutas)
│   │   ├── 📄 auth.js               # POST /register, /login (autenticación)
│   │   ├── 📄 clubs.js              # GET/POST /clubs (gestión de clubes)
│   │   ├── 📄 campeonatos.js        # GET/POST/PUT /campeonatos (gestión de campeonatos)
│   │   ├── 📄 jugadores.js          # GET/POST /jugadores (perfiles de jugadores)
│   │   ├── 📄 parejas.js            # GET/POST/DELETE /parejas (gestión de parejas)
│   │   ├── 📄 inscripciones.js      # GET/POST/PUT /inscripciones (manejo de inscripciones)
│   │   ├── 📄 partidos.js           # GET/POST/PUT /partidos (casos/resultados)
│   │   ├── 📄 grupos.js             # GET /grupos, generación automática (fases de grupos)
│   │   └── 📄 notificaciones.js     # GET /notificaciones (sistema de notificaciones)
│   │
│   └── 📁 prisma/                   # Prisma ORM (Base de datos)
│       ├── 📄 schema.prisma         # Esquema de datos (modelos, enums, relaciones)
│       └── 📄 seed.js               # Script para poblar datos iniciales (3 clubs)
│
└── 📄 .gitignore                    # Archivos a ignorar en Git
```

---

## 📱 Frontend (`/client`)

### Propósito
Aplicación React interface para gestionar campeonatos de pádel. Permite jugadores e administradores interactuar con la plataforma.

### Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| **vite.config.js** | Configuración de Vite: puerto 5173, proxy, HMR |
| **tailwind.config.js** | Temas de Tailwind, extensiones personalizadas |
| **App.jsx** | Router principal, rutas privadas/públicas |
| **main.jsx** | ReactDOM render, providers (Auth, Club) |

### Carpeta `src/pages`
Cada archivo es una página/vista completa:
- **Home**: Dashboard con clubes, campeonatos
- **Login/Register**: Autenticación
- **Campeonatos**: Lista de torneos disponibles
- **CampeonatoDetalle**: Detalle de un campeonato específico (grupos, partidos, resultados)
- **MisInscripciones**: Lista de inscripciones del jugador
- **MiPerfil**: Perfil de usuario, datos personales
- **SelectorClub**: Cambiar entre múltiples clubes (si es admin)

### Carpeta `src/admin`
Vistas administrativas (requieren rol ADMIN de club):
- **AdminCampeonatos**: Crear, editar, listar campeonatos del club
- **AdminCampeonatoEditar**: Editar un campeonato (nombre, fechas, etc)
- **AdminPartidos**: Registrar resultados de partidos
- **AdminHorarios**: Gestionar disponibilidad de canchas
- **AdminJugadores**: Crear/editar perfiles de jugadores del club
- **AdminParejas**: Crear/editar parejas del club
- **AdminClubs**: Solo para superadmin (crear clubes)

### Contextos (`src/context`)

#### AuthContext
```javascript
// Maneja autenticación global
const { user, login, logout, loading, token } = useAuth();
```
- `user`: Objeto usuario (id, email, rol, clubsAdmin)
- `token`: JWT guardado en localStorage
- `login(email, password)`: Autentica y guarda token
- `logout()`: Limpia token y usuario

#### ClubContext
```javascript
// Maneja el club seleccionado
const { club, setClub } = useClub();
```
- `club`: Club actualmente seleccionado
- `setClub(clubId)`: Cambia club activo

### Servicios (`src/services`)

#### api.js
Cliente HTTP centralizado para todas las llamadas a backend:
```javascript
import api from './services/api.js';

// GET
const campeonatos = await api.get('/api/campeonatos');

// POST
await api.post('/api/inscripciones', { parejaId, campeonatoId });

// PUT
await api.put(`/api/partidos/${id}`, { setsLocal: 2, setsVisitante: 1 });
```

---

## 🖥️ Backend (`/server`)

### Propósito
API REST que gestiona toda la lógica de negocio, base de datos y validaciones. Comunica con frontend y base de datos MySQL.

### Archivo Principal: `index.js`

```javascript
// 1. Configuración de CORS - permite origen del frontend
// 2. Rate limiting - protege contra brute force
// 3. Parseo de JSON
// 4. Montaje de rutas (/api/auth, /api/clubs, etc)
// 5. Error handler global
// 6. Escucha en puerto 3001
```

### Carpeta `routes`
Cada archivo es un conjunto de endpoints relacionados:

#### auth.js
```
POST /api/auth/register      - Crear usuario
POST /api/auth/login         - Autenticar y obtener JWT
```

#### clubs.js
```
GET  /api/clubs              - Listar todos los clubs
GET  /api/clubs/:id          - Obtener un club
POST /api/clubs              - Crear nuevo club (ADMIN)
GET  /api/clubs/:id/campeonatos - Campeonatos del club
```

#### campeonatos.js
```
GET    /api/campeonatos                - Listar campeonatos
POST   /api/campeonatos                - Crear campeonato
GET    /api/campeonatos/:id            - Obtener detalle
PUT    /api/campeonatos/:id            - Actualizar campeonato
POST   /api/campeonatos/:id/generar-grupos   - Generar grupos automáticamente
GET    /api/campeonatos/:id/grupos     - Listar grupos
GET    /api/campeonatos/:id/clasificación - Tabla de posiciones
```

#### jugadores.js
```
GET  /api/jugadores          - Listar jugadores
POST /api/jugadores          - Crear perfil de jugador
GET  /api/jugadores/:id      - Obtener perfil
```

#### parejas.js
```
GET    /api/parejas          - Listar parejas
POST   /api/parejas          - Crear pareja
DELETE /api/parejas/:id      - Eliminar pareja
```

#### inscripciones.js
```
GET  /api/inscripciones/campeonato/:id  - Listar inscripciones
POST /api/inscripciones                 - Inscribir pareja
PUT  /api/inscripciones/:id             - Aceptar/rechazar/eliminar
```

#### partidos.js
```
GET  /api/partidos/campeonato/:id  - Listar partidos
GET  /api/partidos/:id             - Obtener detalle
POST /api/partidos                 - Crear partido
PUT  /api/partidos/:id             - Registrar resultado
POST /api/partidos/:id/sets        - Registrar sets individuales
```

#### grupos.js & notificaciones.js
```
Gestión de grupos y notificaciones
```

### Middleware (`/middleware`)

#### auth.js
Middleware para proteger rutas:
```javascript
// Verifica JWT en headers
// req.user contiene datos del usuario autenticado
import { autenticar } from '../middleware/auth.js';

router.get('/datos-protegidos', autenticar, (req, res) => {
  // Solo accesible con JWT válido
});
```

### Configuración (`/config`)

#### db.js
Inicializa cliente Prisma:
```javascript
import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
```

---

## 🗄️ Base de Datos (`/server/prisma`)

### schema.prisma
Definición del modelo de datos:

#### Enums
```prisma
enum Role { ADMIN, JUGADOR, PUBLICO }
enum EstadoCampeonato { BORRADOR, INSCRIPCIONES, EN_CURSO, FINALIZADO }
enum Modalidad { MASCULINO, FEMENINO, MIXTO }
enum EstadoPartido { PENDIENTE, EN_JUEGO, FINALIZADO }
enum FasePartido { GRUPOS, CUARTOS, SEMIS, FINAL }
enum EstadoInscripcion { PENDIENTE, ACEPTADA, RECHAZADA, LISTA_ESPERA }
```

#### Modelos Principales
```prisma
model Club { ... }                    # Club de pádel
model Usuario { ... }                # Usuario del sistema
model Jugador { ... }                # Perfil de jugador
model Pareja { ... }                 # Dupla de jugadores
model Campeonato { ... }             # Torneo
model CategoriaTorneo { ... }        # Categoría dentro de torneo
model Inscripcion { ... }            # Inscripción de pareja
model Grupo { ... }                  # Grupo en fase de grupos
model Partido { ... }                # Partido entre parejas
model SetResultado { ... }           # Resultado de cada set
model ClasificacionGrupo { ... }     # Tabla de posiciones
model DisponibilidadHoraria { ... }  # Disponibilidad de canchas
```

### seed.js
Script para poblar datos iniciales:
```bash
# Crea 3 clubes de ejemplo
npm run db:seed
```

---

## 🔄 Flujos de Datos Principales

### 1. Registro de Usuario
```
Frontend (Register.jsx)
    ↓ POST /api/auth/register
Backend (auth.js)
    ↓ Validar email
    ↓ Hash contraseña con bcrypt
    ↓ Guardar en BD
    ↓ Retornar JWT
Frontend (AuthContext)
    ↓ Guardar token en localStorage
    ↓ Redirigir a home
```

### 2. Inscribir Pareja en Campeonato
```
Frontend (CampeonatoDetalle.jsx)
    ↓ Selecciona pareja y campeonato
    ↓ POST /api/inscripciones
Backend (inscripciones.js)
    ↓ Validar pareja existe
    ↓ Validar campeonato existe
    ↓ Crear Inscripcion (estado: PENDIENTE)
    ↓ Enviar notificación a admin del club
Frontend
    ↓ Mostrar "Inscripción pendiente de aprobación"
```

### 3. Generar Grupos y Crear Partidos
```
Frontend (AdminCampeonatoEditar.jsx)
    ↓ Click en "Generar Grupos"
    ↓ POST /api/campeonatos/:id/generar-grupos
Backend (campeonatos.js)
    ↓ Obtener todas las inscripciones ACEPTADAS
    ↓ Dividir en grupos equitativos
    ↓ Para cada grupo, crear Partidos
    ↓ Asignar pares automáticamente
    ↓ Guardar en BD
Frontend
    ↓ Mostrar grupos generados
    ↓ Mostrar cronograma de partidos
```

### 4. Registrar Resultado de Partido
```
Frontend (AdminPartidos.jsx)
    ↓ Selecciona partido pendiente
    ↓ Ingresa sets (ej: 6-3, 4-6, 7-5)
    ↓ PUT /api/partidos/:id
Backend (partidos.js)
    ↓ Validar sets válidos
    ↓ Calcular ganador (mejor de 3 sets)
    ↓ Crear SetResultado para cada set
    ↓ Actualizar Partido (estado: FINALIZADO)
    ↓ Actualizar ClasificacionGrupo
Frontend
    ↓ Actualizar tabla de posiciones
    ↓ Mostrar tabla actualizada
```

---

## 🔐 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Crear clubes, asignar admins de club, ver todo |
| **ADMIN de Club** | Crear campeonatos, gestionar inscrip­ciones, registrar resultados, gestionar usuarios del club |
| **JUGADOR** | Crear perfil, crear parejas, inscribirse en campeonatos |
| **PUBLICO** | Ver campeonatos público (sin acciones) |

---

## 🚀 Scripts Importantes

```bash
# Desarrollo
npm run dev                    # Inicia cliente + servidor

# Base de datos
npm run db:generate           # Genera cliente Prisma
npm run db:push               # Aplica cambios a BD
npm run db:seed               # Crea datos iniciales

# Production
npm run build                 # Build cliente + servidor
npm run start                 # Inicia servidor produción
```

---

## 📊 Estado del Proyecto

| Área | Estado |
|------|--------|
| Core Features | ✅ Completo |
| UI/UX Frontend | ✅ Funcional |
| API Backend | ✅ Implementado |
| Base de Datos | ✅ Schema definido |
| Autenticación | ✅ JWT implementado |
| Tests | ⏳ Pendiente |
| Documentación | ✅ Completa |

---

## 🛠️ Tech Stack Resumido

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | Node.js + Express |
| **ORM** | Prisma |
| **Auth** | JWT + bcrypt |
| **DB** | MySQL |

---

## 📞 Navegación Rápida

- **Documentación Completa**: [DOCUMENTACION.md](DOCUMENTACION.md)
- **README Original**: [README.md](README.md)
- **Schema BD**: [server/prisma/schema.prisma](server/prisma/schema.prisma)
- **Rutas API**: [server/routes/](server/routes/)
- **Componentes**: [client/src/components/](client/src/components/)

---

**Última actualización**: Abril 2026
