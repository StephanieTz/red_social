/**
 * Módulo social: me gusta / no me gusta, comentarios con respuestas, guardados, reposts,
 * actividad del usuario y buscador. Todas las rutas exigen sesión (ver routes/social.js).
 */
const validator = require("validator");
const prisma = require("../database/prisma");
const { userOut, pubOut } = require("../services/serialize");

const fail = (res, m, c = 500) => res.status(c).json({ status: "error", message: m });
const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (e) { console.error(e); fail(res, "Error del servidor"); }
};
const isId = (v) => typeof v === "string" && validator.isUUID(v);

const AUTHOR = { select: { id: true, name: true, nick: true, imageKey: true } };
const commentOut = (c) => ({
  ...c, _id: c.id, created_at: c.createdAt, user: userOut(c.user), replyTo: userOut(c.replyTo),
  publication: c.publication ? { _id: c.publication.id, text: c.publication.text, user: userOut(c.publication.user) } : undefined,
});

/** Alterna un registro único (guardar, repostear, like a comentario): lo crea si no existe y lo borra si existe. */
const toggle = async (model, uniqueWhere, data) => {
  const cur = await model.findUnique({ where: uniqueWhere });
  if (cur) { await model.delete({ where: uniqueWhere }); return false; }
  await model.create({ data });
  return true;
};
const pubExists = async (id) => isId(id) && Boolean(await prisma.publication.findUnique({ where: { id }, select: { id: true } }));

// ---------- contadores de varias publicaciones ----------
const stats = wrap(async (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter(isId).slice(0, 50);
  const me = req.user.id;
  if (!ids.length) return res.json({ status: "success", stats: {} });

  const [reactions, comments, reposts, myReactions, mySaves, myReposts] = await Promise.all([
    prisma.reaction.groupBy({ by: ["targetId", "value"], where: { kind: "POST", targetId: { in: ids } }, _count: true }),
    prisma.comment.groupBy({ by: ["publicationId"], where: { publicationId: { in: ids } }, _count: true }),
    prisma.repost.groupBy({ by: ["publicationId"], where: { publicationId: { in: ids } }, _count: true }),
    prisma.reaction.findMany({ where: { userId: me, kind: "POST", targetId: { in: ids } } }),
    prisma.save.findMany({ where: { userId: me, publicationId: { in: ids } } }),
    prisma.repost.findMany({ where: { userId: me, publicationId: { in: ids } } }),
  ]);

  const out = {};
  ids.forEach((i) => (out[i] = { likes: 0, dislikes: 0, comments: 0, reposts: 0, mine: 0, saved: false, reposted: false }));
  reactions.forEach((r) => { out[r.targetId][r.value === 1 ? "likes" : "dislikes"] = r._count; });
  comments.forEach((r) => { out[r.publicationId].comments = r._count; });
  reposts.forEach((r) => { out[r.publicationId].reposts = r._count; });
  myReactions.forEach((m) => { out[m.targetId].mine = m.value; });
  mySaves.forEach((s) => { out[s.publicationId].saved = true; });
  myReposts.forEach((r) => { out[r.publicationId].reposted = true; });
  res.json({ status: "success", stats: out });
});

// ---------- like / dislike en publicaciones ----------
const react = wrap(async (req, res) => {
  const { publication } = req.body;
  const v = Number(req.body.value);
  if (![1, -1].includes(v) || !isId(publication)) return fail(res, "Datos inválidos", 400);
  if (!(await pubExists(publication))) return fail(res, "Publicación no encontrada", 404);

  const where = { userId_kind_targetId: { userId: req.user.id, kind: "POST", targetId: publication } };
  const cur = await prisma.reaction.findUnique({ where });
  let mine = v;
  if (cur && cur.value === v) { await prisma.reaction.delete({ where }); mine = 0; }
  else if (cur) await prisma.reaction.update({ where, data: { value: v } });
  else await prisma.reaction.create({ data: { userId: req.user.id, kind: "POST", targetId: publication, value: v } });
  res.json({ status: "success", mine });
});

// ---------- comentarios, respuestas y likes de comentarios ----------
const comments = wrap(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, "ID inválido", 400);
  const list = await prisma.comment.findMany({
    where: { publicationId: req.params.id }, orderBy: { createdAt: "asc" }, take: 300,
    include: { user: AUTHOR, replyTo: AUTHOR },
  });
  const ids = list.map((c) => c.id);
  const [likes, myLikes] = await Promise.all([
    prisma.reaction.groupBy({ by: ["targetId"], where: { kind: "COMMENT", targetId: { in: ids } }, _count: true }),
    prisma.reaction.findMany({ where: { userId: req.user.id, kind: "COMMENT", targetId: { in: ids } } }),
  ]);
  const L = new Map(likes.map((x) => [x.targetId, x._count]));
  const M = new Set(myLikes.map((x) => x.targetId));
  res.json({ status: "success", comments: list.map((c) => ({ ...commentOut(c), likes: L.get(c.id) || 0, liked: M.has(c.id) })) });
});

const addComment = wrap(async (req, res) => {
  const { publication, parent } = req.body;
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  if (!isId(publication) || !text || text.length > 300) return fail(res, "Comentario inválido (1 a 300 caracteres)", 400);
  if (!(await pubExists(publication))) return fail(res, "Publicación no encontrada", 404);

  let root = null, replyTo = null;
  if (parent) {
    const p = isId(parent) ? await prisma.comment.findUnique({ where: { id: parent } }) : null;
    if (!p || p.publicationId !== publication) return fail(res, "El comentario al que respondes no existe", 404);
    root = p.parentId || p.id; // las respuestas viven a un solo nivel
    replyTo = p.userId;
  }
  const c = await prisma.comment.create({
    data: { userId: req.user.id, publicationId: publication, text, parentId: root, replyToId: replyTo },
    include: { user: AUTHOR, replyTo: AUTHOR },
  });
  res.status(201).json({ status: "success", comment: { ...commentOut(c), likes: 0, liked: false } });
});

