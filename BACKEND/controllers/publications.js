/** Inicio: publicaciones y reposts mezclados por fecha (como en el diseño original). */
const validator = require("validator");
const prisma = require("../database/prisma");
const { userOut, pubOut } = require("../services/serialize");

const AUTHOR = { select: { id: true, name: true, nick: true, imageKey: true } };
const PER_PAGE = 10;

// GET /api/publications/feed/:page — para la página N se toman las N*10 más recientes de cada fuente,
// se mezclan y se corta la ventana de esa página.
const feed = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const k = page * PER_PAGE;
    const [pubs, reps, np, nr] = await Promise.all([
      prisma.publication.findMany({ orderBy: { createdAt: "desc" }, take: k, include: { user: AUTHOR } }),
      prisma.repost.findMany({ orderBy: { createdAt: "desc" }, take: k, include: { user: AUTHOR, publication: { include: { user: AUTHOR } } } }),
      prisma.publication.count(),
      prisma.repost.count(),
    ]);
    const all = [
      ...pubs.map((p) => ({ type: "post", at: p.createdAt, publication: pubOut(p) })),
      ...reps.filter((r) => r.publication).map((r) => ({ type: "repost", at: r.createdAt, by: userOut(r.user), publication: pubOut(r.publication) })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(k - PER_PAGE, k);
    res.json({ status: "success", items: all, totalDocs: np + nr, totalPages: Math.max(1, Math.ceil((np + nr) / PER_PAGE)) });
  } catch (e) { next(e); }
};

// GET /api/publications/profile/:id/:page — publicaciones de un usuario (y su total)
const profile = async (req, res, next) => {
  try {
    if (!validator.isUUID(req.params.id)) return res.status(400).json({ status: "error", message: "ID inválido" });
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const where = { userId: req.params.id };
    const [docs, total] = await Promise.all([
      prisma.publication.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 5, take: 5, include: { user: AUTHOR } }),
      prisma.publication.count({ where }),
    ]);
    res.json({ status: "success", publications: docs.map(pubOut), totalDocs: total });
  } catch (e) { next(e); }
};

// GET /api/publications/:id — una publicación (para abrirla desde el perfil)
const getOne = async (req, res, next) => {
  try {
    if (!validator.isUUID(req.params.id)) return res.status(400).json({ status: "error", message: "ID inválido" });
    const p = await prisma.publication.findUnique({ where: { id: req.params.id }, include: { user: AUTHOR } });
    if (!p) return res.status(404).json({ status: "error", message: "Publicación no encontrada" });
    res.json({ status: "success", publication: pubOut(p) });
  } catch (e) { next(e); }
};

module.exports = { feed, profile, getOne };
