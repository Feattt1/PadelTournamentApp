import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import prisma from '../config/db.js';
import { authenticate, requireAdmin, requireClubAdmin, setClubIdFromCampeonato } from '../middleware/auth.js';

const router = Router();

// ─── Listar campeonatos ────────────────────────────────────────────────────────
router.get('/', [
  query('estado').optional().isIn(['INSCRIPCIONES', 'EN_CURSO', 'FINALIZADO']),
  query('clubId').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const { estado, clubId } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where = {};
    if (estado) where.estado = estado;
    if (clubId) where.clubId = clubId;

    const [campeonatos, total] = await Promise.all([
      prisma.campeonato.findMany({
        where,
        include: {
          creador: { select: { id: true, nombre: true } },
          categorias: { orderBy: [{ categoria: 'asc' }, { modalidad: 'asc' }] },
          _count: { select: { inscripciones: true } },
        },
        orderBy: { fechaInicio: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campeonato.count({ where }),
    ]);

    res.json({ data: campeonatos, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Ver un campeonato ─────────────────────────────────────────────────────────
router.get('/:id', param('id').notEmpty(), async (req, res) => {
  try {
    const { id } = req.params;
    const campeonato = await prisma.campeonato.findUnique({
      where: { id },
      include: {
        creador: { select: { id: true, nombre: true, email: true } },
        categorias: { orderBy: [{ categoria: 'asc' }, { modalidad: 'asc' }] },
        grupos: { include: { _count: { select: { partidos: true } } } },
        disponibilidades: { orderBy: { fecha: 'asc' } },
        pistas: {
          orderBy: { numero: 'asc' },
          include: { disponibilidades: true },
        },
        _count: { select: { inscripciones: true, partidos: true } },
      },
    });
    if (!campeonato) return res.status(404).json({ error: 'Campeonato no encontrado' });
    res.json(campeonato);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Crear campeonato ──────────────────────────────────────────────────────────
// Body: { nombre, clubId, descripcion, fechaInicio, fechaFin, categorias: [{categoria, modalidad, maxParejas}] }
router.post('/', authenticate, requireClubAdmin, [
  body('nombre').trim().notEmpty(),
  body('clubId').isUUID(),
  body('fechaInicio').isISO8601(),
  body('fechaFin').isISO8601(),
  body('fechaInscripcionInicio').optional().isISO8601(),
  body('fechaInscripcionFin').optional().isISO8601(),
  body('descripcion').optional().trim(),
  body('categorias').optional().isArray({ min: 1 }),
  body('categorias.*.categoria').optional().isInt({ min: 1, max: 7 }),
  body('categorias.*.modalidad').optional().isIn(['MASCULINO', 'FEMENINO', 'MIXTO']),
  body('categorias.*.maxParejas').optional().isInt({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, clubId, descripcion, fechaInicio, fechaFin,
            fechaInscripcionInicio, fechaInscripcionFin, categorias } = req.body;

    const campeonato = await prisma.campeonato.create({
      data: {
        nombre, clubId, descripcion, fechaInicio, fechaFin,
        fechaInscripcionInicio, fechaInscripcionFin,
        creadorId: req.user.id,
        categorias: categorias?.length
          ? { create: categorias.map((c) => ({
              categoria: c.categoria,
              modalidad: c.modalidad,
              maxParejas: c.maxParejas ?? null,
            })) }
          : undefined,
      },
      include: { categorias: true },
    });
    res.status(201).json(campeonato);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Eliminar campeonato ───────────────────────────────────────────────────────
router.delete('/:id', authenticate, setClubIdFromCampeonato(), requireClubAdmin, param('id').notEmpty(), async (req, res) => {
  try {
    await prisma.campeonato.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Campeonato no encontrado' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Actualizar campeonato ─────────────────────────────────────────────────────
router.put('/:id', authenticate, setClubIdFromCampeonato(), requireClubAdmin, [
  param('id').notEmpty(),
  body('nombre').optional().trim().notEmpty(),
  body('descripcion').optional().trim(),
  body('fechaInicio').optional().isISO8601(),
  body('fechaFin').optional().isISO8601(),
  body('fechaInscripcionInicio').optional().isISO8601(),
  body('fechaInscripcionFin').optional().isISO8601(),
  body('estado').optional().isIn(['INSCRIPCIONES', 'EN_CURSO', 'FINALIZADO']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { nombre, descripcion, fechaInicio, fechaFin,
            fechaInscripcionInicio, fechaInscripcionFin, estado } = req.body;

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (descripcion !== undefined) data.descripcion = descripcion;
    if (fechaInicio !== undefined) data.fechaInicio = fechaInicio;
    if (fechaFin !== undefined) data.fechaFin = fechaFin;
    if (fechaInscripcionInicio !== undefined) data.fechaInscripcionInicio = fechaInscripcionInicio;
    if (fechaInscripcionFin !== undefined) data.fechaInscripcionFin = fechaInscripcionFin;
    if (estado !== undefined) data.estado = estado;

    const campeonato = await prisma.campeonato.update({ where: { id }, data });
    res.json(campeonato);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Campeonato no encontrado' });
    res.status(500).json({ error: err.message });
  }
});

// ─── CATEGORÍAS ────────────────────────────────────────────────────────────────

// Listar categorías de un torneo
router.get('/:id/categorias', param('id').notEmpty(), async (req, res) => {
  try {
    const categorias = await prisma.categoriaTorneo.findMany({
      where: { campeonatoId: req.params.id },
      include: { _count: { select: { inscripciones: true, grupos: true } } },
      orderBy: [{ categoria: 'asc' }, { modalidad: 'asc' }],
    });
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar categoría a un torneo
router.post('/:id/categorias', authenticate, setClubIdFromCampeonato(), requireClubAdmin, [
  param('id').notEmpty(),
  body('categoria').isInt({ min: 1, max: 7 }),
  body('modalidad').isIn(['MASCULINO', 'FEMENINO', 'MIXTO']),
  body('maxParejas').optional().isInt({ min: 1 }),
  body('nombre').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { categoria, modalidad, maxParejas, nombre } = req.body;
    const cat = await prisma.categoriaTorneo.create({
      data: { campeonatoId: req.params.id, categoria, modalidad, maxParejas, nombre },
    });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Ya existe esa categoría/modalidad en este torneo' });
    res.status(500).json({ error: err.message });
  }
});

// Eliminar categoría
router.delete('/:id/categorias/:catId', authenticate, setClubIdFromCampeonato(), requireClubAdmin, async (req, res) => {
  try {
    await prisma.categoriaTorneo.delete({ where: { id: req.params.catId } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Categoría no encontrada' });
    res.status(500).json({ error: err.message });
  }
});

// ─── DISPONIBILIDAD HORARIA ───────────────────────────────────────────────────

// Listar disponibilidades de un torneo
router.get('/:id/disponibilidad', param('id').notEmpty(), async (req, res) => {
  try {
    const disponibilidades = await prisma.disponibilidadHoraria.findMany({
      where: { campeonatoId: req.params.id },
      orderBy: { fecha: 'asc' },
    });
    res.json(disponibilidades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear/actualizar disponibilidad para un día (upsert por fecha)
router.post('/:id/disponibilidad', authenticate, setClubIdFromCampeonato(), requireClubAdmin, [
  param('id').notEmpty(),
  body('fecha').isISO8601(),
  body('horaInicio').matches(/^\d{2}:\d{2}$/),
  body('horaFin').matches(/^\d{2}:\d{2}$/),
  body('cantidadCanchas').isInt({ min: 1, max: 50 }),
  body('duracionMinutos').optional().isInt({ min: 30, max: 480 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const campeonatoId = req.params.id;
    const { fecha, horaInicio, horaFin, cantidadCanchas, duracionMinutos = 120 } = req.body;
    const fechaDate = new Date(fecha);

    const disp = await prisma.disponibilidadHoraria.upsert({
      where: { campeonatoId_fecha: { campeonatoId, fecha: fechaDate } },
      update: { horaInicio, horaFin, cantidadCanchas, duracionMinutos },
      create: { campeonatoId, fecha: fechaDate, horaInicio, horaFin, cantidadCanchas, duracionMinutos },
    });
    res.status(201).json(disp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar disponibilidad de un día
router.delete('/:id/disponibilidad/:dispId', authenticate, setClubIdFromCampeonato(), requireClubAdmin, async (req, res) => {
  try {
    await prisma.disponibilidadHoraria.delete({ where: { id: req.params.dispId } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    res.status(500).json({ error: err.message });
  }
});

// ─── Auto-asignar horarios a los partidos ─────────────────────────────────────
router.post('/:id/partidos/asignar-horarios', authenticate, setClubIdFromCampeonato(), requireClubAdmin,
  param('id').notEmpty(),
  async (req, res) => {
    try {
      const campeonatoId = req.params.id;

      // Usar DisponibilidadHoraria (modelo del AdminHorarios)
      const disponibilidades = await prisma.disponibilidadHoraria.findMany({
        where: { campeonatoId },
        orderBy: { fecha: 'asc' },
      });

      if (disponibilidades.length === 0) {
        return res.status(400).json({ error: 'No hay disponibilidad horaria configurada. Andá a "Canchas" y agregá días con canchas disponibles.' });
      }

      // Generar todos los slots disponibles en orden cronológico
      // Cada DisponibilidadHoraria tiene N canchas, cada una con M turnos
      const slots = []; // { fechaHora, cancha }
      for (const disp of disponibilidades) {
        const [hI, mI] = disp.horaInicio.split(':').map(Number);
        const [hF, mF] = disp.horaFin.split(':').map(Number);
        const dur = disp.duracionMinutos;
        const minFin = hF * 60 + mF;

        let min = hI * 60 + mI;
        while (min + dur <= minFin) {
          for (let c = 1; c <= disp.cantidadCanchas; c++) {
            const fechaHora = new Date(disp.fecha);
            fechaHora.setHours(Math.floor(min / 60), min % 60, 0, 0);
            slots.push({ fechaHora, cancha: `Cancha ${c}` });
          }
          min += dur;
        }
      }

      // Partidos pendientes sin horario, grupos primero luego eliminatorias
      const partidos = await prisma.partido.findMany({
        where: { campeonatoId, fechaHora: null, estado: { not: 'FINALIZADO' } },
        orderBy: [{ fase: 'asc' }, { grupoId: 'asc' }, { ordenRonda: 'asc' }],
      });

      if (partidos.length === 0) {
        return res.status(400).json({ error: 'No hay partidos pendientes sin horario para asignar.' });
      }

      if (slots.length < partidos.length) {
        return res.status(400).json({
          error: `Hay ${partidos.length} partidos pero solo ${slots.length} slots disponibles. Agregá más días o canchas.`,
        });
      }

      const updates = partidos.map((p, i) =>
        prisma.partido.update({
          where: { id: p.id },
          data: { fechaHora: slots[i].fechaHora, pista: slots[i].cancha },
        })
      );

      await prisma.$transaction(updates);

      res.json({ asignados: updates.length });
    } catch (err) {
      console.error('Scheduling error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Generar grupos ───────────────────────────────────────────────────────────
// Body: { cantidadGrupos, categoriaId? }
router.post('/:id/grupos', authenticate, setClubIdFromCampeonato(), requireClubAdmin, [
  param('id').notEmpty(),
  body('cantidadGrupos').isInt({ min: 1, max: 16 }),
  body('categoriaId').optional().isUUID(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidadGrupos, categoriaId } = req.body;

    const whereInsc = { campeonatoId: id, estado: 'ACEPTADA' };
    if (categoriaId) whereInsc.categoriaId = categoriaId;

    const inscripciones = await prisma.inscripcion.findMany({
      where: whereInsc,
      include: { pareja: true },
    });

    if (inscripciones.length < cantidadGrupos) {
      return res.status(400).json({ error: 'No hay suficientes parejas inscritas para crear los grupos' });
    }

    const nombres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const gruposCreados = [];

    for (let i = 0; i < cantidadGrupos; i++) {
      const grupo = await prisma.grupo.create({
        data: { campeonatoId: id, categoriaId: categoriaId ?? null, nombre: `Grupo ${nombres[i]}` },
      });
      gruposCreados.push(grupo);
    }

    await Promise.all(
      inscripciones.map((insc, idx) =>
        prisma.clasificacionGrupo.create({
          data: { grupoId: gruposCreados[idx % cantidadGrupos].id, parejaId: insc.parejaId },
        })
      )
    );

    const grupos = await prisma.grupo.findMany({
      where: { campeonatoId: id, ...(categoriaId ? { categoriaId } : {}) },
      include: { clasificaciones: { include: { pareja: true } } },
    });

    res.status(201).json(grupos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Generar partidos de grupos (round-robin) ─────────────────────────────────
// Body: { categoriaId? }  — si viene, solo genera para esa categoría
router.post('/:id/partidos/grupos', authenticate, setClubIdFromCampeonato(), requireClubAdmin,
  param('id').notEmpty(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { categoriaId } = req.body ?? {};

      const whereGrupos = { campeonatoId: id };
      if (categoriaId) whereGrupos.categoriaId = categoriaId;

      const grupos = await prisma.grupo.findMany({
        where: whereGrupos,
        include: { clasificaciones: { select: { parejaId: true } } },
        orderBy: { nombre: 'asc' },
      });

      if (grupos.length === 0) {
        return res.status(400).json({ error: 'No hay grupos. Generá los grupos primero.' });
      }

      const whereExistentes = { campeonatoId: id, fase: 'GRUPOS' };
      if (categoriaId) whereExistentes.categoriaId = categoriaId;

      const existentes = await prisma.partido.count({ where: whereExistentes });
      if (existentes > 0) {
        return res.status(400).json({ error: 'Ya existen partidos de grupos para esta categoría.' });
      }

      // Formato padel: P1 vs P2, luego Ganador(M1) vs P3, Perdedor(M1) vs P3
      // Los grupos DEBEN tener exactamente 3 parejas
      const partidos = [];
      for (const grupo of grupos) {
        const ps = grupo.clasificaciones.map((c) => c.parejaId);
        if (ps.length !== 3) {
          return res.status(400).json({
            error: `El grupo "${grupo.nombre}" tiene ${ps.length} pareja(s). Cada grupo debe tener exactamente 3 parejas.`,
          });
        }
        const [p1, p2, p3] = ps;
        // M1: P1 vs P2 (ordenRonda: 1)
        partidos.push({
          campeonatoId: id, categoriaId: grupo.categoriaId ?? null, grupoId: grupo.id,
          fase: 'GRUPOS', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: p1, parejaVisitanteId: p2,
        });
        // M2: Ganador(M1) vs P3 — local TBD, se rellena automáticamente al cargar M1
        partidos.push({
          campeonatoId: id, categoriaId: grupo.categoriaId ?? null, grupoId: grupo.id,
          fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE',
          parejaLocalId: null, parejaVisitanteId: p3,
        });
        // M3: Perdedor(M1) vs P3 — local TBD
        partidos.push({
          campeonatoId: id, categoriaId: grupo.categoriaId ?? null, grupoId: grupo.id,
          fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE',
          parejaLocalId: null, parejaVisitanteId: p3,
        });
      }

      await prisma.partido.createMany({ data: partidos });

      const result = await prisma.partido.findMany({
        where: { campeonatoId: id, fase: 'GRUPOS', ...(categoriaId ? { categoriaId } : {}) },
        include: {
          grupo: { select: { nombre: true } },
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
        },
        orderBy: [{ grupo: { nombre: 'asc' } }],
      });

      res.status(201).json({ creados: result.length, partidos: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── Generar bracket de eliminatorias ─────────────────────────────────────────
// Body: { categoriaId? }
router.post('/:id/partidos/eliminatorias', authenticate, setClubIdFromCampeonato(), requireClubAdmin,
  param('id').notEmpty(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { categoriaId } = req.body ?? {};

      const whereBase = { campeonatoId: id, ...(categoriaId ? { categoriaId } : {}) };

      const pendientes = await prisma.partido.count({
        where: { ...whereBase, fase: 'GRUPOS', estado: { not: 'FINALIZADO' } },
      });
      if (pendientes > 0) {
        return res.status(400).json({ error: `Hay ${pendientes} partido(s) de grupos sin finalizar.` });
      }

      const existentes = await prisma.partido.count({
        where: { ...whereBase, fase: { in: ['CUARTOS', 'SEMIS', 'FINAL'] } },
      });
      if (existentes > 0) {
        return res.status(400).json({ error: 'Ya existen partidos de eliminatorias.' });
      }

      // Top 2 de cada grupo ordenado por puntos → sets ganados → games ganados
      const grupos = await prisma.grupo.findMany({
        where: { campeonatoId: id, ...(categoriaId ? { categoriaId } : {}) },
        include: {
          clasificaciones: {
            orderBy: [
              { puntos: 'desc' },
              { setsGanados: 'desc' },
              { gamesGanados: 'desc' },
            ],
            take: 2,
            select: { parejaId: true },
          },
        },
        orderBy: { nombre: 'asc' },
      });

      const clasificados = grupos.map((g) => ({
        primero: g.clasificaciones[0]?.parejaId ?? null,
        segundo: g.clasificaciones[1]?.parejaId ?? null,
      }));

      const numGrupos = clasificados.length;
      if (numGrupos === 0) {
        return res.status(400).json({ error: 'No hay grupos generados. Primero generá los grupos y jugá la fase de grupos.' });
      }

      const partidos = [];
      const catData = categoriaId ? { categoriaId } : {};

      if (numGrupos >= 4) {
        for (let i = 0; i < numGrupos; i += 2) {
          const g1 = clasificados[i];
          const g2 = clasificados[i + 1];
          if (!g1 || !g2) continue;
          partidos.push({ campeonatoId: id, ...catData, fase: 'CUARTOS', ordenRonda: i + 1, estado: 'PENDIENTE',
            parejaLocalId: g1.primero, parejaVisitanteId: g2.segundo });
          partidos.push({ campeonatoId: id, ...catData, fase: 'CUARTOS', ordenRonda: i + 2, estado: 'PENDIENTE',
            parejaLocalId: g2.primero, parejaVisitanteId: g1.segundo });
        }
        const numCuartos = partidos.length;
        for (let i = 0; i < numCuartos / 2; i++) {
          partidos.push({ campeonatoId: id, ...catData, fase: 'SEMIS', ordenRonda: i + 1, estado: 'PENDIENTE',
            parejaLocalId: null, parejaVisitanteId: null });
        }
        partidos.push({ campeonatoId: id, ...catData, fase: 'FINAL', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: null, parejaVisitanteId: null });

      } else if (numGrupos === 2) {
        // 1°A vs 2°B, 1°B vs 2°A (mejor primero cruza con peor segundo)
        partidos.push({ campeonatoId: id, ...catData, fase: 'SEMIS', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: clasificados[0].primero, parejaVisitanteId: clasificados[1].segundo });
        partidos.push({ campeonatoId: id, ...catData, fase: 'SEMIS', ordenRonda: 2, estado: 'PENDIENTE',
          parejaLocalId: clasificados[1].primero, parejaVisitanteId: clasificados[0].segundo });
        partidos.push({ campeonatoId: id, ...catData, fase: 'FINAL', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: null, parejaVisitanteId: null });

      } else if (numGrupos === 1) {
        partidos.push({ campeonatoId: id, ...catData, fase: 'FINAL', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: clasificados[0].primero, parejaVisitanteId: clasificados[0].segundo });

      } else if (numGrupos === 3) {
        partidos.push({ campeonatoId: id, ...catData, fase: 'SEMIS', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: clasificados[1].primero, parejaVisitanteId: clasificados[2].segundo });
        partidos.push({ campeonatoId: id, ...catData, fase: 'SEMIS', ordenRonda: 2, estado: 'PENDIENTE',
          parejaLocalId: clasificados[2].primero, parejaVisitanteId: clasificados[1].segundo });
        partidos.push({ campeonatoId: id, ...catData, fase: 'FINAL', ordenRonda: 1, estado: 'PENDIENTE',
          parejaLocalId: clasificados[0].primero, parejaVisitanteId: null });
      }

      await prisma.partido.createMany({ data: partidos });

      const result = await prisma.partido.findMany({
        where: { ...whereBase, fase: { in: ['CUARTOS', 'SEMIS', 'FINAL'] } },
        include: {
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
        },
        orderBy: [{ fase: 'asc' }, { ordenRonda: 'asc' }],
      });

      res.status(201).json({ creados: result.length, partidos: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
