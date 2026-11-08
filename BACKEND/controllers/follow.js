/** Seguir / dejar de seguir, listas de seguidores y sugerencias de a quién seguir. */
const validator = require("validator");
const prisma = require("../database/prisma");
const { userOut } = require("../services/serialize");

const USER = { select: { id: true, name: true, nick: true, imageKey: true } };
const bad = (res, code, message) => res.status(code).json({ status: "error", message });
const isId = (v) => typeof v === "string" && validator.isUUID(v);

const pruebaFollows = (req, res) => res.status(200).send({ message: "Prueba follows OK" });

const follow = async (req, res) => {
  try {
    const { followed_user } = req.body;
    if (!isId(followed_user)) return bad(res, 400, "Falta el ID del usuario a seguir");
    if (req.user.id === followed_user) return bad(res, 400, "No puedes seguirte a ti mismo");
    if (!(await prisma.user.findUnique({ where: { id: followed_user }, select: { id: true } }))) return bad(res, 404, "Usuario no encontrado");

    await prisma.follow.upsert({
      where: { followerId_followedId: { followerId: req.user.id, followedId: followed_user } },
      create: { followerId: req.user.id, followedId: followed_user },
      update: {},
    });
    return res.status(201).json({ status: "success", message: "Siguiendo al usuario correctamente" });
  } catch (e) { console.error(e); return bad(res, 500, "Error al seguir"); }
};

const unfollow = async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 400, "ID inválido");
    await prisma.follow.deleteMany({ where: { followerId: req.user.id, followedId: req.params.id } });
    return res.status(200).json({ status: "success", message: "Has dejado de seguir al usuario" });
  } catch (e) { console.error(e); return bad(res, 500, "Error al dejar de seguir"); }
};

const followers = async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 400, "ID inválido");
    const rows = await prisma.follow.findMany({ where: { followedId: req.params.id }, include: { follower: USER } });
    return res.status(200).json({ status: "success", count: rows.length, followers: rows.map((f) => ({ ...f, follower_user: userOut(f.follower) })) });
  } catch (e) { console.error(e); return bad(res, 500, "Error al obtener seguidores"); }
};

const following = async (req, res) => {
  try {
    if (!isId(req.params.id)) return bad(res, 400, "ID inválido");
    const rows = await prisma.follow.findMany({ where: { followerId: req.params.id }, include: { followed: USER } });
    return res.status(200).json({ status: "success", count: rows.length, following: rows.map((f) => ({ ...f, followed_user: userOut(f.followed) })) });
  } catch (e) { console.error(e); return bad(res, 500, "Error al obtener seguidos"); }
};

// GET /api/follow/suggestions → hasta 6 usuarios que aún no sigues (los más recientes primero)
const suggestions = async (req, res) => {
  try {
    const mine = await prisma.follow.findMany({ where: { followerId: req.user.id }, select: { followedId: true } });
    const users = await prisma.user.findMany({
      where: { id: { notIn: [req.user.id, ...mine.map((f) => f.followedId)] } },
      orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, nick: true, imageKey: true },
    });
    return res.status(200).json({ status: "success", users: users.map(userOut) });
  } catch (e) { console.error(e); return bad(res, 500, "Error al obtener sugerencias"); }
};

module.exports = { pruebaFollows, follow, unfollow, followers, following, suggestions };
