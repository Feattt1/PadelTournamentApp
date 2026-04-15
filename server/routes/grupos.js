import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Clasificación de grupos (filtrable por categoría)
router.get('/', [
  query('campeonatoId').isUUID(),
  query('categoriaId').optional().isUUID(),
], async (req, res) => {
  try {
    const { campeonatoId, categoriaId } = req.query;
    const where = { campeonatoId };
    if (categoriaId) where.categoriaId = categoriaId;
    const grupos = await prisma.grupo.findMany({
      where,
      include: {
        clasificaciones: {
          include: {
            pareja: {
              include: {
                jugador1: { include: { usuario: { select: { nombre: true } } } },
                jugador2: { include: { usuario: { select: { nombre: true } } } },
              },
            },
          },
          orderBy: [{ puntos: 'desc' }, { setsGanados: 'desc' }],
        },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(grupos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    const grupo = await prisma.grupo.findUnique({
      where: { id },
      include: {
        campeonato: true,
        clasificaciones: {
          include: {
            pareja: {
              include: {
                jugador1: { include: { usuario: { select: { nombre: true } } } },
                jugador2: { include: { usuario: { select: { nombre: true } } } },
              },
            },
          },
          orderBy: [{ puntos: 'desc' }],
        },
        partidos: {
          include: {
            parejaLocal: true,
            parejaVisitante: true,
          },
          orderBy: { fechaHora: 'asc' },
        },
      },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json(grupo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
