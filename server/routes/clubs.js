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
