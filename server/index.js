import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import clubsRoutes from './routes/clubs.js';
import campeonatosRoutes from './routes/campeonatos.js';
import jugadoresRoutes from './routes/jugadores.js';
import parejasRoutes from './routes/parejas.js';
import partidosRoutes from './routes/partidos.js';
import gruposRoutes from './routes/grupos.js';
import inscripcionesRoutes from './routes/inscripciones.js';
import notificacionesRoutes from './routes/notificaciones.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, mobile apps, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Auth: máx 10 intentos por 15 min por IP (protege contra brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

// API general: máx 300 requests por minuto por IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en un momento.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', apiLimiter);

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubsRoutes);
app.use('/api/campeonatos', campeonatosRoutes);
app.use('/api/jugadores', jugadoresRoutes);
app.use('/api/parejas', parejasRoutes);
app.use('/api/partidos', partidosRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
// En producción no expone detalles internos; en desarrollo sí.
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Errores de CORS lanzados arriba
  if (err.message?.startsWith('Origen no permitido')) {
    return res.status(403).json({ error: err.message });
  }

  const status = err.status || 500;
  const message = isProd && status === 500
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  res.status(status).json({ error: message });
});

const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor en http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

export default app;
