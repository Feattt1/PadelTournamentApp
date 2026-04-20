import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Listar clubes (público)
router.get('/', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    });
    res.json(clubs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear primer club (sin auth, solo cuando no hay ninguno)
router.post('/setup', [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const count = await prisma.club.count();
    if (count > 0) {
      return res.status(403).json({ error: 'Ya existen clubes. Usa el panel de admin.' });
    }

    const { nombre } = req.body;
    const club = await prisma.club.create({
      data: { nombre },
      select: { id: true, nombre: true },
    });
    res.status(201).json(club);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Asignar admin de club (solo admin plataforma). Acepta usuarioId o email
router.post('/:clubId/admins', authenticate, requireAdmin, [
  param('clubId').isUUID(),
  body('usuarioId').optional().isUUID(),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { clubId } = req.params;
    let usuarioId = req.body.usuarioId;
    if (!usuarioId && req.body.email) {
      const u = await prisma.usuario.findUnique({ where: { email: req.body.email } });
      if (!u) return res.status(404).json({ error: 'Usuario no encontrado con ese email' });
      usuarioId = u.id;
    }
    if (!usuarioId) return res.status(400).json({ error: 'Indica usuarioId o email' });

    const [club, usuario] = await Promise.all([
      prisma.club.findUnique({ where: { id: clubId } }),
      prisma.usuario.findUnique({ where: { id: usuarioId } }),
    ]);
    if (!club) return res.status(404).json({ error: 'Club no encontrado' });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const existente = await prisma.clubAdmin.findUnique({
      where: { usuarioId_clubId: { usuarioId, clubId } },
    });
    if (existente) return res.status(400).json({ error: 'Este usuario ya es admin del club' });

    const ca = await prisma.clubAdmin.create({
      data: { usuarioId, clubId },
      include: { usuario: { select: { id: true, nombre: true, email: true } }, club: { select: { id: true, nombre: true } } },
    });
    res.status(201).json(ca);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar admins de un club (admin plataforma o admin del club)
router.get('/:clubId/admins', authenticate, async (req, res) => {
  try {
    const { clubId } = req.params;
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ error: 'Club no encontrado' });

    const esAdminPlataforma = req.user?.rol === 'ADMIN';
    const esAdminClub = (req.user?.clubsAdmin || []).includes(clubId);
    if (!esAdminPlataforma && !esAdminClub) {
      return res.status(403).json({ error: 'No tienes permiso para ver los admins de este club' });
    }

    const admins = await prisma.clubAdmin.findMany({
      where: { clubId },
      include: { usuario: { select: { id: true, nombre: true, email: true } } },
    });
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar club (solo admin plataforma)
router.delete('/:id', authenticate, requireAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.club.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Club no encontrado' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Ranking anual del club ────────────────────────────────────────────────────
// GET /clubs/:clubId/ranking?year=2026&categoria=5&modalidad=MASCULINO
router.get('/:clubId/ranking', async (req, res) => {
  try {
    const { clubId } = req.params;
    const year      = parseInt(req.query.year) || new Date().getFullYear();
    const categoria = req.query.categoria ? parseInt(req.query.categoria) : undefined;
    const modalidad = req.query.modalidad || undefined;

    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear   = new Date(`${year}-12-31T23:59:59.999Z`);
    const campeonatoWhere = { clubId, fechaInicio: { gte: startOfYear, lte: endOfYear } };

    // Categorías disponibles este año para el selector del frontend
    const categoriasDisponibles = await prisma.categoriaTorneo.findMany({
      where: { campeonato: campeonatoWhere },
      select: { categoria: true, modalidad: true },
      distinct: ['categoria', 'modalidad'],
      orderBy: [{ categoria: 'asc' }, { modalidad: 'asc' }],
    });

    // Filtro de grupo con categoría opcional
    const grupoWhere = {
      campeonato: campeonatoWhere,
      ...(categoria !== undefined || modalidad
        ? { categoria: { categoria, ...(modalidad ? { modalidad } : {}) } }
        : {}),
    };

    const rows = await prisma.clasificacionGrupo.groupBy({
      by: ['parejaId'],
      where: { grupo: grupoWhere },
      _sum: {
        puntos: true, partidosJugados: true, partidosGanados: true,
        setsGanados: true, setsPerdidos: true, gamesGanados: true, gamesPerdidos: true,
      },
      _count: { grupoId: true },
      orderBy: [
        { _sum: { puntos: 'desc' } },
        { _sum: { setsGanados: 'desc' } },
        { _sum: { gamesGanados: 'desc' } },
      ],
    });

    const parejas = await prisma.pareja.findMany({
      where: { id: { in: rows.map((r) => r.parejaId) } },
      include: {
        jugador1: { include: { usuario: { select: { nombre: true } } } },
        jugador2: { include: { usuario: { select: { nombre: true } } } },
      },
    });
    const parejaMap = Object.fromEntries(parejas.map((p) => [p.id, p]));

    const ranking = rows.map((r) => ({
      parejaId: r.parejaId,
      pareja:          parejaMap[r.parejaId] ?? null,
      torneos:         r._count.grupoId,
      puntos:          r._sum.puntos          ?? 0,
      partidosJugados: r._sum.partidosJugados ?? 0,
      partidosGanados: r._sum.partidosGanados ?? 0,
      setsGanados:     r._sum.setsGanados     ?? 0,
      setsPerdidos:    r._sum.setsPerdidos    ?? 0,
      gamesGanados:    r._sum.gamesGanados    ?? 0,
      gamesPerdidos:   r._sum.gamesPerdidos   ?? 0,
    }));

    res.json({ year, clubId, ranking, categorias: categoriasDisponibles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear club (admin plataforma)
router.post('/', authenticate, requireAdmin, [
  body('nombre').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre } = req.body;
    const existe = await prisma.club.findUnique({ where: { nombre } });
    if (existe) return res.status(400).json({ error: 'Ya existe un club con ese nombre' });

    const club = await prisma.club.create({
      data: { nombre },
      select: { id: true, nombre: true },
    });
    res.status(201).json(club);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
