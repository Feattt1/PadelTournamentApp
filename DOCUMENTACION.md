# 🎾 Padel Championship Manager - Documentación Completa

## Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
4. [Configuración e Instalación](#configuración-e-instalación)
5. [Ejecución del Proyecto](#ejecución-del-proyecto)
6. [Estructura de Base de Datos](#estructura-de-base-de-datos)
7. [Guía de Desarrollo](#guía-de-desarrollo)
8. [API Endpoints](#api-endpoints)
9. [Flujos Principales](#flujos-principales)
10. [Deployment](#deployment)

---

## Visión General

**Padel Championship Manager** es una plataforma web completa para la gestión integral de campeonatos de pádel en clubes. Permite:

- ✅ Inscripción de parejas en campeonatos
- ✅ Organización de fases de grupos y eliminatorias
- ✅ Generación automática de grupos y cronogramas
- ✅ Registro de resultados y clasificaciones
- ✅ Sistema de roles (Admin de plataforma, Admin de club, Jugadores)
- ✅ Notificaciones y gestión de disponibilidad
- ✅ Interfaz responsive con Tailwind CSS

### Módulos Principales

1. **Autenticación & Usuarios**: Login, registro, roles
2. **Clubes**: Creación y gestión de clubes
3. **Campeonatos**: Creación y administración de torneos
4. **Jugadores & Parejas**: Perfiles de jugadores y parejas
5. **Inscripciones**: Sistema de inscripción en campeonatos
6. **Partidos & Resultados**: Registro de partidos y resultados
7. **Grupos & Clasificaciones**: Organización de fases y standings
8. **Notificaciones**: Sistema de notificaciones
9. **Horarios**: Disponibilidad de canchas y scheduling

---

## Stack Tecnológico

### Frontend
- **React 18.3.1** - Framework UI
- **Vite 6.0.1** - Build tool (HMR rápido, bundling optimizado)
- **React Router 6.28** - Rutas y navegación
- **Tailwind CSS 3.4.16** - Estilización
- **Axios** (implícito en `api.js`) - Llamadas HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express 4.21.1** - Framework web
- **Prisma 5.22.0** - ORM para MySQL
- **JWT (jsonwebtoken 9.0.2)** - Autenticación
- **bcryptjs 2.4.3** - Hashing de contraseñas
- **CORS** - Control de origen cruzado
- **Express Validator** - Validación de inputs
- **Express Rate Limit** - Protección contra ataques de fuerza bruta
- **Nodemon** - Auto-reload en desarrollo

### Base de Datos
- **MySQL** - Base de datos relacional
- **PlanetScale / Railway / MySQL** - En producción

---

## Arquitectura del Proyecto

```
padel-championship-manager/
├── client/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/                  # Páginas/Vistas
│   │   ├── components/             # Componentes reutilizables
│   │   ├── context/                # Context API (Auth, Club)
│   │   ├── services/               # Servicios API
│   │   ├── App.jsx                 # Componente raíz
│   │   ├── main.jsx                # Entry point
│   │   └── index.css               # Estilos globales
│   ├── index.html                  # HTML principal
│   ├── vite.config.js              # Configuración Vite
│   ├── tailwind.config.js          # Configuración Tailwind
│   └── package.json
│
├── server/                          # Backend (Node.js + Express)
│   ├── routes/                     # Endpoints API
│   ├── middleware/                 # Middlewares (auth, etc)
│   ├── config/                     # Configuración (DB)
│   ├── prisma/
│   │   ├── schema.prisma           # Modelo de datos
│   │   └── seed.js                 # Datos iniciales
│   ├── index.js                    # Servidor principal
│   ├── nodemon.json                # Config auto-reload
│   └── package.json
│
├── package.json                     # Workspace raíz (monorepo)
└── README.md                        # README original

```

### Arquitectura de Capas

```
Frontend (React)
├── Pages (UI y lógica de página)
├── Components (UI reutilizable)
├── Context (Estado global - Auth, Club)
└── Services (Llamadas a API)
         ↓
         API REST (Express)
├── Rutas (Endpoints)
├── Middleware (Auth, validación)
└── Lógica de negocio
         ↓
    Base de Datos (MySQL + Prisma)
```

---

## Configuración e Instalación

### Requisitos Previos
- Node.js 16+ y npm
- MySQL 8.0+ ejecutándose localmente o en servicio cloud (PlanetScale, Railway)
- Git

### Pasos de Instalación

#### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd padel-championship-manager
```

#### 2. Instalar dependencias (ambos workspaces)
```bash
npm install
```

#### 3. Configurar variables de entorno

Crear `server/.env`:
```env
# Database
DATABASE_URL="mysql://usuario:contraseña@localhost:3306/padel_db"

# JWT
JWT_SECRET="tu_secret_jwt_muy_seguro_aqui"

# CORS
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:4173"

# Environment
NODE_ENV="development"
PORT=3001
```

Crear `client/.env` (opcional, si necesitas URL de API no estándar):
```env
VITE_API_URL=http://localhost:3001/api
```

#### 4. Generar cliente Prisma
```bash
npm run db:generate
```

#### 5. Crear base de datos
```bash
npm run db:push
```

#### 6. (Opcional) Seedear datos iniciales
Crea 3 clubes de prueba:
```bash
npm run db:seed
```

---

## Ejecución del Proyecto

### Desarrollo (Cliente + Servidor)

```bash
npm run dev
```

Esto inicia:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

### Desarrollo Individual

```bash
# Solo cliente
npm run dev:client

# Solo servidor
npm run dev:server
```

### Production

```bash
# Build
npm run build

# Start
npm run start
```

### Otros Comandos Útiles

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar cambios de schema a DB
npm run db:push

# Seedear datos iniciales
npm run db:seed

# Crear migration (si lo necesitas)
npm run db:migrate -w server
```

---

## Estructura de Base de Datos

### Enums Principales

| Enum | Valores |
|------|---------|
| **Role** | ADMIN, JUGADOR, PUBLICO |
| **EstadoCampeonato** | BORRADOR, INSCRIPCIONES, EN_CURSO, FINALIZADO |
| **Modalidad** | MASCULINO, FEMENINO, MIXTO |
| **EstadoPartido** | PENDIENTE, EN_JUEGO, FINALIZADO |
| **FasePartido** | GRUPOS, CUARTOS, SEMIS, FINAL |
| **TipoPareja** | ABIERTO, MASCULINO, FEMENINO |
| **EstadoInscripcion** | PENDIENTE, ACEPTADA, RECHAZADA, LISTA_ESPERA |

### Modelos Principales

#### 🔐 Autenticación y Usuarios
- **Usuario**: Cuenta de usuario (email, contraseña, rol)
- **ClubAdmin**: Relación usuario-club para administradores

#### 🏢 Clubs
- **Club**: Club de pádel (nombre único)

#### 👥 Jugadores
- **Jugador**: Perfil de jugador (categoría 1-7, nivel)
- **Pareja**: Dupla de jugadores

#### 🏆 Campeonatos
- **Campeonato**: Torneo principal
- **CategoriaTorneo**: Categoría dentro de un campeonato (ej: "5ta Masculino")
- **Inscripcion**: Inscripción de una pareja en un campeonato

#### 🎮 Partidos y Resultados
- **Partido**: Partido entre dos parejas
- **SetResultado**: Resultado detallado de cada set (6-3, 4-6, etc)
- **Grupo**: Grupo de fase de grupos
- **ClasificacionGrupo**: Posición en la tabla de un grupo

#### 📅 Horarios
- **DisponibilidadHoraria**: Franjas disponibles de canchas por fecha

---

## Guía de Desarrollo

### Flujo de Desarrollo Típico

1. **Crear rama**: `git checkout -b feature/nombre-feature`
2. **Backend**:
   - Modificar `schema.prisma` si es necesario
   - `npm run db:generate` y `npm run db:push`
   - Crear/modificar rutas en `server/routes`
3. **Frontend**:
   - Crear componentes/páginas
   - Consumir API desde `client/src/services/api.js`
   - Usar Context para estado global
4. **Hacer commit**: `git commit -m "feat: descripción"`
5. **Push y crear PR**

### Convenciones de Código

**Nomenclatura:**
- Componentes React: `PascalCase` (ej: `UserProfile.jsx`)
- Funciones: `camelCase` (ej: `fetchUsers()`)
- Constantes: `UPPER_SNAKE_CASE` (ej: `API_URL`)
- Variables: `camelCase` (ej: `userName`)

**Estructura de Componentes:**
```jsx
import { useState } from 'react';

export default function MyComponent() {
  const [state, setState] = useState(null);

  return (
    <div className="...">
      {/* contenido */}
    </div>
  );
}
```

**Estructura de Rutas (Backend):**
```javascript
import express from 'express';

const router = express.Router();

// GET /api/recurso
router.get('/', (req, res) => {
  // lógica
});

// POST /api/recurso
router.post('/', (req, res) => {
  // lógica
});

export default router;
```

### Autenticación Frontend

El contexto `AuthContext` maneja:
- Login/logout
- Token JWT en localStorage
- Usuario actual

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();
  // ...
}
```

### Selección de Club

El contexto `ClubContext` maneja:
- Club seleccionado actual
- Cambio de club

```javascript
import { useClub } from './context/ClubContext';

function MyComponent() {
  const { club, setClub } = useClub();
  // ...
}
```

---

## API Endpoints

### Auth (`/api/auth`)
- `POST /register` - Registrar usuario
- `POST /login` - Login con email/contraseña
- `POST /logout` - Logout (limpia token frontend)

### Clubs (`/api/clubs`)
- `GET /` - Listar todos los clubs
- `GET /:id` - Obtener club específico
- `POST /` - Crear club (ADMIN only)
- `GET /:id/campeonatos` - Campeonatos del club

### Campeonatos (`/api/campeonatos`)
- `GET /` - Listar campeonatos
- `GET /:id` - Obtener detalle
- `POST /` - Crear campeonato
- `PUT /:id` - Actualizar campeonato
- `GET /:id/grupos` - Listar grupos
- `POST /:id/generar-grupos` - Generar grupos automáticamente
- `GET /:id/resultados` - Obtener resultados/clasificación

### Jugadores (`/api/jugadores`)
- `GET /` - Listar jugadores del tipo autenticado
- `POST /` - Crear perfil de jugador
- `GET /:id` - Obtener perfil

### Parejas (`/api/parejas`)
- `GET /` - Listar parejas
- `POST /` - Crear pareja
- `DELETE /:id` - Eliminar pareja

### Inscripciones (`/api/inscripciones`)
- `GET /campeonato/:id` - Listar inscripciones de un campeonato
- `POST /` - Inscribir pareja
- `PUT /:id` - Actualizar estado (aceptar/rechazar)
- `DELETE /:id` - Cancelar inscripción

### Partidos (`/api/partidos`)
- `GET /campeonato/:id` - Listar partidos del campeonato
- `GET /:id` - Obtener detalle
- `POST /` - Crear partido
- `PUT /:id` - Actualizar resultado
- `POST /:id/sets` - Registrar sets de un partido

### Grupos (`/api/grupos`)
- `GET /campeonato/:id` - Listar grupos de un campeonato
- `GET /:id/clasificacion` - Obtener tabla de posiciones

### Notificaciones (`/api/notificaciones`)
- `GET /` - Listar notificaciones del usuario
- `PUT /:id/leer` - Marcar como leída

### Horarios (`/api/`,) - Disponibilidad
- `GET /campeonato/:id` - Obtener disponibilidad
- `POST /` - Crear disponibilidad
- `PUT /:id` - Actualizar disponibilidad

---

## Flujos Principales

### 1. Registro y Login
```
1. Usuario en /register
2. POST /api/auth/register con email/contraseña
3. Token JWT se guarda en localStorage
4. Se activa AuthContext
5. Redirige a selector de club o home
```

### 2. Crear Campeonato
```
1. Admin en /admin/campeonatos
2. Formulario con: nombre, fechas, club, modalidad
3. POST /api/campeonatos
4. Campeonato creado en estado BORRADOR
5. Admin puede editar y luego cambiar a INSCRIPCIONES
```

### 3. Inscribir Pareja
```
1. Jugador debe tener Perfil de Jugador (categoría, nivel)
2. Jugador crea o selecciona Pareja
3. Pareja se inscribe en Campeonato (POST /api/inscripciones)
4. Inscripción queda PENDIENTE
5. Admin del club aprueba o rechaza (PUT /api/inscripciones/:id)
6. Si es aprobada → ACEPTADA (lista para particiapr)
```

### 4. Generar Grupos y Partidos
```
1. Admin finaliza inscripciones
2. Admin: POST /api/campeonatos/:id/generar-grupos
3. Backend crea Grupos y Partidos automáticamente
4. Se distribuyen parejas en grupos de forma equilibrada
5. Campeonato pasa a EN_CURSO
```

### 5. Registrar Resultados
```
1. Admin en /admin/partidos
2. Selecciona partido pendiente
3. Ingresa sets ganados (ej: 6-3, 4-6, 7-5)
4. POST /api/partidos/:id con resultado
5. Clasificación se actualiza automáticamente
6. Si termina la fase → genera siguientes fases (cuartos, semis, final)
```

---

## Deployment

### Frontend (Vercel)

1. Push código a GitHub
2. Conectar repo en Vercel
3. Configurar:
   - Framework: Vite
   - Build command: `npm run build -w client`
   - Output: `client/dist`
   - Environment: `VITE_API_URL=https://tu-backend.com/api`

### Backend (Vercel Serverless o Railway)

#### Opción A: Vercel Serverless
1. Estructurar como función serverless
2. Variables de entorno en Vercel dashboard
3. Database URL según tu proveedor

#### Opción B: Railway
1. Conectar repo GitHub
2. Seleccionar rama
3. Railway detectará `server/package.json`
4. Configurar variables de entorno
5. Database MySQL desde marketplace de Railway

### Base de Datos

**Opciones recomendadas:**
- **PlanetScale**: MySQL compatible, serverless
- **Railway**: MySQL managed
- **AWS RDS**: MySQL tradicional
- **Google Cloud SQL**: MySQL managed

**Configuración Database URL**:
```
mysql://usuario:contraseña@host:puerto/nombre_db
```

---

## Notas Importantes

### Seguridad
- ✅ Rate limiting en login/register
- ✅ Contraseñas hasheadas con bcrypt
- ✅ JWT para autorización
- ✅ CORS configurado según ambientes
- ⚠️ En producción: usar HTTPS, secrets seguros, validar todos los inputs

### Performance
- ✅ Vite para build rápido
- ✅ Lazy loading de rutas
- ✅ Prisma con caching
- ⚠️ Monitorear N+1 queries en reportes de partidos

### Testing
- Pendiente: Agregar test suites (Jest, Vitest)
- Pendiente: E2E tests (Playwright, Cypress)

---

## Contacto & Soporte

Para preguntas o issues, revisar:
- Code comments
- Archivos .md en repo
- Logs de servidor (`console.log` + debugging)

---

**Última actualización**: Abril 2026
