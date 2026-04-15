/**
 * seed-torneos-prueba.js
 * Crea 2 torneos con 3 categorías cada uno para probar el sistema de scheduling.
 * Requiere que el seed principal ya haya corrido (jugadores + parejas base).
 *
 * Torneos:
 *   1. "Torneo Copa Primavera" — 2026-04-18 (sáb) / 2026-04-19 (dom)
 *   2. "Torneo Clausura" — 2026-04-25 (sáb) / 2026-04-26 (dom)
 *
 * Categorías (cada torneo):
 *   - 5ta Masculino  (parejas masc del seed)
 *   - 4ta Femenino   (parejas fem del seed)
 *   - 5ta Mixto      (parejas mixtas nuevas: jugador masc + jugador fem)
 *
 * Por categoría: 6 parejas → 2 grupos de 3 → 3 partidos por grupo
 * Por torneo: 4 canchas, sábado = GRUPOS, domingo = ELIMINATORIAS
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function crearTorneoCompleto({ nombre, campeonatoId, clubId, adminId, fechaSabado, fechaDomingo, parejasMasc, parejasFem, parejasMixto }) {
  console.log(`\n🏆 Creando: ${nombre}`);

  // ── Campeonato ──────────────────────────────────────────────────────────────
  const campeonato = await prisma.campeonato.upsert({
    where: { id: campeonatoId },
    update: {},
    create: {
      id: campeonatoId,
      nombre,
      clubId,
      creadorId: adminId,
      estado: 'EN_CURSO',
      fechaInicio: fechaSabado,
      fechaFin: fechaDomingo,
    },
  });

  // ── Categorías ──────────────────────────────────────────────────────────────
  const catMasc = await prisma.categoriaTorneo.upsert({
    where: { campeonatoId_categoria_modalidad: { campeonatoId, categoria: 5, modalidad: 'MASCULINO' } },
    update: {},
    create: { campeonatoId, categoria: 5, modalidad: 'MASCULINO', maxParejas: 6 },
  });
  const catFem = await prisma.categoriaTorneo.upsert({
    where: { campeonatoId_categoria_modalidad: { campeonatoId, categoria: 4, modalidad: 'FEMENINO' } },
    update: {},
    create: { campeonatoId, categoria: 4, modalidad: 'FEMENINO', maxParejas: 6 },
  });
  const catMixto = await prisma.categoriaTorneo.upsert({
    where: { campeonatoId_categoria_modalidad: { campeonatoId, categoria: 5, modalidad: 'MIXTO' } },
    update: {},
    create: { campeonatoId, categoria: 5, modalidad: 'MIXTO', maxParejas: 6 },
  });
  console.log(`  ✅ 3 categorías: 5ta Masculino, 4ta Femenino, 5ta Mixto`);

  // ── Inscripciones ──────────────────────────────────────────────────────────
  const inscData = [
    ...parejasMasc.map((pid) => ({ campeonatoId, categoriaId: catMasc.id, parejaId: pid })),
    ...parejasFem.map((pid)  => ({ campeonatoId, categoriaId: catFem.id,  parejaId: pid })),
    ...parejasMixto.map((pid) => ({ campeonatoId, categoriaId: catMixto.id, parejaId: pid })),
  ];
  for (const d of inscData) {
    await prisma.inscripcion.upsert({
      where: { campeonatoId_parejaId_categoriaId: d },
      update: {},
      create: { ...d, estado: 'ACEPTADA' },
    });
  }
  console.log(`  ✅ 18 inscripciones (6 por categoría)`);

  // ── Canchas ─────────────────────────────────────────────────────────────────
  const pistas = [];
  for (let num = 1; num <= 4; num++) {
    const p = await prisma.pista.upsert({
      where: { campeonatoId_numero: { campeonatoId, numero: num } },
      update: {},
      create: { campeonatoId, numero: num, nombre: `Cancha ${num}` },
    });
    pistas.push(p);
  }
  console.log(`  ✅ 4 canchas (Cancha 1-4)`);

  // ── Disponibilidad por pista ────────────────────────────────────────────────
  for (const pista of pistas) {
    await prisma.pistaDisponibilidad.upsert({
      where: { pistaId_fecha_tipoFase: { pistaId: pista.id, fecha: fechaSabado, tipoFase: 'GRUPOS' } },
      update: {},
      create: { pistaId: pista.id, fecha: fechaSabado, tipoFase: 'GRUPOS', horaInicio: '09:00', horaFin: '20:00', duracionMinutos: 120 },
    });
    await prisma.pistaDisponibilidad.upsert({
      where: { pistaId_fecha_tipoFase: { pistaId: pista.id, fecha: fechaDomingo, tipoFase: 'ELIMINATORIAS' } },
      update: {},
      create: { pistaId: pista.id, fecha: fechaDomingo, tipoFase: 'ELIMINATORIAS', horaInicio: '09:00', horaFin: '20:00', duracionMinutos: 120 },
    });
  }
  console.log(`  ✅ Disponibilidad: sábado GRUPOS, domingo ELIMINATORIAS`);

  // ── Grupos ──────────────────────────────────────────────────────────────────
  const gruposDef = [
    { id: `${campeonatoId}-ga5`, catId: catMasc.id,   nombre: 'Grupo A', parejas: parejasMasc.slice(0, 3)  },
    { id: `${campeonatoId}-gb5`, catId: catMasc.id,   nombre: 'Grupo B', parejas: parejasMasc.slice(3, 6)  },
    { id: `${campeonatoId}-ga4`, catId: catFem.id,    nombre: 'Grupo A', parejas: parejasFem.slice(0, 3)   },
    { id: `${campeonatoId}-gb4`, catId: catFem.id,    nombre: 'Grupo B', parejas: parejasFem.slice(3, 6)   },
    { id: `${campeonatoId}-gam`, catId: catMixto.id,  nombre: 'Grupo A', parejas: parejasMixto.slice(0, 3) },
    { id: `${campeonatoId}-gbm`, catId: catMixto.id,  nombre: 'Grupo B', parejas: parejasMixto.slice(3, 6) },
  ];

  const grupos = [];
  for (const gd of gruposDef) {
    const g = await prisma.grupo.upsert({
      where: { id: gd.id },
      update: {},
      create: { id: gd.id, campeonatoId, categoriaId: gd.catId, nombre: gd.nombre },
    });
    grupos.push({ ...g, parejas: gd.parejas });

    for (const pid of gd.parejas) {
      await prisma.clasificacionGrupo.upsert({
        where: { grupoId_parejaId: { grupoId: g.id, parejaId: pid } },
        update: {},
        create: { grupoId: g.id, parejaId: pid },
      });
    }
  }
  console.log(`  ✅ 6 grupos con 3 parejas cada uno`);

  // ── Partidos de grupos ──────────────────────────────────────────────────────
  const existenPartidos = await prisma.partido.count({ where: { campeonatoId, fase: 'GRUPOS' } });
  if (existenPartidos === 0) {
    const partidos = [];
    for (const g of grupos) {
      const [p1, p2, p3] = g.parejas;
      partidos.push({ campeonatoId, categoriaId: g.categoriaId, grupoId: g.id, fase: 'GRUPOS', ordenRonda: 1, estado: 'PENDIENTE', parejaLocalId: p1, parejaVisitanteId: p2 });
      partidos.push({ campeonatoId, categoriaId: g.categoriaId, grupoId: g.id, fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: p3 });
      partidos.push({ campeonatoId, categoriaId: g.categoriaId, grupoId: g.id, fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: p3 });
    }
    await prisma.partido.createMany({ data: partidos });
    console.log(`  ✅ 18 partidos de grupos (3 por grupo × 6 grupos)`);
  } else {
    console.log(`  ⏭️  Partidos ya existen, omitidos`);
  }

  return campeonato;
}

async function main() {
  console.log('🌱 seed-torneos-prueba — creando 2 torneos con 3 categorías para scheduling\n');

  // Datos del club y admin del seed
  const club = await prisma.club.findFirst({ where: { nombre: 'La9Padel' } });
  const admin = await prisma.usuario.findUnique({ where: { email: 'admin@torneos.local' } });
  if (!club || !admin) throw new Error('Ejecutá primero el seed principal (node prisma/seed.js)');

  // Parejas existentes del seed
  const parejas = await prisma.pareja.findMany({
    where: { clubId: club.id },
    include: {
      jugador1: true,
      jugador2: true,
    },
    orderBy: { jugador1: { createdAt: 'asc' } },
  });

  const parejasMasc  = parejas.filter((p) => p.tipoPareja === 'MASCULINO').map((p) => p.id);
  const parejasFem   = parejas.filter((p) => p.tipoPareja === 'FEMENINO').map((p) => p.id);

  if (parejasMasc.length < 6 || parejasFem.length < 6) {
    throw new Error('No hay suficientes parejas masc/fem. Ejecutá primero el seed principal.');
  }

  // Parejas mixtas: jugador masculino (cat 5) + jugadora femenina (cat 4)
  const jugMasc = await prisma.jugador.findMany({ where: { categoria: 5, clubId: club.id }, orderBy: { createdAt: 'asc' }, take: 12 });
  const jugFem  = await prisma.jugador.findMany({ where: { categoria: 4, clubId: club.id }, orderBy: { createdAt: 'asc' }, take: 12 });

  const parejasMixtoIds = [];
  for (let i = 0; i < 6; i++) {
    const [j1, j2] = [jugMasc[i * 2].id, jugFem[i * 2].id].sort();
    const p = await prisma.pareja.upsert({
      where: { jugador1Id_jugador2Id: { jugador1Id: j1, jugador2Id: j2 } },
      update: {},
      create: { jugador1Id: j1, jugador2Id: j2, clubId: club.id, tipoPareja: 'ABIERTO' },
    });
    parejasMixtoIds.push(p.id);
  }
  console.log(`✅ 6 parejas mixtas creadas`);

  // Fechas torneo 1: sábado 2026-04-18 / domingo 2026-04-19
  const sab1 = new Date('2026-04-18T00:00:00.000Z');
  const dom1 = new Date('2026-04-19T00:00:00.000Z');

  // Fechas torneo 2: sábado 2026-04-25 / domingo 2026-04-26
  const sab2 = new Date('2026-04-25T00:00:00.000Z');
  const dom2 = new Date('2026-04-26T00:00:00.000Z');

  await crearTorneoCompleto({
    nombre: 'Torneo Copa Primavera',
    campeonatoId: 'seed-torneo-primavera',
    clubId: club.id,
    adminId: admin.id,
    fechaSabado: sab1,
    fechaDomingo: dom1,
    parejasMasc: parejasMasc.slice(0, 6),
    parejasFem: parejasFem.slice(0, 6),
    parejasMixto: parejasMixtoIds,
  });

  await crearTorneoCompleto({
    nombre: 'Torneo Clausura',
    campeonatoId: 'seed-torneo-clausura',
    clubId: club.id,
    adminId: admin.id,
    fechaSabado: sab2,
    fechaDomingo: dom2,
    parejasMasc: parejasMasc.slice(0, 6),
    parejasFem: parejasFem.slice(0, 6),
    parejasMixto: parejasMixtoIds,
  });

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Torneos de prueba creados

🏆 Torneo Copa Primavera  (seed-torneo-primavera)
   Sábado 18 abr → GRUPOS,  Domingo 19 abr → ELIMINATORIAS
   Categorías: 5ta Masculino | 4ta Femenino | 5ta Mixto
   Grupos: A y B por categoría (6 grupos × 3 partidos = 18 partidos)

🏆 Torneo Clausura  (seed-torneo-clausura)
   Sábado 25 abr → GRUPOS,  Domingo 26 abr → ELIMINATORIAS
   Categorías: 5ta Masculino | 4ta Femenino | 5ta Mixto
   Grupos: A y B por categoría (6 grupos × 3 partidos = 18 partidos)

💡 Siguiente paso:
   Ir a /admin/campeonatos/<id>/horarios → asignar horarios
   Resultado esperado:
     Sábado: Grupo A (las 3 cats) → Canchas 1,2,3 @ mismos horarios
              Grupo B (las 3 cats) → Canchas 1,2,3 @ mismos horarios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
