import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // ── CLUB ────────────────────────────────────────────────────────────────────
  const club = await prisma.club.upsert({
    where: { nombre: 'La9Padel' },
    update: {},
    create: { nombre: 'La9Padel' },
  });
  console.log(`✅ Club: ${club.nombre}`);

  // ── USUARIOS ─────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('admin123', 10);
  const hashJugador = await bcrypt.hash('jugador123', 10);

  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@torneos.local' },
    update: {},
    create: { email: 'admin@torneos.local', password: hash, nombre: 'Admin Plataforma', rol: 'ADMIN' },
  });

  await prisma.clubAdmin.upsert({
    where: { usuarioId_clubId: { usuarioId: adminUser.id, clubId: club.id } },
    update: {},
    create: { usuarioId: adminUser.id, clubId: club.id },
  });
  console.log(`✅ Admin: ${adminUser.email} (pass: admin123)`);

  // 24 jugadores — 2 categorías × 2 grupos × 3 parejas × 2 jugadores
  const jugadoresData = [
    // 5ta Masculino (0-11)
    { nombre: 'Carlos Ruiz', email: 'carlos@test.local' },
    { nombre: 'Martín López', email: 'martin@test.local' },
    { nombre: 'Diego Fernández', email: 'diego@test.local' },
    { nombre: 'Andrés García', email: 'andres@test.local' },
    { nombre: 'Pablo Martínez', email: 'pablo@test.local' },
    { nombre: 'Lucas Torres', email: 'lucas@test.local' },
    { nombre: 'Sebastián Pérez', email: 'sebastian@test.local' },
    { nombre: 'Matías Rodríguez', email: 'matias@test.local' },
    { nombre: 'Nicolás Sánchez', email: 'nicolas@test.local' },
    { nombre: 'Facundo Díaz', email: 'facundo@test.local' },
    { nombre: 'Tomás Morales', email: 'tomas@test.local' },
    { nombre: 'Agustín Vargas', email: 'agustin@test.local' },
    // 4ta Femenino (12-23)
    { nombre: 'Laura Méndez', email: 'laura@test.local' },
    { nombre: 'Sofía Romero', email: 'sofia@test.local' },
    { nombre: 'Valentina Cruz', email: 'valentina@test.local' },
    { nombre: 'Camila Herrera', email: 'camila@test.local' },
    { nombre: 'Florencia Ríos', email: 'florencia@test.local' },
    { nombre: 'Natalia Suárez', email: 'natalia@test.local' },
    { nombre: 'María Castillo', email: 'maria@test.local' },
    { nombre: 'Luciana Ortega', email: 'luciana@test.local' },
    { nombre: 'Jimena Silva', email: 'jimena@test.local' },
    { nombre: 'Andrea Núñez', email: 'andrea@test.local' },
    { nombre: 'Patricia Torres', email: 'patricia@test.local' },
    { nombre: 'Daniela Vega', email: 'daniela@test.local' },
  ];

  const usuariosJugadores = [];
  for (const u of jugadoresData) {
    const usuario = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, password: hashJugador, nombre: u.nombre, rol: 'JUGADOR' },
    });
    usuariosJugadores.push(usuario);
  }
  console.log(`✅ ${usuariosJugadores.length} usuarios jugadores creados (pass: jugador123)`);

  // Perfiles de jugador
  const jugadores = [];
  for (let i = 0; i < usuariosJugadores.length; i++) {
    const u = usuariosJugadores[i];
    const categoria = i < 12 ? 5 : 4;
    const j = await prisma.jugador.upsert({
      where: { usuarioId: u.id },
      update: {},
      create: { usuarioId: u.id, clubId: club.id, categoria },
    });
    jugadores.push(j);
  }
  console.log(`✅ ${jugadores.length} perfiles de jugador creados`);

  // ── PAREJAS ─────────────────────────────────────────────────────────────────
  const parejasData = [
    [0, 1, 'MASCULINO'], [2, 3, 'MASCULINO'], [4, 5, 'MASCULINO'],
    [6, 7, 'MASCULINO'], [8, 9, 'MASCULINO'], [10, 11, 'MASCULINO'],
    [12, 13, 'FEMENINO'], [14, 15, 'FEMENINO'], [16, 17, 'FEMENINO'],
    [18, 19, 'FEMENINO'], [20, 21, 'FEMENINO'], [22, 23, 'FEMENINO'],
  ];

  const parejas = [];
  for (const [i, j, tipo] of parejasData) {
    const [j1Id, j2Id] = [jugadores[i].id, jugadores[j].id].sort();
    const pareja = await prisma.pareja.upsert({
      where: { jugador1Id_jugador2Id: { jugador1Id: j1Id, jugador2Id: j2Id } },
      update: {},
      create: { jugador1Id: j1Id, jugador2Id: j2Id, clubId: club.id, tipoPareja: tipo },
    });
    parejas.push(pareja);
  }
  console.log(`✅ ${parejas.length} parejas creadas`);

  // ── CAMPEONATO ───────────────────────────────────────────────────────────────
  const hoy = new Date();
  const campeonato = await prisma.campeonato.upsert({
    where: { id: 'seed-campeonato-001' },
    update: {},
    create: {
      id: 'seed-campeonato-001',
      nombre: 'Torneo Apertura — La9Padel',
      clubId: club.id,
      creadorId: adminUser.id,
      estado: 'EN_CURSO',
      fechaInicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()),
      fechaFin: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7),
    },
  });
  console.log(`✅ Campeonato: ${campeonato.nombre}`);

  // ── DISPONIBILIDAD HORARIA ────────────────────────────────────────────────
  for (let d = 0; d <= 6; d++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
    const dow = fecha.getDay();
    if (dow === 0 || dow === 6) {
      await prisma.disponibilidadHoraria.upsert({
        where: { campeonatoId_fecha: { campeonatoId: campeonato.id, fecha } },
        update: {},
        create: {
          campeonatoId: campeonato.id,
          fecha,
          horaInicio: '09:00',
          horaFin: '20:00',
          cantidadCanchas: 4,
          duracionMinutos: 120,
        },
      });
    }
  }
  console.log(`✅ Disponibilidad horaria: fines de semana, 4 canchas, 09:00-20:00`);

  // ── PISTAS (CANCHAS) ──────────────────────────────────────────────────────────
  const pistas = [];
  for (let num = 1; num <= 4; num++) {
    const pista = await prisma.pista.upsert({
      where: { campeonatoId_numero: { campeonatoId: campeonato.id, numero: num } },
      update: {},
      create: { campeonatoId: campeonato.id, numero: num, nombre: `Cancha ${num}` },
    });
    pistas.push(pista);
  }
  console.log(`✅ ${pistas.length} canchas creadas (Cancha 1-4)`);

  // ── DISPONIBILIDAD POR PISTA ──────────────────────────────────────────────────
  for (let d = 0; d <= 6; d++) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + d);
    const dow = fecha.getDay();
    if (dow === 0 || dow === 6) {
      const tipoFase = dow === 6 ? 'GRUPOS' : 'ELIMINATORIAS'; // Sábado = GRUPOS, Domingo = ELIMINATORIAS
      for (const pista of pistas) {
        await prisma.pistaDisponibilidad.upsert({
          where: { pistaId_fecha_tipoFase: { pistaId: pista.id, fecha, tipoFase } },
          update: {},
          create: {
            pistaId: pista.id,
            fecha,
            tipoFase,
            horaInicio: '09:00',
            horaFin: '20:00',
            duracionMinutos: 120,
          },
        });
      }
    }
  }
  console.log(`✅ Disponibilidad por pista: sábado (GRUPOS), domingo (ELIMINATORIAS)`);


  const catMasc = await prisma.categoriaTorneo.upsert({
    where: { campeonatoId_categoria_modalidad: { campeonatoId: campeonato.id, categoria: 5, modalidad: 'MASCULINO' } },
    update: {},
    create: { campeonatoId: campeonato.id, categoria: 5, modalidad: 'MASCULINO', maxParejas: 6 },
  });
  const catFem = await prisma.categoriaTorneo.upsert({
    where: { campeonatoId_categoria_modalidad: { campeonatoId: campeonato.id, categoria: 4, modalidad: 'FEMENINO' } },
    update: {},
    create: { campeonatoId: campeonato.id, categoria: 4, modalidad: 'FEMENINO', maxParejas: 6 },
  });
  console.log(`✅ 2 categorías: 5ta Masculino, 4ta Femenino`);

  // ── INSCRIPCIONES ─────────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    await prisma.inscripcion.upsert({
      where: { campeonatoId_parejaId_categoriaId: { campeonatoId: campeonato.id, parejaId: parejas[i].id, categoriaId: catMasc.id } },
      update: {},
      create: { campeonatoId: campeonato.id, categoriaId: catMasc.id, parejaId: parejas[i].id, estado: 'ACEPTADA' },
    });
  }
  for (let i = 6; i < 12; i++) {
    await prisma.inscripcion.upsert({
      where: { campeonatoId_parejaId_categoriaId: { campeonatoId: campeonato.id, parejaId: parejas[i].id, categoriaId: catFem.id } },
      update: {},
      create: { campeonatoId: campeonato.id, categoriaId: catFem.id, parejaId: parejas[i].id, estado: 'ACEPTADA' },
    });
  }
  console.log(`✅ 12 inscripciones aceptadas (6 por categoría)`);

  // ── GRUPOS ───────────────────────────────────────────────────────────────────
  const grupoA5 = await prisma.grupo.upsert({
    where: { id: 'seed-grupo-a5' },
    update: {},
    create: { id: 'seed-grupo-a5', campeonatoId: campeonato.id, categoriaId: catMasc.id, nombre: 'Grupo A' },
  });
  const grupoB5 = await prisma.grupo.upsert({
    where: { id: 'seed-grupo-b5' },
    update: {},
    create: { id: 'seed-grupo-b5', campeonatoId: campeonato.id, categoriaId: catMasc.id, nombre: 'Grupo B' },
  });
  const grupoA4 = await prisma.grupo.upsert({
    where: { id: 'seed-grupo-a4' },
    update: {},
    create: { id: 'seed-grupo-a4', campeonatoId: campeonato.id, categoriaId: catFem.id, nombre: 'Grupo A' },
  });
  const grupoB4 = await prisma.grupo.upsert({
    where: { id: 'seed-grupo-b4' },
    update: {},
    create: { id: 'seed-grupo-b4', campeonatoId: campeonato.id, categoriaId: catFem.id, nombre: 'Grupo B' },
  });

  const clasificacionesData = [
    { grupoId: grupoA5.id, parejaId: parejas[0].id },
    { grupoId: grupoA5.id, parejaId: parejas[1].id },
    { grupoId: grupoA5.id, parejaId: parejas[2].id },
    { grupoId: grupoB5.id, parejaId: parejas[3].id },
    { grupoId: grupoB5.id, parejaId: parejas[4].id },
    { grupoId: grupoB5.id, parejaId: parejas[5].id },
    { grupoId: grupoA4.id, parejaId: parejas[6].id },
    { grupoId: grupoA4.id, parejaId: parejas[7].id },
    { grupoId: grupoA4.id, parejaId: parejas[8].id },
    { grupoId: grupoB4.id, parejaId: parejas[9].id },
    { grupoId: grupoB4.id, parejaId: parejas[10].id },
    { grupoId: grupoB4.id, parejaId: parejas[11].id },
  ];

  for (const c of clasificacionesData) {
    await prisma.clasificacionGrupo.upsert({
      where: { grupoId_parejaId: { grupoId: c.grupoId, parejaId: c.parejaId } },
      update: {},
      create: c,
    });
  }
  console.log(`✅ 4 grupos con 3 parejas cada uno`);

  // ── PARTIDOS DE GRUPOS ────────────────────────────────────────────────────────
  const existenPartidos = await prisma.partido.count({ where: { campeonatoId: campeonato.id, fase: 'GRUPOS' } });
  if (existenPartidos === 0) {
    const todosGrupos = [
      { grupo: grupoA5, catId: catMasc.id, pStart: 0 },
      { grupo: grupoB5, catId: catMasc.id, pStart: 3 },
      { grupo: grupoA4, catId: catFem.id, pStart: 6 },
      { grupo: grupoB4, catId: catFem.id, pStart: 9 },
    ];

    const partidosGrupo = [];
    for (const { grupo, catId, pStart } of todosGrupos) {
      const [p1, p2, p3] = [parejas[pStart], parejas[pStart + 1], parejas[pStart + 2]];
      // M1: P1 vs P2  (ordenRonda: 1)
      partidosGrupo.push({ grupoId: grupo.id, categoriaId: catId, ordenRonda: 1, parejaLocalId: p1.id, parejaVisitanteId: p2.id });
      // M2: Ganador(M1) vs P3  (ordenRonda: 2) — local TBD
      partidosGrupo.push({ grupoId: grupo.id, categoriaId: catId, ordenRonda: 2, parejaLocalId: null, parejaVisitanteId: p3.id });
      // M3: Perdedor(M1) vs P3  (ordenRonda: 3) — local TBD
      partidosGrupo.push({ grupoId: grupo.id, categoriaId: catId, ordenRonda: 3, parejaLocalId: null, parejaVisitanteId: p3.id });
    }

    await prisma.partido.createMany({
      data: partidosGrupo.map((p) => ({
        ...p, campeonatoId: campeonato.id, fase: 'GRUPOS', estado: 'PENDIENTE',
      })),
    });
    console.log(`✅ 12 partidos de grupos creados (3 por grupo × 4 grupos)`);
  } else {
    console.log(`⏭️  Partidos de grupos ya existen, se omiten`);
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Seed completado

🔑 Credenciales:
   Admin:   admin@torneos.local / admin123
   Jugador: carlos@test.local   / jugador123

🏆 Torneo: "Torneo Apertura — La9Padel"

   📁 5ta Masculino (seed-campeonato-001)
      Grupo A: Carlos/Martín, Diego/Andrés, Pablo/Lucas
      Grupo B: Sebastián/Matías, Nicolás/Facundo, Tomás/Agustín

   📁 4ta Femenino
      Grupo A: Laura/Sofía, Valentina/Camila, Florencia/Natalia
      Grupo B: María/Luciana, Jimena/Andrea, Patricia/Daniela

   🗓️  Disponibilidad: fines de semana, 4 canchas, 09:00-20:00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