// Puede borrar el autor del comentario o el dueño de la publicación
const removeComment = wrap(async (req, res) => {
  if (!isId(req.params.id)) return fail(res, "ID inválido", 400);
  const c = await prisma.comment.findUnique({ where: { id: req.params.id }, include: { publication: true } });
  if (!c) return fail(res, "Comentario no encontrado", 404);
  if (c.userId !== req.user.id && c.publication.userId !== req.user.id) return fail(res, "No tienes permiso", 403);

  const replies = await prisma.comment.findMany({ where: { parentId: c.id }, select: { id: true } });
  const ids = [c.id, ...replies.map((r) => r.id)];
  await prisma.reaction.deleteMany({ where: { kind: "COMMENT", targetId: { in: ids } } }); // sin FK: se limpia aquí
  await prisma.comment.delete({ where: { id: c.id } });                                    // las respuestas caen en cascada
  res.json({ status: "success", removed: ids });
});

const likeComment = wrap(async (req, res) => {
  const { comment } = req.body;
  if (!isId(comment) || !(await prisma.comment.findUnique({ where: { id: comment }, select: { id: true } }))) return fail(res, "Comentario no encontrado", 404);
  const liked = await toggle(
    prisma.reaction,
    { userId_kind_targetId: { userId: req.user.id, kind: "COMMENT", targetId: comment } },
    { userId: req.user.id, kind: "COMMENT", targetId: comment, value: 1 },
  );
  res.json({ status: "success", liked });
});

// ---------- guardados y reposts ----------
const toggleSave = wrap(async (req, res) => {
  const { publication } = req.body;
  if (!(await pubExists(publication))) return fail(res, "Publicación no encontrada", 404);
  const saved = await toggle(
    prisma.save,
    { userId_publicationId: { userId: req.user.id, publicationId: publication } },
    { userId: req.user.id, publicationId: publication },
  );
  res.json({ status: "success", saved });
});

const toggleRepost = wrap(async (req, res) => {
  const { publication } = req.body;
  const pub = isId(publication) ? await prisma.publication.findUnique({ where: { id: publication } }) : null;
  if (!pub) return fail(res, "Publicación no encontrada", 404);
  if (pub.userId === req.user.id) return fail(res, "No puedes compartir tu propia publicación", 400);
  const reposted = await toggle(
    prisma.repost,
    { userId_publicationId: { userId: req.user.id, publicationId: publication } },
    { userId: req.user.id, publicationId: publication },
  );
  res.json({ status: "success", reposted });
});

const saved = wrap(async (req, res) => {
  const rows = await prisma.save.findMany({
    where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 100,
    include: { publication: { include: { user: AUTHOR } } },
  });
  let items = rows.filter((r) => r.publication).map((r) => ({ at: r.createdAt, publication: pubOut(r.publication) }));
  if (req.query.type === "image") items = items.filter((i) => i.publication.hasImage);
  res.json({ status: "success", items });
});

// ---------- actividad del usuario ----------
const activity = wrap(async (req, res) => {
  const me = req.user.id, tab = req.params.tab, N = 60;
  const withPub = { publication: { include: { user: AUTHOR } } };
  let items = [];

  if (tab === "likes") {
    const rows = await prisma.reaction.findMany({ where: { userId: me, value: 1 }, orderBy: { createdAt: "desc" }, take: N });
    const pids = rows.filter((r) => r.kind === "POST").map((r) => r.targetId);
    const cids = rows.filter((r) => r.kind === "COMMENT").map((r) => r.targetId);
    const [pubs, cms] = await Promise.all([
      prisma.publication.findMany({ where: { id: { in: pids } }, include: { user: AUTHOR } }),
      prisma.comment.findMany({ where: { id: { in: cids } }, include: { user: AUTHOR, ...withPub } }),
    ]);
    const P = new Map(pubs.map((p) => [p.id, pubOut(p)]));
    const C = new Map(cms.map((c) => [c.id, commentOut(c)]));
    items = rows
      .map((r) => (r.kind === "POST" ? { at: r.createdAt, publication: P.get(r.targetId) } : { at: r.createdAt, comment: C.get(r.targetId) }))
      .filter((i) => i.publication || i.comment);
  } else if (tab === "comments") {
    const cs = await prisma.comment.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, take: N, include: { user: AUTHOR, ...withPub } });
    items = cs.map((c) => ({ at: c.createdAt, comment: commentOut(c) }));
  } else if (tab === "reposts") {
    const rs = await prisma.repost.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, take: N, include: withPub });
    items = rs.filter((r) => r.publication).map((r) => ({ at: r.createdAt, publication: pubOut(r.publication) }));
  } else if (tab === "posts") {
    const ps = await prisma.publication.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, take: N, include: { user: AUTHOR } });
    items = ps.map((p) => ({ at: p.createdAt, publication: pubOut(p) }));
  } else return fail(res, "Sección no válida", 400);

  res.json({ status: "success", items });
});

// ---------- buscador de usuarios ----------
const search = wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 30);
  if (q.length < 2) return res.json({ status: "success", users: [] });
  const users = await prisma.user.findMany({
    where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { nick: { contains: q, mode: "insensitive" } }], id: { not: req.user.id } },
    take: 8,
    select: { id: true, name: true, nick: true, imageKey: true, bio: true },
  });
  res.json({ status: "success", users: users.map(userOut) });
});

module.exports = { stats, react, comments, addComment, removeComment, likeComment, toggleSave, toggleRepost, saved, activity, search };
