/**
 * seed-demo.js — Datos de demostración
 *
 * Crea 3 torneos en diferentes estados con muchas categorías, jugadores,
 * grupos y resultados completos (incluyendo un torneo FINALIZADO).
 *
 * Ejecutar: npm run db:seed:demo  (desde /server)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function sid(prefix, suffix) {
  return `demo-${prefix}-${suffix}`;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Datos de jugadores ──────────────────────────────────────────────────────

const JUGADORES_MASC = [
  // cat 3
  { nombre: 'Roberto Aguirre',  email: 'roberto@demo.local', cat: 3 },
  { nombre: 'Esteban Blanco',   email: 'esteban@demo.local', cat: 3 },
  { nombre: 'Gustavo Cano',     email: 'gustavo@demo.local', cat: 3 },
  { nombre: 'Hernán Delgado',   email: 'hernan@demo.local',  cat: 3 },
  { nombre: 'Ignacio Espinoza', email: 'ignacio@demo.local', cat: 3 },
  { nombre: 'Javier Fuentes',   email: 'javier@demo.local',  cat: 3 },
  // cat 4
  { nombre: 'Kevin Gómez',    email: 'kevin@demo.local',    cat: 4 },
  { nombre: 'Leonardo Haro',  email: 'leonardo@demo.local', cat: 4 },
  { nombre: 'Marcos Ibáñez',  email: 'marcos@demo.local',   cat: 4 },
  { nombre: 'Nicolás Juárez', email: 'nicolas2@demo.local', cat: 4 },
  { nombre: 'Oscar Lara',     email: 'oscar@demo.local',    cat: 4 },
  { nombre: 'Pedro Molina',   email: 'pedro@demo.local',    cat: 4 },
  { nombre: 'Rodrigo Navia',  email: 'rodrigo@demo.local',  cat: 4 },
  { nombre: 'Santiago Ortiz', email: 'santiago@demo.local', cat: 4 },
  { nombre: 'Tomás Pizarro',  email: 'tomas2@demo.local',   cat: 4 },
  { nombre: 'Ulises Quiroga', email: 'ulises@demo.local',   cat: 4 },
  { nombre: 'Valentín Reyes', email: 'valentin@demo.local', cat: 4 },
  { nombre: 'Walter Silva',   email: 'walter@demo.local',   cat: 4 },
  // cat 5
  { nombre: 'Xavier Torres',   email: 'xavier@demo.local',   cat: 5 },
  { nombre: 'Yamil Urquiza',   email: 'yamil@demo.local',    cat: 5 },
  { nombre: 'Zuhal Vargas',    email: 'zuhal@demo.local',    cat: 5 },
  { nombre: 'Abel Wainstein',  email: 'abel@demo.local',     cat: 5 },
  { nombre: 'Bruno Acosta',    email: 'bruno@demo.local',    cat: 5 },
  { nombre: 'César Barrios',   email: 'cesar@demo.local',    cat: 5 },
  { nombre: 'Damián Cabrera',  email: 'damian@demo.local',   cat: 5 },
  { nombre: 'Emilio Domínguez',email: 'emilio@demo.local',   cat: 5 },
  { nombre: 'Federico Estrada',email: 'federico@demo.local', cat: 5 },
  { nombre: 'Gonzalo Flores',  email: 'gonzalo@demo.local',  cat: 5 },
  { nombre: 'Hugo Gallardo',   email: 'hugo@demo.local',     cat: 5 },
  { nombre: 'Iván Heredia',    email: 'ivan@demo.local',     cat: 5 },
  // cat 6
  { nombre: 'Julián Ibarra',   email: 'julian@demo.local',   cat: 6 },
  { nombre: 'Leandro Jiménez', email: 'leandro@demo.local',  cat: 6 },
  { nombre: 'Miguel Leal',     email: 'miguel@demo.local',   cat: 6 },
  { nombre: 'Nahuel Medina',   email: 'nahuel@demo.local',   cat: 6 },
  { nombre: 'Omar Navarro',    email: 'omar@demo.local',     cat: 6 },
  { nombre: 'Pablo Ochoa',     email: 'pablo2@demo.local',   cat: 6 },
];

const JUGADORES_FEM = [
  { nombre: 'Alejandra Paz',    email: 'alejandra@demo.local', cat: 4 },
  { nombre: 'Beatriz Quiroz',   email: 'beatriz@demo.local',   cat: 4 },
  { nombre: 'Carolina Ramos',   email: 'carolina@demo.local',  cat: 4 },
  { nombre: 'Diana Salinas',    email: 'diana@demo.local',     cat: 4 },
  { nombre: 'Elena Tapia',      email: 'elena@demo.local',     cat: 4 },
  { nombre: 'Fabiola Ugarte',   email: 'fabiola@demo.local',   cat: 4 },
  { nombre: 'Gabriela Valero',  email: 'gabriela@demo.local',  cat: 5 },
  { nombre: 'Hilda Vega',       email: 'hilda@demo.local',     cat: 5 },
  { nombre: 'Isabel Vera',      email: 'isabel@demo.local',    cat: 5 },
  { nombre: 'Julia Zamora',     email: 'julia@demo.local',     cat: 5 },
  { nombre: 'Karen Araya',      email: 'karen@demo.local',     cat: 5 },
  { nombre: 'Liliana Bravo',    email: 'liliana@demo.local',   cat: 5 },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 seed-demo — iniciando...\n');

  const hash     = await bcrypt.hash('admin123',   10);
  const hashJug  = await bcrypt.hash('jugador123', 10);

  // ── Club ──────────────────────────────────────────────────────────────────
  const club = await prisma.club.upsert({
    where:  { nombre: 'La9Padel' },
    update: {},
    create: { nombre: 'La9Padel' },
  });
  console.log(`✅ Club: ${club.nombre}`);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const admin = await prisma.usuario.upsert({
    where:  { email: 'admin@torneos.local' },
    update: {},
    create: { email: 'admin@torneos.local', password: hash, nombre: 'Admin Plataforma', rol: 'ADMIN' },
  });
  await prisma.clubAdmin.upsert({
    where:  { usuarioId_clubId: { usuarioId: admin.id, clubId: club.id } },
    update: {},
    create: { usuarioId: admin.id, clubId: club.id },
  });
  console.log(`✅ Admin: admin@torneos.local / admin123`);

  // ── Jugadores ─────────────────────────────────────────────────────────────
  const todosJugadores = [...JUGADORES_MASC, ...JUGADORES_FEM];
  const jMap = {}; // email → jugador record

  for (const jd of todosJugadores) {
    const u = await prisma.usuario.upsert({
      where:  { email: jd.email },
      update: {},
      create: { email: jd.email, password: hashJug, nombre: jd.nombre, rol: 'JUGADOR' },
    });
    const j = await prisma.jugador.upsert({
      where:  { usuarioId: u.id },
      update: {},
      create: { usuarioId: u.id, clubId: club.id, categoria: jd.cat },
    });
    jMap[jd.email] = j;
  }
  console.log(`✅ ${todosJugadores.length} jugadores creados`);

  // ── Parejas ───────────────────────────────────────────────────────────────
  // Masc cat3: pares de índice 0-5
  const jM3 = JUGADORES_MASC.slice(0, 6).map(j => jMap[j.email]);
  // Masc cat4: índice 6-17
  const jM4 = JUGADORES_MASC.slice(6, 18).map(j => jMap[j.email]);
  // Masc cat5: índice 18-29
  const jM5 = JUGADORES_MASC.slice(18, 30).map(j => jMap[j.email]);
  // Masc cat6: índice 30-35
  const jM6 = JUGADORES_MASC.slice(30, 36).map(j => jMap[j.email]);
  // Fem cat4: índice 0-5
  const jF4 = JUGADORES_FEM.slice(0, 6).map(j => jMap[j.email]);
  // Fem cat5: índice 6-11
  const jF5 = JUGADORES_FEM.slice(6, 12).map(j => jMap[j.email]);

  async function upsertPareja(j1, j2, tipo, nombre = null) {
    const [a, b] = [j1.id, j2.id].sort();
    return prisma.pareja.upsert({
      where:  { jugador1Id_jugador2Id: { jugador1Id: a, jugador2Id: b } },
      update: {},
      create: { jugador1Id: a, jugador2Id: b, clubId: club.id, tipoPareja: tipo, nombre },
    });
  }

  // 3 parejas cat3 masc
  const pm3 = [
    await upsertPareja(jM3[0], jM3[1], 'MASCULINO'),
    await upsertPareja(jM3[2], jM3[3], 'MASCULINO'),
    await upsertPareja(jM3[4], jM3[5], 'MASCULINO'),
  ];

  // 6 parejas cat4 masc
  const pm4 = [
    await upsertPareja(jM4[0],  jM4[1],  'MASCULINO'),
    await upsertPareja(jM4[2],  jM4[3],  'MASCULINO'),
    await upsertPareja(jM4[4],  jM4[5],  'MASCULINO'),
    await upsertPareja(jM4[6],  jM4[7],  'MASCULINO'),
    await upsertPareja(jM4[8],  jM4[9],  'MASCULINO'),
    await upsertPareja(jM4[10], jM4[11], 'MASCULINO'),
  ];

  // 6 parejas cat5 masc
  const pm5 = [
    await upsertPareja(jM5[0],  jM5[1],  'MASCULINO'),
    await upsertPareja(jM5[2],  jM5[3],  'MASCULINO'),
    await upsertPareja(jM5[4],  jM5[5],  'MASCULINO'),
    await upsertPareja(jM5[6],  jM5[7],  'MASCULINO'),
    await upsertPareja(jM5[8],  jM5[9],  'MASCULINO'),
    await upsertPareja(jM5[10], jM5[11], 'MASCULINO'),
  ];

  // 3 parejas cat6 masc
  const pm6 = [
    await upsertPareja(jM6[0], jM6[1], 'MASCULINO'),
    await upsertPareja(jM6[2], jM6[3], 'MASCULINO'),
    await upsertPareja(jM6[4], jM6[5], 'MASCULINO'),
  ];

  // 3 parejas cat4 fem
  const pf4 = [
    await upsertPareja(jF4[0], jF4[1], 'FEMENINO'),
    await upsertPareja(jF4[2], jF4[3], 'FEMENINO'),
    await upsertPareja(jF4[4], jF4[5], 'FEMENINO'),
  ];

  // 3 parejas cat5 fem
  const pf5 = [
    await upsertPareja(jF5[0], jF5[1], 'FEMENINO'),
    await upsertPareja(jF5[2], jF5[3], 'FEMENINO'),
    await upsertPareja(jF5[4], jF5[5], 'FEMENINO'),
  ];

  console.log(`✅ Parejas creadas (3 cat3M, 6 cat4M, 6 cat5M, 3 cat6M, 3 cat4F, 3 cat5F)`);

  // ════════════════════════════════════════════════════════════════════════════
  // TORNEO 1 — INSCRIPCIONES
  // ════════════════════════════════════════════════════════════════════════════
  const t1 = await prisma.campeonato.upsert({
    where:  { id: sid('t', '1') },
    update: {},
    create: {
      id:          sid('t', '1'),
      nombre:      'Copa Primavera 2026',
      clubId:      club.id,
      creadorId:   admin.id,
      descripcion: 'Torneo multikategoría, inscripciones abiertas hasta el 30 de abril.',
      estado:      'INSCRIPCIONES',
      fechaInicio: daysFromNow(30),
      fechaFin:    daysFromNow(37),
      fechaInscripcionInicio: daysFromNow(-5),
      fechaInscripcionFin:    daysFromNow(13),
    },
  });

  // Categorías
  async function upsertCat(campeonatoId, categoria, modalidad, maxParejas = null) {
    return prisma.categoriaTorneo.upsert({
      where:  { campeonatoId_categoria_modalidad: { campeonatoId, categoria, modalidad } },
      update: {},
      create: { campeonatoId, categoria, modalidad, maxParejas },
    });
  }

  const t1_3M  = await upsertCat(t1.id, 3, 'MASCULINO', 8);
  const t1_4M  = await upsertCat(t1.id, 4, 'MASCULINO', 12);
  const t1_5M  = await upsertCat(t1.id, 5, 'MASCULINO', 12);
  const t1_6M  = await upsertCat(t1.id, 6, 'MASCULINO', 8);
  const t1_4F  = await upsertCat(t1.id, 4, 'FEMENINO',  8);
  const t1_5F  = await upsertCat(t1.id, 5, 'FEMENINO',  8);

  // Inscripciones variadas
  async function upsertInsc(campeonatoId, parejaId, categoriaId, estado) {
    return prisma.inscripcion.upsert({
      where:  { campeonatoId_parejaId_categoriaId: { campeonatoId, parejaId, categoriaId } },
      update: {},
      create: { campeonatoId, parejaId, categoriaId, estado },
    });
  }

  // 3ta Masc: 3 aceptadas
  await upsertInsc(t1.id, pm3[0].id, t1_3M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm3[1].id, t1_3M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm3[2].id, t1_3M.id, 'PENDIENTE');

  // 4ta Masc: 3 aceptadas + 1 lista espera
  await upsertInsc(t1.id, pm4[0].id, t1_4M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm4[1].id, t1_4M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm4[2].id, t1_4M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm4[3].id, t1_4M.id, 'LISTA_ESPERA');

  // 5ta Masc: 3 aceptadas
  await upsertInsc(t1.id, pm5[0].id, t1_5M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm5[1].id, t1_5M.id, 'ACEPTADA');
  await upsertInsc(t1.id, pm5[2].id, t1_5M.id, 'ACEPTADA');

  // 6ta Masc: 2 pendientes
  await upsertInsc(t1.id, pm6[0].id, t1_6M.id, 'PENDIENTE');
  await upsertInsc(t1.id, pm6[1].id, t1_6M.id, 'PENDIENTE');

  // 4ta Fem: 2 aceptadas + 1 rechazada
  await upsertInsc(t1.id, pf4[0].id, t1_4F.id, 'ACEPTADA');
  await upsertInsc(t1.id, pf4[1].id, t1_4F.id, 'ACEPTADA');
  await upsertInsc(t1.id, pf4[2].id, t1_4F.id, 'RECHAZADA');

  // 5ta Fem: 3 aceptadas
  await upsertInsc(t1.id, pf5[0].id, t1_5F.id, 'ACEPTADA');
  await upsertInsc(t1.id, pf5[1].id, t1_5F.id, 'ACEPTADA');
  await upsertInsc(t1.id, pf5[2].id, t1_5F.id, 'ACEPTADA');

  console.log(`✅ Torneo 1 (INSCRIPCIONES): "Copa Primavera 2026" — 6 categorías, inscripciones variadas`);

  // ════════════════════════════════════════════════════════════════════════════
  // TORNEO 2 — EN_CURSO
  // ════════════════════════════════════════════════════════════════════════════
  const t2 = await prisma.campeonato.upsert({
    where:  { id: sid('t', '2') },
    update: {},
    create: {
      id:          sid('t', '2'),
      nombre:      'Torneo Apertura 2026',
      clubId:      club.id,
      creadorId:   admin.id,
      descripcion: 'Torneo en progreso. Fase de grupos en curso.',
      estado:      'EN_CURSO',
      fechaInicio: daysFromNow(-7),
      fechaFin:    daysFromNow(7),
    },
  });

  const t2_4M = await upsertCat(t2.id, 4, 'MASCULINO', 6);
  const t2_5M = await upsertCat(t2.id, 5, 'MASCULINO', 6);
  const t2_4F = await upsertCat(t2.id, 4, 'FEMENINO',  6);
  const t2_5F = await upsertCat(t2.id, 5, 'FEMENINO',  6);

  // Inscripciones aceptadas para t2
  for (const p of pm4) await upsertInsc(t2.id, p.id, t2_4M.id, 'ACEPTADA');
  for (const p of pm5) await upsertInsc(t2.id, p.id, t2_5M.id, 'ACEPTADA');
  for (const p of pf4) await upsertInsc(t2.id, p.id, t2_4F.id, 'ACEPTADA');
  for (const p of pf5) await upsertInsc(t2.id, p.id, t2_5F.id, 'ACEPTADA');

  // Helper: upsert grupo
  async function upsertGrupo(id, campeonatoId, categoriaId, nombre) {
    return prisma.grupo.upsert({
      where:  { id },
      update: {},
      create: { id, campeonatoId, categoriaId, nombre },
    });
  }

  // Helper: upsert clasificacion
  async function upsertClasif(grupoId, parejaId, data = {}) {
    return prisma.clasificacionGrupo.upsert({
      where:  { grupoId_parejaId: { grupoId, parejaId } },
      update: data,
      create: { grupoId, parejaId, ...data },
    });
  }

  // ── T2: 4ta Masculino — 2 grupos, partidos parcialmente jugados ──────────
  const t2_g4A = await upsertGrupo(sid('t2','g4A'), t2.id, t2_4M.id, 'Grupo A');
  const t2_g4B = await upsertGrupo(sid('t2','g4B'), t2.id, t2_4M.id, 'Grupo B');

  // Grupo A: pm4[0], pm4[1], pm4[2]
  await upsertClasif(t2_g4A.id, pm4[0].id, { puntos: 2, partidosJugados: 1, partidosGanados: 1, setsGanados: 2, gamesGanados: 12 });
  await upsertClasif(t2_g4A.id, pm4[1].id, { puntos: 0, partidosJugados: 1, setsGanados: 0, gamesGanados: 5 });
  await upsertClasif(t2_g4A.id, pm4[2].id);
  // Grupo B: pm4[3], pm4[4], pm4[5]
  await upsertClasif(t2_g4B.id, pm4[3].id);
  await upsertClasif(t2_g4B.id, pm4[4].id);
  await upsertClasif(t2_g4B.id, pm4[5].id);

  // Partidos 4ta Masc
  const t2ExistPartidos4M = await prisma.partido.count({ where: { campeonatoId: t2.id, categoriaId: t2_4M.id } });
  if (t2ExistPartidos4M === 0) {
    // Grupo A
    const t2_p4A1 = await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4M.id, grupoId: t2_g4A.id,
      fase: 'GRUPOS', ordenRonda: 1, estado: 'FINALIZADO',
      parejaLocalId: pm4[0].id, parejaVisitanteId: pm4[1].id,
      setsLocal: 2, setsVisitante: 0,
      fechaHora: daysFromNow(-5),  pista: 'Cancha 1',
    }});
    await prisma.setResultado.createMany({ data: [
      { partidoId: t2_p4A1.id, numeroSet: 1, gamesLocal: 6, gamesVisitante: 3 },
      { partidoId: t2_p4A1.id, numeroSet: 2, gamesLocal: 6, gamesVisitante: 2 },
    ]});
    await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4M.id, grupoId: t2_g4A.id,
      fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE',
      parejaLocalId: pm4[0].id, parejaVisitanteId: pm4[2].id,
      fechaHora: daysFromNow(1), pista: 'Cancha 1',
    }});
    await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4M.id, grupoId: t2_g4A.id,
      fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE',
      parejaLocalId: pm4[1].id, parejaVisitanteId: pm4[2].id,
      fechaHora: daysFromNow(1), pista: 'Cancha 2',
    }});
    // Grupo B (todos pendientes)
    await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4M.id, grupoId: t2_g4B.id,
      fase: 'GRUPOS', ordenRonda: 1, estado: 'PENDIENTE',
      parejaLocalId: pm4[3].id, parejaVisitanteId: pm4[4].id,
      fechaHora: daysFromNow(2), pista: 'Cancha 1',
    }});
    await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4M.id, grupoId: t2_g4B.id,
      fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE',
      parejaLocalId: null, parejaVisitanteId: pm4[5].id,
    }});
    await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4M.id, grupoId: t2_g4B.id,
      fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE',
      parejaLocalId: null, parejaVisitanteId: pm4[5].id,
    }});
  }

  // ── T2: 5ta Masculino — 2 grupos, sin partidos jugados ───────────────────
  const t2_g5A = await upsertGrupo(sid('t2','g5A'), t2.id, t2_5M.id, 'Grupo A');
  const t2_g5B = await upsertGrupo(sid('t2','g5B'), t2.id, t2_5M.id, 'Grupo B');
  for (const p of [pm5[0], pm5[1], pm5[2]]) await upsertClasif(t2_g5A.id, p.id);
  for (const p of [pm5[3], pm5[4], pm5[5]]) await upsertClasif(t2_g5B.id, p.id);

  const t2ExistPartidos5M = await prisma.partido.count({ where: { campeonatoId: t2.id, categoriaId: t2_5M.id } });
  if (t2ExistPartidos5M === 0) {
    for (const [grupoId, ps] of [[t2_g5A.id, [pm5[0], pm5[1], pm5[2]]], [t2_g5B.id, [pm5[3], pm5[4], pm5[5]]]]) {
      await prisma.partido.createMany({ data: [
        { campeonatoId: t2.id, categoriaId: t2_5M.id, grupoId, fase: 'GRUPOS', ordenRonda: 1, estado: 'PENDIENTE', parejaLocalId: ps[0].id, parejaVisitanteId: ps[1].id },
        { campeonatoId: t2.id, categoriaId: t2_5M.id, grupoId, fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: ps[2].id },
        { campeonatoId: t2.id, categoriaId: t2_5M.id, grupoId, fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: ps[2].id },
      ]});
    }
  }

  // ── T2: 4ta Femenino — 1 grupo, partidos mixtos ──────────────────────────
  const t2_g4Fem = await upsertGrupo(sid('t2','g4F'), t2.id, t2_4F.id, 'Grupo Único');
  await upsertClasif(t2_g4Fem.id, pf4[0].id, { puntos: 4, partidosJugados: 2, partidosGanados: 2, setsGanados: 4, gamesGanados: 24 });
  await upsertClasif(t2_g4Fem.id, pf4[1].id, { puntos: 2, partidosJugados: 2, partidosGanados: 1, setsGanados: 2, gamesGanados: 14 });
  await upsertClasif(t2_g4Fem.id, pf4[2].id, { puntos: 0, partidosJugados: 2, setsGanados: 0, gamesGanados: 6 });

  const t2ExistPartidos4F = await prisma.partido.count({ where: { campeonatoId: t2.id, categoriaId: t2_4F.id } });
  if (t2ExistPartidos4F === 0) {
    const pfA1 = await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4F.id, grupoId: t2_g4Fem.id,
      fase: 'GRUPOS', ordenRonda: 1, estado: 'FINALIZADO',
      parejaLocalId: pf4[0].id, parejaVisitanteId: pf4[1].id,
      setsLocal: 2, setsVisitante: 0,
      fechaHora: daysFromNow(-6), pista: 'Cancha 3',
    }});
    await prisma.setResultado.createMany({ data: [
      { partidoId: pfA1.id, numeroSet: 1, gamesLocal: 6, gamesVisitante: 2 },
      { partidoId: pfA1.id, numeroSet: 2, gamesLocal: 6, gamesVisitante: 4 },
    ]});
    const pfA2 = await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4F.id, grupoId: t2_g4Fem.id,
      fase: 'GRUPOS', ordenRonda: 2, estado: 'FINALIZADO',
      parejaLocalId: pf4[0].id, parejaVisitanteId: pf4[2].id,
      setsLocal: 2, setsVisitante: 0,
      fechaHora: daysFromNow(-4), pista: 'Cancha 3',
    }});
    await prisma.setResultado.createMany({ data: [
      { partidoId: pfA2.id, numeroSet: 1, gamesLocal: 6, gamesVisitante: 1 },
      { partidoId: pfA2.id, numeroSet: 2, gamesLocal: 6, gamesVisitante: 3 },
    ]});
    const pfA3 = await prisma.partido.create({ data: {
      campeonatoId: t2.id, categoriaId: t2_4F.id, grupoId: t2_g4Fem.id,
      fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE',
      parejaLocalId: pf4[1].id, parejaVisitanteId: pf4[2].id,
      fechaHora: daysFromNow(3), pista: 'Cancha 3',
    }});
  }

  // ── T2: 5ta Femenino — 1 grupo ───────────────────────────────────────────
  const t2_g5Fem = await upsertGrupo(sid('t2','g5F'), t2.id, t2_5F.id, 'Grupo Único');
  for (const p of pf5) await upsertClasif(t2_g5Fem.id, p.id);

  const t2ExistPartidos5F = await prisma.partido.count({ where: { campeonatoId: t2.id, categoriaId: t2_5F.id } });
  if (t2ExistPartidos5F === 0) {
    await prisma.partido.createMany({ data: [
      { campeonatoId: t2.id, categoriaId: t2_5F.id, grupoId: t2_g5Fem.id, fase: 'GRUPOS', ordenRonda: 1, estado: 'PENDIENTE', parejaLocalId: pf5[0].id, parejaVisitanteId: pf5[1].id, fechaHora: daysFromNow(4), pista: 'Cancha 4' },
      { campeonatoId: t2.id, categoriaId: t2_5F.id, grupoId: t2_g5Fem.id, fase: 'GRUPOS', ordenRonda: 2, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: pf5[2].id },
      { campeonatoId: t2.id, categoriaId: t2_5F.id, grupoId: t2_g5Fem.id, fase: 'GRUPOS', ordenRonda: 3, estado: 'PENDIENTE', parejaLocalId: null, parejaVisitanteId: pf5[2].id },
    ]});
  }

  console.log(`✅ Torneo 2 (EN_CURSO): "Torneo Apertura 2026" — 4 categorías, grupos en progreso`);

  // ════════════════════════════════════════════════════════════════════════════
  // TORNEO 3 — FINALIZADO
  // ════════════════════════════════════════════════════════════════════════════
  const t3 = await prisma.campeonato.upsert({
    where:  { id: sid('t', '3') },
    update: {},
    create: {
      id:          sid('t', '3'),
      nombre:      'Torneo Clausura 2025',
      clubId:      club.id,
      creadorId:   admin.id,
      descripcion: 'Torneo finalizado. ¡Enhorabuena a los campeones!',
      estado:      'FINALIZADO',
      fechaInicio: daysFromNow(-60),
      fechaFin:    daysFromNow(-45),
    },
  });

  const t3_5M = await upsertCat(t3.id, 5, 'MASCULINO', 6);
  const t3_4F = await upsertCat(t3.id, 4, 'FEMENINO',  6);
  const t3_3M = await upsertCat(t3.id, 3, 'MASCULINO', 6);

  for (const p of [...pm5, ...pf4, ...pm3]) {
    const catId = pm5.includes(p) ? t3_5M.id : pf4.includes(p) ? t3_4F.id : t3_3M.id;
    await upsertInsc(t3.id, p.id, catId, 'ACEPTADA');
  }

  // ── Helper: crear partido FINALIZADO con sets ─────────────────────────────
  async function crearPartidoFinalizado({ campeonatoId, categoriaId, grupoId, fase, ordenRonda, local, visitante, resultados, fechaHora, pista }) {
    const setsL = resultados.filter(s => s.gl > s.gv).length;
    const setsV = resultados.filter(s => s.gv > s.gl).length;
    const existing = await prisma.partido.findFirst({
      where: { campeonatoId, categoriaId, fase, ordenRonda, parejaLocalId: local?.id ?? null },
    });
    if (existing) return existing;
    const partido = await prisma.partido.create({ data: {
      campeonatoId, categoriaId, grupoId: grupoId ?? null,
      fase, ordenRonda, estado: 'FINALIZADO',
      parejaLocalId: local?.id ?? null, parejaVisitanteId: visitante?.id ?? null,
      setsLocal: setsL, setsVisitante: setsV,
      fechaHora, pista,
    }});
    await prisma.setResultado.createMany({ data: resultados.map((r, i) => ({
      partidoId: partido.id, numeroSet: i + 1, gamesLocal: r.gl, gamesVisitante: r.gv,
    }))});
    return partido;
  }

  // ── T3: 5ta Masculino ─────────────────────────────────────────────────────
  const t3_gA5 = await upsertGrupo(sid('t3','gA5'), t3.id, t3_5M.id, 'Grupo A');
  const t3_gB5 = await upsertGrupo(sid('t3','gB5'), t3.id, t3_5M.id, 'Grupo B');

  // Grupo A: pm5[0], pm5[1], pm5[2]
  // M1: pm5[0] vs pm5[1] → pm5[0] gana
  // M2: pm5[0] vs pm5[2] → pm5[0] gana
  // M3: pm5[1] vs pm5[2] → pm5[1] gana
  // => pm5[0]: 4pts (1°A), pm5[1]: 2pts (2°A), pm5[2]: 0pts
  await upsertClasif(t3_gA5.id, pm5[0].id, { puntos: 4, partidosJugados: 2, partidosGanados: 2, setsGanados: 4, setsPerdidos: 0, gamesGanados: 24, gamesPerdidos: 8 });
  await upsertClasif(t3_gA5.id, pm5[1].id, { puntos: 2, partidosJugados: 2, partidosGanados: 1, setsGanados: 2, setsPerdidos: 2, gamesGanados: 13, gamesPerdidos: 17 });
  await upsertClasif(t3_gA5.id, pm5[2].id, { puntos: 0, partidosJugados: 2, setsGanados: 0, setsPerdidos: 4, gamesGanados: 8, gamesPerdidos: 20 });

  const t3Exist5M = await prisma.partido.count({ where: { campeonatoId: t3.id, categoriaId: t3_5M.id } });
  if (t3Exist5M === 0) {
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, grupoId: t3_gA5.id, fase: 'GRUPOS', ordenRonda: 1, local: pm5[0], visitante: pm5[1], resultados: [{gl:6,gv:3},{gl:6,gv:2}], fechaHora: daysFromNow(-58), pista: 'Cancha 1' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, grupoId: t3_gA5.id, fase: 'GRUPOS', ordenRonda: 2, local: pm5[0], visitante: pm5[2], resultados: [{gl:6,gv:1},{gl:6,gv:4}], fechaHora: daysFromNow(-58), pista: 'Cancha 1' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, grupoId: t3_gA5.id, fase: 'GRUPOS', ordenRonda: 3, local: pm5[1], visitante: pm5[2], resultados: [{gl:6,gv:4},{gl:6,gv:3}], fechaHora: daysFromNow(-57), pista: 'Cancha 1' });

    // Grupo B: pm5[3], pm5[4], pm5[5]
    // M1: pm5[3] vs pm5[4] → pm5[5] gana M2 y M3
    // pm5[3]: 2pts (1°B), pm5[5]: 4pts (1°B)... actually:
    // M1: pm5[3] gana → M2: pm5[3] vs pm5[5], M3: pm5[4] vs pm5[5]
    // pm5[5] gana M2 and M3 → pm5[5]: 4pts (1°B), pm5[3]: 2pts (2°B)
    await upsertClasif(t3_gB5.id, pm5[3].id, { puntos: 2, partidosJugados: 2, partidosGanados: 1, setsGanados: 2, setsPerdidos: 2, gamesGanados: 15, gamesPerdidos: 16 });
    await upsertClasif(t3_gB5.id, pm5[4].id, { puntos: 0, partidosJugados: 2, setsGanados: 0, setsPerdidos: 4, gamesGanados: 6, gamesPerdidos: 24 });
    await upsertClasif(t3_gB5.id, pm5[5].id, { puntos: 4, partidosJugados: 2, partidosGanados: 2, setsGanados: 4, setsPerdidos: 0, gamesGanados: 24, gamesPerdidos: 10 });

    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, grupoId: t3_gB5.id, fase: 'GRUPOS', ordenRonda: 1, local: pm5[3], visitante: pm5[4], resultados: [{gl:6,gv:3},{gl:7,gv:5}], fechaHora: daysFromNow(-58), pista: 'Cancha 2' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, grupoId: t3_gB5.id, fase: 'GRUPOS', ordenRonda: 2, local: pm5[5], visitante: pm5[3], resultados: [{gl:6,gv:4},{gl:6,gv:3}], fechaHora: daysFromNow(-57), pista: 'Cancha 2' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, grupoId: t3_gB5.id, fase: 'GRUPOS', ordenRonda: 3, local: pm5[5], visitante: pm5[4], resultados: [{gl:6,gv:1},{gl:6,gv:2}], fechaHora: daysFromNow(-57), pista: 'Cancha 2' });

    // Semis: 1°A (pm5[0]) vs 2°B (pm5[3]), 1°B (pm5[5]) vs 2°A (pm5[1])
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, fase: 'SEMIS', ordenRonda: 1, local: pm5[0], visitante: pm5[3], resultados: [{gl:6,gv:4},{gl:6,gv:3}], fechaHora: daysFromNow(-50), pista: 'Cancha 1' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, fase: 'SEMIS', ordenRonda: 2, local: pm5[5], visitante: pm5[1], resultados: [{gl:6,gv:7},{gl:6,gv:3},{gl:7,gv:5}], fechaHora: daysFromNow(-50), pista: 'Cancha 2' });

    // Final: pm5[0] vs pm5[5] → pm5[0] es CAMPEÓN
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_5M.id, fase: 'FINAL', ordenRonda: 1, local: pm5[0], visitante: pm5[5], resultados: [{gl:6,gv:3},{gl:4,gv:6},{gl:6,gv:4}], fechaHora: daysFromNow(-46), pista: 'Cancha Central' });
  }

  // ── T3: 4ta Femenino ──────────────────────────────────────────────────────
  const t3_gA4F = await upsertGrupo(sid('t3','gA4F'), t3.id, t3_4F.id, 'Grupo A');
  const t3_gB4F = await upsertGrupo(sid('t3','gB4F'), t3.id, t3_4F.id, 'Grupo B');

  await upsertClasif(t3_gA4F.id, pf4[0].id, { puntos: 4, partidosJugados: 2, partidosGanados: 2, setsGanados: 4, gamesGanados: 24 });
  await upsertClasif(t3_gA4F.id, pf4[1].id, { puntos: 2, partidosJugados: 2, partidosGanados: 1, setsGanados: 2, gamesGanados: 14 });
  await upsertClasif(t3_gA4F.id, pf4[2].id, { puntos: 0, partidosJugados: 2, setsGanados: 0, gamesGanados: 6 });
  await upsertClasif(t3_gB4F.id, pf4[3 % pf4.length].id, { puntos: 4, partidosJugados: 2, partidosGanados: 2, setsGanados: 4, gamesGanados: 23 });
  await upsertClasif(t3_gB4F.id, pf4[4 % pf4.length].id, { puntos: 2, partidosJugados: 2, partidosGanados: 1, setsGanados: 2, gamesGanados: 12 });
  await upsertClasif(t3_gB4F.id, pf4[5 % pf4.length].id, { puntos: 0, partidosJugados: 2, setsGanados: 0, gamesGanados: 4 });

  const t3Exist4F = await prisma.partido.count({ where: { campeonatoId: t3.id, categoriaId: t3_4F.id } });
  if (t3Exist4F === 0) {
    // Grupo A
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, grupoId: t3_gA4F.id, fase: 'GRUPOS', ordenRonda: 1, local: pf4[0], visitante: pf4[1], resultados: [{gl:6,gv:2},{gl:6,gv:4}], fechaHora: daysFromNow(-58), pista: 'Cancha 3' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, grupoId: t3_gA4F.id, fase: 'GRUPOS', ordenRonda: 2, local: pf4[0], visitante: pf4[2], resultados: [{gl:6,gv:1},{gl:6,gv:3}], fechaHora: daysFromNow(-57), pista: 'Cancha 3' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, grupoId: t3_gA4F.id, fase: 'GRUPOS', ordenRonda: 3, local: pf4[1], visitante: pf4[2], resultados: [{gl:6,gv:3},{gl:6,gv:2}], fechaHora: daysFromNow(-57), pista: 'Cancha 4' });
    // Grupo B
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, grupoId: t3_gB4F.id, fase: 'GRUPOS', ordenRonda: 1, local: pf4[3 % pf4.length], visitante: pf4[4 % pf4.length], resultados: [{gl:6,gv:4},{gl:7,gv:5}], fechaHora: daysFromNow(-58), pista: 'Cancha 4' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, grupoId: t3_gB4F.id, fase: 'GRUPOS', ordenRonda: 2, local: pf4[3 % pf4.length], visitante: pf4[5 % pf4.length], resultados: [{gl:6,gv:3},{gl:6,gv:2}], fechaHora: daysFromNow(-57), pista: 'Cancha 3' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, grupoId: t3_gB4F.id, fase: 'GRUPOS', ordenRonda: 3, local: pf4[4 % pf4.length], visitante: pf4[5 % pf4.length], resultados: [{gl:6,gv:2},{gl:6,gv:1}], fechaHora: daysFromNow(-56), pista: 'Cancha 4' });
    // Semis
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, fase: 'SEMIS', ordenRonda: 1, local: pf4[0], visitante: pf4[3 % pf4.length], resultados: [{gl:6,gv:4},{gl:7,gv:5}], fechaHora: daysFromNow(-50), pista: 'Cancha 3' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, fase: 'SEMIS', ordenRonda: 2, local: pf4[1], visitante: pf4[4 % pf4.length], resultados: [{gl:3,gv:6},{gl:6,gv:4},{gl:6,gv:7}], fechaHora: daysFromNow(-50), pista: 'Cancha 4' });
    // Final: pf4[0] es CAMPEONA
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_4F.id, fase: 'FINAL', ordenRonda: 1, local: pf4[0], visitante: pf4[1], resultados: [{gl:6,gv:4},{gl:4,gv:6},{gl:7,gv:5}], fechaHora: daysFromNow(-46), pista: 'Cancha Central' });
  }

  // ── T3: 3ra Masculino ─────────────────────────────────────────────────────
  const t3_gA3 = await upsertGrupo(sid('t3','gA3'), t3.id, t3_3M.id, 'Grupo Único');
  await upsertClasif(t3_gA3.id, pm3[0].id, { puntos: 4, partidosJugados: 2, partidosGanados: 2, setsGanados: 4, gamesGanados: 22 });
  await upsertClasif(t3_gA3.id, pm3[1].id, { puntos: 2, partidosJugados: 2, partidosGanados: 1, setsGanados: 2, gamesGanados: 15 });
  await upsertClasif(t3_gA3.id, pm3[2].id, { puntos: 0, partidosJugados: 2, setsGanados: 0, gamesGanados: 7 });

  const t3Exist3M = await prisma.partido.count({ where: { campeonatoId: t3.id, categoriaId: t3_3M.id } });
  if (t3Exist3M === 0) {
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_3M.id, grupoId: t3_gA3.id, fase: 'GRUPOS', ordenRonda: 1, local: pm3[0], visitante: pm3[1], resultados: [{gl:6,gv:4},{gl:6,gv:3}], fechaHora: daysFromNow(-59), pista: 'Cancha 2' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_3M.id, grupoId: t3_gA3.id, fase: 'GRUPOS', ordenRonda: 2, local: pm3[0], visitante: pm3[2], resultados: [{gl:6,gv:2},{gl:6,gv:1}], fechaHora: daysFromNow(-58), pista: 'Cancha 2' });
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_3M.id, grupoId: t3_gA3.id, fase: 'GRUPOS', ordenRonda: 3, local: pm3[1], visitante: pm3[2], resultados: [{gl:6,gv:3},{gl:6,gv:4}], fechaHora: daysFromNow(-58), pista: 'Cancha 2' });
    // Final directo (1 grupo → final sin semis)
    await crearPartidoFinalizado({ campeonatoId: t3.id, categoriaId: t3_3M.id, fase: 'FINAL', ordenRonda: 1, local: pm3[0], visitante: pm3[1], resultados: [{gl:6,gv:4},{gl:6,gv:3}], fechaHora: daysFromNow(-46), pista: 'Cancha 1' });
  }

  console.log(`✅ Torneo 3 (FINALIZADO): "Torneo Clausura 2025" — 3 categorías, todos los partidos con resultados`);

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ seed-demo completado

🔑 Credenciales:
   Admin:   admin@torneos.local / admin123
   Jugador: roberto@demo.local  / jugador123

🏆 Torneos creados:
   1. Copa Primavera 2026     [INSCRIPCIONES] — 6 categorías
   2. Torneo Apertura 2026    [EN_CURSO]      — 4 categorías, grupos en progreso
   3. Torneo Clausura 2025    [FINALIZADO]    — 3 categorías, bracket completo

🥇 Campeones Torneo Clausura:
   5ta Masculino → ${jM5[0].nombre} / ${jM5[1].nombre}
   4ta Femenino  → ${jF4[0].nombre} / ${jF4[1].nombre}
   3ra Masculino → ${jM3[0].nombre} / ${jM3[1].nombre}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
