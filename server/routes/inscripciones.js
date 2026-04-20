import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate, requireClubAdmin, setClubIdFromInscripcion, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Listar inscripciones (opcional auth; mis=true requiere auth para filtrar por usuario)
router.get('/', optionalAuth, [
  query('campeonatoId').optional().notEmpty(),
  query('estado').optional().isIn(['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'LISTA_ESPERA']),
  query('mis').optional().isBoolean(),
], async (req, res) => {
  try {
    const { campeonatoId, estado, mis } = req.query;
    const where = {};
    if (campeonatoId) where.campeonatoId = campeonatoId;
    if (estado) where.estado = estado;

    // Filtrar solo inscripciones del usuario (parejas donde participa)
    if (mis === 'true' && req.user?.jugador?.id) {
      where.pareja = {
        OR: [
          { jugador1Id: req.user.jugador.id },
          { jugador2Id: req.user.jugador.id },
        ],
      };
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where,
      include: {
        campeonato: { select: { nombre: true, fechaInicio: true } },
        pareja: {
          include: {
            jugador1: { include: { usuario: { select: { nombre: true } } } },
            jugador2: { include: { usuario: { select: { nombre: true } } } },
          },
        },
      },
      orderBy: [{ posicionLista: 'asc' }, { fechaInscripcion: 'asc' }],
    });
    res.json(inscripciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inscribir pareja (jugador o admin; admin omite fechas/estado)
router.post('/', authenticate, [
  body('campeonatoId').notEmpty(),
  body('parejaId').isUUID(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { campeonatoId, parejaId, categoriaId } = req.body;
    const campeonato = await prisma.campeonato.findUnique({
      where: { id: campeonatoId },
    });
    if (!campeonato) return res.status(404).json({ error: 'Campeonato no encontrado' });

    const esAdminClub = req.user?.rol === 'ADMIN' || (campeonato.clubId && (req.user?.clubsAdmin || []).includes(campeonato.clubId));

    // Solo jugadores respetan fechas y estado; admin del club puede inscribir siempre
    if (!esAdminClub) {
      if (campeonato.estado !== 'INSCRIPCIONES') {
        return res.status(400).json({ error: 'El campeonato no está en período de inscripciones' });
      }
      const now = new Date();
      if (campeonato.fechaInscripcionInicio && now < campeonato.fechaInscripcionInicio) {
        return res.status(400).json({ error: 'El período de inscripciones aún no ha comenzado' });
      }
      if (campeonato.fechaInscripcionFin && now > campeonato.fechaInscripcionFin) {
        return res.status(400).json({ error: 'El período de inscripciones ha terminado' });
      }
    }

    const inscripcion = await prisma.$transaction(async (tx) => {
      const existe = await tx.inscripcion.findUnique({
        where: { campeonatoId_parejaId_categoriaId: { campeonatoId, parejaId, categoriaId: categoriaId ?? null } },
      });
      if (existe) throw Object.assign(new Error('Esta pareja ya está inscrita'), { statusCode: 400 });

      const countAceptadas = await tx.inscripcion.count({
        where: { campeonatoId, estado: 'ACEPTADA' },
      });
      let estado = 'ACEPTADA';
      let posicionLista = null;
      if (campeonato.maxParejas && countAceptadas >= campeonato.maxParejas) {
        estado = 'LISTA_ESPERA';
        const countEspera = await tx.inscripcion.count({
          where: { campeonatoId, estado: 'LISTA_ESPERA' },
        });
        posicionLista = countEspera + 1;
      }

      return tx.inscripcion.create({
        data: { campeonatoId, parejaId, categoriaId: categoriaId ?? null, estado, posicionLista },
        include: {
          campeonato: { select: { nombre: true } },
          pareja: {
            include: {
              jugador1: { include: { usuario: { select: { nombre: true } } } },
              jugador2: { include: { usuario: { select: { nombre: true } } } },
            },
          },
        },
      });
    }, { isolationLevel: 'Serializable' });

    res.status(201).json(inscripcion);
  } catch (err) {
    if (err.statusCode === 400 || err.code === 'P2002') {
      return res.status(400).json({ error: err.message || 'Esta pareja ya está inscrita' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Eliminar inscripción (admin del club)
router.delete('/:id', authenticate, setClubIdFromInscripcion, requireClubAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.inscripcion.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Inscripción no encontrada' });
    res.status(500).json({ error: err.message });
  }
});

// Aceptar/rechazar inscripción (admin del club)
router.put('/:id', authenticate, setClubIdFromInscripcion, requireClubAdmin, param('id').isUUID(), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['ACEPTADA', 'RECHAZADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const inscripcion = await prisma.inscripcion.update({
      where: { id },
      data: {
        estado,
        posicionLista: estado === 'ACEPTADA' ? null : undefined,
      },
      include: {
        pareja: true,
        campeonato: true,
      },
    });
    res.json(inscripcion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
