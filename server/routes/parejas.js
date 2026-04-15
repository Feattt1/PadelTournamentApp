import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate, optionalAuth, requireClubAdminIfClub } from '../middleware/auth.js';

const router = Router();

// Listar parejas (clubId opcional para filtrar)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { clubId } = req.query;
    const where = clubId ? { OR: [{ clubId }, { clubId: null }] } : {};
    const parejas = await prisma.pareja.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        jugador1: { include: { usuario: { select: { nombre: true } } } },
        jugador2: { include: { usuario: { select: { nombre: true } } } },
      },
    });
    res.json(parejas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, requireClubAdminIfClub, [
  body('jugador1Id').isUUID(),
  body('jugador2Id').isUUID(),
  body('clubId').optional().isUUID(),
  body('tipoPareja').optional().isIn(['ABIERTO', 'MASCULINO', 'FEMENINO']),
  body('nombre').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { jugador1Id, jugador2Id, clubId, tipoPareja, nombre } = req.body;
    const [j1, j2] = [jugador1Id, jugador2Id].sort();
    const nombrePareja = nombre || null;

    const pareja = await prisma.pareja.create({
      data: {
        jugador1Id: j1,
        jugador2Id: j2,
        clubId: clubId || null,
        tipoPareja: tipoPareja || 'ABIERTO',
        nombre: nombrePareja,
      },
      include: {
        jugador1: { include: { usuario: { select: { nombre: true } } } },
        jugador2: { include: { usuario: { select: { nombre: true } } } },
      },
    });
    res.status(201).json(pareja);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Esta pareja ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ─── Mover pareja entre grupos ───────────────────────────────────────────────────
router.post('/:parejaId/mover-grupo', authenticate, [
  param('parejaId').isUUID(),
  body('grupoIdActual').isUUID(),
  body('grupoIdNuevo').isUUID(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { parejaId } = req.params;
    const { grupoIdActual, grupoIdNuevo } = req.body;

    // Validar que ambos grupos existan
    const [grupoActual, grupoNuevo] = await Promise.all([
      prisma.grupo.findUnique({ where: { id: grupoIdActual } }),
      prisma.grupo.findUnique({ where: { id: grupoIdNuevo } }),
    ]);

    if (!grupoActual || !grupoNuevo) {
      return res.status(404).json({ error: 'Uno o ambos grupos no encontrados' });
    }

    // Validar que sean del mismo campeonato
    if (grupoActual.campeonatoId !== grupoNuevo.campeonatoId) {
      return res.status(400).json({ error: 'Los grupos deben pertenecer al mismo campeonato' });
    }

    // Mover en clasificación
    await prisma.clasificacionGrupo.updateMany({
      where: { grupoId: grupoIdActual, parejaId },
      data: { grupoId: grupoIdNuevo },
    });

    // Reasignar partidos: los partidos donde participa en grupoActual pasan a grupoNuevo
    await prisma.partido.updateMany({
      where: {
        grupoId: grupoIdActual,
        OR: [{ parejaLocalId: parejaId }, { parejaVisitanteId: parejaId }],
      },
      data: { grupoId: grupoIdNuevo },
    });

    res.json({ success: true, mensaje: `Pareja movida de ${grupoActual.nombre} a ${grupoNuevo.nombre}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
