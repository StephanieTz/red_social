/**
 * Perfil público de un usuario (se busca por @nick):
 *   GET /api/profile/:nick            → cabecera: banner, foto, bio, contadores, ¿es mi perfil?, ¿lo sigo?
 *   GET /api/profile/:nick/:tab       → cuadrícula: posts | videos | reposts | tagged (etiquetadas)
 * "Etiquetadas" = publicaciones de OTRAS personas que mencionan @nick en el texto (no requiere tabla extra).
 */
const prisma = require("../database/prisma");
const { userOut, pubOut } = require("../services/serialize");

const AUTHOR = { select: { id: true, name: true, nick: true, imageKey: true } };
const NICK = /^[A-Za-z0-9_.]{3,20}$/;
const PER_PAGE = 30;
const notFound = (res) => res.status(404).json({ status: "error", message: "Usuario no encontrado" });

const findUser = (nick) => (NICK.test(nick || "") ? prisma.user.findFirst({ where: { nick: { equals: nick, mode: "insensitive" } } }) : null);
const mentions = (text, nick) =>
  new RegExp(`(^|[^A-Za-z0-9_.])@${nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9_])`, "i").test(text || "");

const header = async (req, res, next) => {
  try {
    const u = await findUser(req.params.nick);
    if (!u) return notFound(res);
    const isMe = u.id === req.user.id;
    const [posts, followers, following, rel] = await Promise.all([
      prisma.publication.count({ where: { userId: u.id } }),
      prisma.follow.count({ where: { followedId: u.id } }),
      prisma.follow.count({ where: { followerId: u.id } }),
      isMe ? null : prisma.follow.findUnique({ where: { followerId_followedId: { followerId: req.user.id, followedId: u.id } } }),
    ]);
    res.json({ status: "success", user: { ...userOut(u), createdAt: u.createdAt }, counts: { posts, followers, following }, isMe, isFollowing: Boolean(rel) });
  } catch (e) { next(e); }
};

const tab = async (req, res, next) => {
  try {
    const u = await findUser(req.params.nick);
    if (!u) return notFound(res);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * PER_PAGE;
    let items = [], total = 0;

    if (req.params.tab === "posts" || req.params.tab === "videos") {
      const where = { userId: u.id, ...(req.params.tab === "videos" ? { fileType: { startsWith: "video/" } } : {}) };
      const [rows, n] = await Promise.all([
        prisma.publication.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PER_PAGE, include: { user: AUTHOR } }),
        prisma.publication.count({ where }),
      ]);
      items = rows.map((p) => ({ at: p.createdAt, publication: pubOut(p) })); total = n;
    } else if (req.params.tab === "reposts") {
      const where = { userId: u.id };
      const [rows, n] = await Promise.all([
        prisma.repost.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: PER_PAGE, include: { publication: { include: { user: AUTHOR } } } }),
        prisma.repost.count({ where }),
      ]);
      items = rows.filter((r) => r.publication).map((r) => ({ at: r.createdAt, publication: pubOut(r.publication) })); total = n;
    } else if (req.params.tab === "tagged") {
      const rows = await prisma.publication.findMany({
        where: { text: { contains: `@${u.nick}`, mode: "insensitive" }, userId: { not: u.id } },
        orderBy: { createdAt: "desc" }, take: 300, include: { user: AUTHOR },
      });
      const all = rows.filter((p) => mentions(p.text, u.nick));
      total = all.length;
      items = all.slice(skip, skip + PER_PAGE).map((p) => ({ at: p.createdAt, publication: pubOut(p) }));
    } else return res.status(400).json({ status: "error", message: "Sección no válida" });

    res.json({ status: "success", items, page, totalDocs: total, hasMore: skip + PER_PAGE < total });
  } catch (e) { next(e); }
};

module.exports = { header, tab };
