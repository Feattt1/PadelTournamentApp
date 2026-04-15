import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        telefono: true,
        jugador: { select: { id: true, categoria: true, nivel: true } },
        clubsAdmin: { select: { clubId: true } },
      },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = {
      ...usuario,
      clubsAdmin: (usuario.clubsAdmin || []).map((a) => a.clubId),
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

/** Admin de plataforma: crea clubes, asigna admins */
export const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Solo administrador de plataforma.' });
  }
  next();
};

/** Admin del club: requiere clubId en req.clubIdForAuth, body o query */
export const requireClubAdmin = (req, res, next) => {
  const clubId = req.clubIdForAuth || req.body?.clubId || req.query?.clubId;
  if (!clubId) {
    return res.status(400).json({ error: 'No se especificó el club' });
  }
  const esAdminPlataforma = req.user?.rol === 'ADMIN';
  const esAdminClub = (req.user?.clubsAdmin || []).includes(clubId);
  if (!esAdminPlataforma && !esAdminClub) {
    return res.status(403).json({ error: 'No tienes permiso para administrar este club.' });
  }
  next();
};

/** Solo verifica si body.clubId está presente; si no, pasa */
export const requireClubAdminIfClub = (req, res, next) => {
  const clubId = req.body?.clubId;
  if (!clubId) return next();
  const esAdminPlataforma = req.user?.rol === 'ADMIN';
  const esAdminClub = (req.user?.clubsAdmin || []).includes(clubId);
  if (!esAdminPlataforma && !esAdminClub) {
    return res.status(403).json({ error: 'No tienes permiso para administrar este club.' });
  }
  next();
};

/** Carga clubId desde campeonato para requireClubAdmin */
export const setClubIdFromCampeonato = (paramName = 'id') => async (req, res, next) => {
  const c = await prisma.campeonato.findUnique({
    where: { id: req.params[paramName] },
    select: { clubId: true },
  });
  if (!c) return res.status(404).json({ error: 'Campeonato no encontrado' });
  req.clubIdForAuth = c.clubId;
  next();
};

/** Carga clubId desde inscripcion (vía campeonato) */
export const setClubIdFromInscripcion = async (req, res, next) => {
  const i = await prisma.inscripcion.findUnique({
    where: { id: req.params.id },
    include: { campeonato: { select: { clubId: true } } },
  });
  if (!i) return res.status(404).json({ error: 'Inscripción no encontrada' });
  req.clubIdForAuth = i.campeonato?.clubId;
  next();
};

/** Carga clubId desde partido (vía campeonato) */
export const setClubIdFromPartido = async (req, res, next) => {
  const p = await prisma.partido.findUnique({
    where: { id: req.params.id },
    select: { campeonato: { select: { clubId: true } } },
  });
  if (!p) return res.status(404).json({ error: 'Partido no encontrado' });
  req.clubIdForAuth = p.campeonato?.clubId;
  next();
};

/** Carga clubId desde partido por campeonatoId en body */
export const setClubIdFromCampeonatoBody = async (req, res, next) => {
  if (!req.body?.campeonatoId) return next();
  const c = await prisma.campeonato.findUnique({
    where: { id: req.body.campeonatoId },
    select: { clubId: true },
  });
  if (!c) return res.status(404).json({ error: 'Campeonato no encontrado' });
  req.clubIdForAuth = c.clubId;
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        telefono: true,
        jugador: { select: { id: true, categoria: true, nivel: true } },
        clubsAdmin: { select: { clubId: true } },
      },
    });
    if (usuario) {
      req.user = { ...usuario, clubsAdmin: (usuario.clubsAdmin || []).map((a) => a.clubId) };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
};
