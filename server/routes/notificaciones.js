import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Mis notificaciones
router.get('/', authenticate, [
  query('leida').optional().isBoolean(),
], async (req, res) => {
  try {
    const { leida } = req.query;
    const where = { usuarioId: req.user.id };
    if (leida !== undefined) where.leida = leida === 'true';

    const notificaciones = await prisma.notificacion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notificaciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar como leída
router.put('/:id/leer', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await prisma.notificacion.findFirst({
      where: { id, usuarioId: req.user.id },
    });
    if (!notif) return res.status(404).json({ error: 'Notificación no encontrada' });

    await prisma.notificacion.update({
      where: { id },
      data: { leida: true },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Marcar todas como leídas
router.post('/leer-todas', authenticate, async (req, res) => {
  try {
    await prisma.notificacion.updateMany({
      where: { usuarioId: req.user.id },
      data: { leida: true },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
