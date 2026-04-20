import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Clasificación de grupos (filtrable por categoría)
router.get('/', [
  query('campeonatoId').notEmpty(),
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

router.get('/:id', param('id').notEmpty(), async (req, res) => {
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

// ─── Crear grupo manualmente (admin) ─────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { campeonatoId, categoriaId, nombre } = req.body;
    if (!campeonatoId || !nombre?.trim()) {
      return res.status(400).json({ error: 'campeonatoId y nombre son requeridos' });
    }

    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campeonatoId },
      select: { clubId: true },
    });
    if (!campeonato) return res.status(404).json({ error: 'Campeonato no encontrado' });

    const esAdmin = req.user?.rol === 'ADMIN' || (req.user?.clubsAdmin || []).includes(campeonato.clubId);
    if (!esAdmin) return res.status(403).json({ error: 'No tienes permiso' });

    const grupo = await prisma.grupo.create({
      data: { campeonatoId, categoriaId: categoriaId ?? null, nombre: nombre.trim() },
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
        },
      },
    });
    res.status(201).json(grupo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Eliminar grupo (admin) — borra también sus partidos ─────────────────────
router.delete('/:id', authenticate, param('id').notEmpty(), async (req, res) => {
  try {
    const { id } = req.params;

    const grupo = await prisma.grupo.findUnique({
      where: { id },
      select: { campeonato: { select: { clubId: true } } },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const esAdmin = req.user?.rol === 'ADMIN' || (req.user?.clubsAdmin || []).includes(grupo.campeonato?.clubId);
    if (!esAdmin) return res.status(403).json({ error: 'No tienes permiso' });

    await prisma.$transaction([
      prisma.partido.deleteMany({ where: { grupoId: id } }),
      prisma.grupo.delete({ where: { id } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Grupo no encontrado' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Agregar pareja a un grupo (admin) ───────────────────────────────────────
router.post('/:id/parejas', authenticate, param('id').notEmpty(), async (req, res) => {
  try {
    const { id } = req.params;
    const { parejaId } = req.body;
    if (!parejaId) return res.status(400).json({ error: 'parejaId requerido' });

    const grupo = await prisma.grupo.findUnique({
      where: { id },
      select: { campeonato: { select: { clubId: true } } },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const esAdmin = req.user?.rol === 'ADMIN' || (req.user?.clubsAdmin || []).includes(grupo.campeonato?.clubId);
    if (!esAdmin) return res.status(403).json({ error: 'No tienes permiso' });

    const existe = await prisma.clasificacionGrupo.findUnique({
      where: { grupoId_parejaId: { grupoId: id, parejaId } },
    });
    if (existe) return res.status(400).json({ error: 'La pareja ya está en este grupo' });

    const clasificacion = await prisma.clasificacionGrupo.create({
      data: {
        grupoId: id, parejaId,
        puntos: 0, partidosJugados: 0, partidosGanados: 0,
        setsGanados: 0, setsPerdidos: 0, gamesGanados: 0, gamesPerdidos: 0,
      },
      include: {
        pareja: {
          include: {
            jugador1: { include: { usuario: { select: { nombre: true } } } },
            jugador2: { include: { usuario: { select: { nombre: true } } } },
          },
        },
      },
    });
    res.status(201).json(clasificacion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Quitar pareja de un grupo (admin) ───────────────────────────────────────
router.delete('/:id/parejas/:parejaId', authenticate, param('id').notEmpty(), async (req, res) => {
  try {
    const { id, parejaId } = req.params;

    const grupo = await prisma.grupo.findUnique({
      where: { id },
      select: { campeonato: { select: { clubId: true } } },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const esAdmin = req.user?.rol === 'ADMIN' || (req.user?.clubsAdmin || []).includes(grupo.campeonato?.clubId);
    if (!esAdmin) return res.status(403).json({ error: 'No tienes permiso' });

    await prisma.clasificacionGrupo.delete({
      where: { grupoId_parejaId: { grupoId: id, parejaId } },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'La pareja no está en este grupo' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Regenerar partidos de un grupo (borra existentes y recrea) ──────────────
router.post('/:id/regenerar-partidos', authenticate, param('id').notEmpty(), async (req, res) => {
  try {
    const { id } = req.params;

    const grupo = await prisma.grupo.findUnique({
      where: { id },
      select: {
        campeonatoId: true,
        categoriaId: true,
        nombre: true,
        campeonato: { select: { clubId: true } },
        clasificaciones: { select: { parejaId: true } },
      },
    });
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const esAdmin = req.user?.rol === 'ADMIN' || (req.user?.clubsAdmin || []).includes(grupo.campeonato?.clubId);
    if (!esAdmin) return res.status(403).json({ error: 'No tienes permiso' });

    const ps = grupo.clasificaciones.map((c) => c.parejaId);
    if (ps.length !== 3) {
      return res.status(400).json({
        error: `El grupo "${grupo.nombre}" tiene ${ps.length} pareja(s). Debe tener exactamente 3 para generar partidos.`,
      });
    }

    const [p1, p2, p3] = ps;
    const { campeonatoId, categoriaId } = grupo;

    await prisma.$transaction([
      prisma.partido.deleteMany({ where: { grupoId: id } }),
      prisma.partido.createMany({
        data: [
          { campeonatoId, categoriaId, grupoId: id, fase: 'GRUPOS', ordenRonda: 1, estado: 'PENDIENTE', parejaLocalId: p1, parejaVisitanteId: p2 },
          { campeonatoId, categoriaId, grupoId: id, fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: p3 },
          { campeonatoId, categoriaId, grupoId: id, fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: p3 },
        ],
      }),
    ]);

    res.json({ ok: true, mensaje: `Partidos del grupo "${grupo.nombre}" regenerados.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
