import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate, requireClubAdmin, setClubIdFromCampeonatoBody, setClubIdFromPartido } from '../middleware/auth.js';

const router = Router();

/**
 * Recalcula la clasificación de un grupo desde cero a partir de los partidos finalizados.
 * Idempotente. Usa los sets individuales (SetResultado) para sumar games.
 */
async function recalcularClasificacionGrupo(grupoId) {
  const [partidos, clasificaciones] = await Promise.all([
    prisma.partido.findMany({
      where: { grupoId, estado: 'FINALIZADO' },
      select: {
        parejaLocalId: true, parejaVisitanteId: true,
        setsLocal: true, setsVisitante: true,
        puntosLocal: true, puntosVisitante: true,
        sets: { select: { gamesLocal: true, gamesVisitante: true } },
      },
    }),
    prisma.clasificacionGrupo.findMany({ where: { grupoId }, select: { parejaId: true } }),
  ]);

  const stats = {};
  for (const c of clasificaciones) {
    stats[c.parejaId] = {
      puntos: 0, partidosJugados: 0, partidosGanados: 0,
      setsGanados: 0, setsPerdidos: 0, gamesGanados: 0, gamesPerdidos: 0,
    };
  }

  for (const p of partidos) {
    const { parejaLocalId: lId, parejaVisitanteId: vId } = p;
    if (!lId || !vId) continue;

    const sL = p.setsLocal ?? 0;
    const sV = p.setsVisitante ?? 0;

    // Sumar games desde los sets individuales, o usar puntosLocal/Visitante como fallback
    let gL = 0;
    let gV = 0;
    if (p.sets && p.sets.length > 0) {
      for (const s of p.sets) {
        gL += s.gamesLocal;
        gV += s.gamesVisitante;
      }
    } else {
      gL = p.puntosLocal ?? 0;
      gV = p.puntosVisitante ?? 0;
    }

    const localGana = sL !== sV ? sL > sV : gL > gV;

    if (stats[lId]) {
      stats[lId].partidosJugados += 1;
      if (localGana) { stats[lId].partidosGanados += 1; stats[lId].puntos += 3; }
      stats[lId].setsGanados += sL;
      stats[lId].setsPerdidos += sV;
      stats[lId].gamesGanados += gL;
      stats[lId].gamesPerdidos += gV;
    }
    if (stats[vId]) {
      stats[vId].partidosJugados += 1;
      if (!localGana) { stats[vId].partidosGanados += 1; stats[vId].puntos += 3; }
      stats[vId].setsGanados += sV;
      stats[vId].setsPerdidos += sL;
      stats[vId].gamesGanados += gV;
      stats[vId].gamesPerdidos += gL;
    }
  }

  await prisma.$transaction(
    Object.entries(stats).map(([parejaId, data]) =>
      prisma.clasificacionGrupo.updateMany({ where: { grupoId, parejaId }, data })
    )
  );
}

/**
 * Avanza automáticamente el ganador de un partido de eliminatorias al siguiente slot TBD.
 */
async function avanzarGanadorBracket(partido, setsLocal, setsVisitante, gamesLocal, gamesVisitante) {
  const sL = setsLocal ?? 0;
  const sV = setsVisitante ?? 0;
  const gL = gamesLocal ?? 0;
  const gV = gamesVisitante ?? 0;
  const localGana = sL !== sV ? sL > sV : gL > gV;
  const ganadorId = localGana ? partido.parejaLocalId : partido.parejaVisitanteId;
  if (!ganadorId) return;

  const sigFase = partido.fase === 'CUARTOS' ? 'SEMIS' : 'FINAL';
  const sigOrden = Math.ceil(partido.ordenRonda / 2);
  const esLocal = partido.ordenRonda % 2 === 1;

  const sigPartido = await prisma.partido.findFirst({
    where: { campeonatoId: partido.campeonatoId, categoriaId: partido.categoriaId ?? null, fase: sigFase, ordenRonda: sigOrden },
  });
  if (!sigPartido) return;

  await prisma.partido.update({
    where: { id: sigPartido.id },
    data: esLocal ? { parejaLocalId: ganadorId } : { parejaVisitanteId: ganadorId },
  });
}

