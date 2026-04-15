import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate, requireAdmin, requireClubAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Listar jugadores (filtro por clubId opcional)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { clubId } = req.query;
    const where = {};
    if (clubId) where.OR = [{ clubId }, { clubId: null }]; // jugadores del club o globales
    const jugadores = await prisma.jugador.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, telefono: true } },
      },
    });
    res.json(jugadores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear perfil de jugador (usuario actual)
router.post('/', authenticate, [
  body('categoria').isInt({ min: 1, max: 7 }),
  body('nivel').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existe = await prisma.jugador.findUnique({
      where: { usuarioId: req.user.id },
    });
    if (existe) return res.status(400).json({ error: 'Ya tienes perfil de jugador' });

    const jugador = await prisma.jugador.create({
      data: {
        usuarioId: req.user.id,
        categoria: req.body.categoria,
        nivel: req.body.nivel,
      },
      include: { usuario: { select: { nombre: true, email: true } } },
    });
    res.status(201).json(jugador);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin del club: crear jugador (Usuario + Jugador en un paso)
router.post('/admin', authenticate, requireClubAdmin, [
  body('nombre').trim().notEmpty(),
  body('clubId').isUUID(),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('telefono').optional().trim(),
  body('categoria').isInt({ min: 1, max: 7 }),
  body('nivel').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, telefono, categoria, nivel } = req.body;
    let email = req.body.email;
    if (!email) {
      email = `jugador_${Date.now()}@club.local`;
    }

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) return res.status(400).json({ error: 'El email ya está registrado. Usa otro o deja vacío.' });

    const passwordPorDefecto = 'Padel2024';
    const hashed = await bcrypt.hash(passwordPorDefecto, 10);

    const usuario = await prisma.usuario.create({
      data: {
        email,
        password: hashed,
        nombre,
        telefono: telefono || null,
        rol: 'JUGADOR',
      },
    });

    const jugador = await prisma.jugador.create({
      data: {
        usuarioId: usuario.id,
        clubId: req.body.clubId,
        categoria,
        nivel: nivel || null,
      },
      include: {
        usuario: { select: { id: true, nombre: true, email: true, telefono: true } },
      },
    });

    res.status(201).json({ ...jugador, passwordTemporal: passwordPorDefecto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar jugador
router.put('/:id', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    const esPropio = req.user.jugador?.id === id;
    const existente = await prisma.jugador.findUnique({ where: { id }, select: { clubId: true } });
    const esAdmin = req.user.rol === 'ADMIN' || (existente?.clubId && (req.user.clubsAdmin || []).includes(existente.clubId));
    if (!esPropio && !esAdmin) {
      return res.status(403).json({ error: 'Sin permiso para editar este jugador' });
    }
    const jugador = await prisma.jugador.update({
      where: { id },
      data: req.body,
    });
    res.json(jugador);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