// ─── Listar partidos ──────────────────────────────────────────────────────────
router.get('/', [
  query('campeonatoId').optional().notEmpty(),
  query('categoriaId').optional().isUUID(),
  query('grupoId').optional().isUUID(),
  query('fase').optional().isIn(['GRUPOS', 'CUARTOS', 'SEMIS', 'FINAL']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
], async (req, res) => {
  try {
    const { campeonatoId, categoriaId, grupoId, fase } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '100', 10);
    const skip = (page - 1) * limit;

    const where = {};
    if (campeonatoId) where.campeonatoId = campeonatoId;
    if (categoriaId) where.categoriaId = categoriaId;
    if (grupoId) where.grupoId = grupoId;
    if (fase) where.fase = fase;

    const [partidos, total] = await Promise.all([
      prisma.partido.findMany({
        where,
        include: {
          grupo: { select: { id: true, nombre: true } },
          parejaLocal: {
            include: {
              jugador1: { include: { usuario: { select: { nombre: true } } } },
              jugador2: { include: { usuario: { select: { nombre: true } } } },
            },
          },
          parejaVisitante: {
            include: {
              jugador1: { include: { usuario: { select: { nombre: true } } } },
              jugador2: { include: { usuario: { select: { nombre: true } } } },
            },
          },
          sets: { orderBy: { numeroSet: 'asc' } },
        },
        orderBy: [{ fase: 'asc' }, { fechaHora: 'asc' }, { ordenRonda: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.partido.count({ where }),
    ]);
    res.json({ data: partidos, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Crear partido (admin) ────────────────────────────────────────────────────
router.post('/', authenticate, setClubIdFromCampeonatoBody, requireClubAdmin, [
  body('campeonatoId').notEmpty(),
  body('categoriaId').optional().isUUID(),
  body('grupoId').optional().isUUID(),
  body('fase').isIn(['GRUPOS', 'CUARTOS', 'SEMIS', 'FINAL']),
  body('parejaLocalId').optional().isUUID(),
  body('parejaVisitanteId').optional().isUUID(),
  body('fechaHora').optional().isISO8601(),
  body('pista').optional().trim(),
  body('ordenRonda').optional().isInt(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { campeonatoId, categoriaId, grupoId, fase, parejaLocalId, parejaVisitanteId,
            fechaHora, pista, ordenRonda } = req.body;

    const partido = await prisma.partido.create({
      data: { campeonatoId, categoriaId, grupoId, fase, parejaLocalId, parejaVisitanteId,
              fechaHora, pista, ordenRonda },
      include: { parejaLocal: true, parejaVisitante: true, sets: true },
    });
    res.status(201).json(partido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cargar resultado con sets individuales (admin) ───────────────────────────
// Body: { sets: [{gamesLocal, gamesVisitante}, ...] }
// El ganador de cada set y el resultado global se calculan automáticamente.
router.put('/:id/resultado', authenticate, setClubIdFromPartido, requireClubAdmin, [
  param('id').isUUID(),
  body('sets').isArray({ min: 1, max: 5 }),
  body('sets.*.gamesLocal').isInt({ min: 0, max: 99 }),
  body('sets.*.gamesVisitante').isInt({ min: 0, max: 99 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { sets } = req.body; // [{gamesLocal, gamesVisitante}, ...]

    // Calcular quién ganó cada set y contar sets
    let setsLocal = 0;
    let setsVisitante = 0;
    let gamesLocal = 0;
    let gamesVisitante = 0;

    for (const s of sets) {
      const gL = parseInt(s.gamesLocal, 10);
      const gV = parseInt(s.gamesVisitante, 10);
      gamesLocal += gL;
      gamesVisitante += gV;
      // Gana el set quien tiene más games (en padel el set se gana por 6 o tiebreak)
      if (gL > gV) setsLocal += 1;
      else if (gV > gL) setsVisitante += 1;
    }

    if (setsLocal === setsVisitante) {
      return res.status(400).json({ error: 'El resultado no puede terminar en empate de sets' });
    }

    // Upsert de sets individuales dentro de una transacción
    const partido = await prisma.$transaction(async (tx) => {
      // Borrar sets anteriores y reescribir
      await tx.setResultado.deleteMany({ where: { partidoId: id } });
      await tx.setResultado.createMany({
        data: sets.map((s, i) => ({
          partidoId: id,
          numeroSet: i + 1,
          gamesLocal: parseInt(s.gamesLocal, 10),
          gamesVisitante: parseInt(s.gamesVisitante, 10),
        })),
      });

      return tx.partido.update({
        where: { id },
        data: {
          setsLocal,
          setsVisitante,
          puntosLocal: gamesLocal,
          puntosVisitante: gamesVisitante,
          estado: 'FINALIZADO',
        },
        include: {
          grupo: true,
          sets: { orderBy: { numeroSet: 'asc' } },
          parejaLocal: { include: { clasificaciones: true } },
          parejaVisitante: { include: { clasificaciones: true } },
        },
      });
    });

    // Recalcular clasificación si es partido de grupos
    if (partido.grupoId) {
      await recalcularClasificacionGrupo(partido.grupoId);
    }

    // Auto-rellenar M2 (ganador vs P3) y M3 (perdedor vs P3) después de cargar M1
    if (partido.fase === 'GRUPOS' && partido.ordenRonda === 1 && partido.grupoId) {
      const localGanaM1 = setsLocal !== setsVisitante ? setsLocal > setsVisitante : gamesLocal > gamesVisitante;
      const ganadorId = localGanaM1 ? partido.parejaLocalId : partido.parejaVisitanteId;
      const perdedorId = localGanaM1 ? partido.parejaVisitanteId : partido.parejaLocalId;

      const [m2, m3] = await Promise.all([
        prisma.partido.findFirst({ where: { grupoId: partido.grupoId, fase: 'GRUPOS', ordenRonda: 2 } }),
        prisma.partido.findFirst({ where: { grupoId: partido.grupoId, fase: 'GRUPOS', ordenRonda: 3 } }),
      ]);
      if (m2) await prisma.partido.update({ where: { id: m2.id }, data: { parejaLocalId: ganadorId } });
      if (m3) await prisma.partido.update({ where: { id: m3.id }, data: { parejaLocalId: perdedorId } });
    }

    // Auto-avanzar ganador en bracket de eliminatorias
    if (['CUARTOS', 'SEMIS'].includes(partido.fase) && partido.ordenRonda != null) {
      await avanzarGanadorBracket(partido, setsLocal, setsVisitante, gamesLocal, gamesVisitante);
    }

    res.json(partido);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Partido no encontrado' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Actualizar horario/pista (admin) ─────────────────────────────────────────
router.put('/:id', authenticate, setClubIdFromPartido, requireClubAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaHora, pista, parejaLocalId, parejaVisitanteId } = req.body;
    const data = {};
    if (fechaHora !== undefined) data.fechaHora = fechaHora;
    if (pista !== undefined) data.pista = pista;
    if (parejaLocalId !== undefined) data.parejaLocalId = parejaLocalId;
    if (parejaVisitanteId !== undefined) data.parejaVisitanteId = parejaVisitanteId;

    const partido = await prisma.partido.update({ where: { id }, data });
    res.json(partido);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Asignar horario con validación de conflictos ───────────────────────────────
router.post('/:id/asignar-horario', authenticate, setClubIdFromPartido, requireClubAdmin, [
  param('id').isUUID(),
  body('fechaHora').isISO8601(),
  body('cancha').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { fechaHora, cancha } = req.body;

    const partido = await prisma.partido.findUnique({ where: { id }, select: { campeonatoId: true } });
    if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });

    // Validar que no haya conflicto de cancha en el mismo horario
    const conflicto = await prisma.partido.findFirst({
      where: {
        campeonatoId: partido.campeonatoId,
        pista: cancha,
        fechaHora,
        id: { not: id }, // excluir el partido actual
      },
    });

    if (conflicto) {
      return res.status(409).json({ error: `Conflicto: ya hay un partido en cancha ${cancha} a las ${fechaHora}` });
    }

    const actualizado = await prisma.partido.update({
      where: { id },
      data: { fechaHora: new Date(fechaHora), pista: cancha },
      include: {
        grupo: true,
        parejaLocal: { select: { id: true, nombre: true } },
        parejaVisitante: { select: { id: true, nombre: true } },
      },
    });

    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Desasignar horario ──────────────────────────────────────────────────────────
router.delete('/:id/horario', authenticate, setClubIdFromPartido, requireClubAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    const actualizado = await prisma.partido.update({
      where: { id },
      data: { fechaHora: null, pista: null },
      include: { grupo: true, parejaLocal: true, parejaVisitante: true },
    });
    res.json(actualizado);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Partido no encontrado' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
