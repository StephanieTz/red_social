const prisma = require("../database/prisma");

const fail = (res, m, c = 500) => res.status(c).json({ status: "error", message: m });
const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (e) { console.error(e); fail(res, "Error del servidor"); }
};

const AUTHOR = { select: { id: true, name: true, nick: true, imageKey: true } };
const formatUser = (u) => u ? { ...u, _id: u.id, image: u.imageKey } : u;
const formatPub = (p) => ({
  ...p, _id: p.id, file: p.fileKey, user: formatUser(p.user)
});
const formatComment = (c) => ({
  ...c, _id: c.id, user: formatUser(c.user), replyTo: formatUser(c.replyTo)
});

const toggle = async (model, where) => {
  const cur = await model.findUnique({ where });
  if (cur) { await model.delete({ where }); return false; }
  await model.create({ data: where }); return true;
};

// ==========================================
// ESTADÍSTICAS (Likes, comments, etc)
// ==========================================
const stats = wrap(async (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).slice(0, 50);
  const me = req.user.id;
  if (!ids.length) return res.json({ status: "success", stats: {} });

  const [reactions, comments, reposts, saves, myReactions, mySaves, myReposts] = await Promise.all([
    prisma.reaction.groupBy({ by: ["targetId", "value"], where: { kind: "POST", targetId: { in: ids } }, _count: true }),
    prisma.comment.groupBy({ by: ["publicationId"], where: { publicationId: { in: ids } }, _count: true }),
    prisma.repost.groupBy({ by: ["publicationId"], where: { publicationId: { in: ids } }, _count: true }),
    prisma.save.groupBy({ by: ["publicationId"], where: { publicationId: { in: ids } }, _count: true }),
    prisma.reaction.findMany({ where: { userId: me, kind: "POST", targetId: { in: ids } } }),
    prisma.save.findMany({ where: { userId: me, publicationId: { in: ids } } }),
    prisma.repost.findMany({ where: { userId: me, publicationId: { in: ids } } })
  ]);

  const out = {};
  ids.forEach(i => out[i] = { likes: 0, dislikes: 0, comments: 0, reposts: 0, mine: 0, saved: false, reposted: false });
  
  reactions.forEach(r => { out[r.targetId][r.value === 1 ? "likes" : "dislikes"] = r._count; });
  comments.forEach(r => { out[r.publicationId].comments = r._count; });
  reposts.forEach(r => { out[r.publicationId].reposts = r._count; });
  saves.forEach(r => { out[r.publicationId].saved = true; }); // Fix: saves detect
  myReactions.forEach(m => { out[m.targetId].mine = m.value; });
  mySaves.forEach(s => { out[s.publicationId].saved = true; });
  myReposts.forEach(r => { out[r.publicationId].reposted = true; });

  res.json({ status: "success", stats: out });
});

// ==========================================
// REACCIONES (Like/Dislike en Posts)
// ==========================================
const react = wrap(async (req, res) => {
  const { publication, value } = req.body;
  const v = Number(value);
  if (![1, -1].includes(v) || !publication) return fail(res, "Datos inválidos", 400);

  const pubExists = await prisma.publication.findUnique({ where: { id: publication } });
  if (!pubExists) return fail(res, "Publicación no encontrada", 404);

  const where = { userId_kind_targetId: { userId: req.user.id, kind: "POST", targetId: publication } };
  const cur = await prisma.reaction.findUnique({ where });

  let mine = v;
  if (cur && cur.value === v) {
    await prisma.reaction.delete({ where });
    mine = 0;
  } else if (cur) {
    await prisma.reaction.update({ where, data: { value: v } });
  } else {
    await prisma.reaction.create({ data: { userId: req.user.id, kind: "POST", targetId: publication, value: v } });
  }
  res.json({ status: "success", mine });
});

// ==========================================
// COMENTARIOS
// ==========================================
const comments = wrap(async (req, res) => {
  const pubId = req.params.id;
  const list = await prisma.comment.findMany({
    where: { publicationId: pubId },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { user: AUTHOR, replyTo: AUTHOR }
  });

  const ids = list.map(c => c.id);
  const [likes, myLikes] = await Promise.all([
    prisma.reaction.groupBy({ by: ["targetId"], where: { kind: "COMMENT", targetId: { in: ids } }, _count: true }),
    prisma.reaction.findMany({ where: { userId: req.user.id, kind: "COMMENT", targetId: { in: ids } } })
  ]);

  const L = new Map(likes.map(x => [x.targetId, x._count]));
  const M = new Set(myLikes.map(x => x.targetId));

  res.json({ 
    status: "success", 
    comments: list.map(c => ({ 
      ...formatComment(c), 
      likes: L.get(c.id) || 0, 
      liked: M.has(c.id) 
    })) 
  });
});

const addComment = wrap(async (req, res) => {
  const { publication, parent, text } = req.body;
  const txt = typeof text === "string" ? text.trim() : "";
  if (!publication || !txt || txt.length > 300) return fail(res, "Comentario inválido (1 a 300 caracteres)", 400);

  let root = null, replyTo = null;
  if (parent) {
    const p = await prisma.comment.findUnique({ where: { id: parent } });
    if (!p) return fail(res, "Comentario original no encontrado", 404);
    root = p.parentId || p.id;
    replyTo = p.userId;
  }

  const c = await prisma.comment.create({
    data: { userId: req.user.id, publicationId: publication, text: txt, parentId: root, replyToId: replyTo },
    include: { user: AUTHOR, replyTo: AUTHOR }
  });

  res.status(201).json({ status: "success", comment: { ...formatComment(c), likes: 0, liked: false } });
});

const removeComment = wrap(async (req, res) => {
  const c = await prisma.comment.findUnique({ where: { id: req.params.id }, include: { publication: true } });
  if (!c) return fail(res, "Comentario no encontrado", 404);
  if (c.userId !== req.user.id && c.publication.userId !== req.user.id) return fail(res, "No tienes permiso", 403);

  // Prisma borra las respuestas en cascada si configuramos onDelete Cascade en parentId
  await prisma.comment.delete({ where: { id: c.id } });
  res.json({ status: "success", removed: [c.id] });
});

const likeComment = wrap(async (req, res) => {
  const { comment } = req.body;
  if (!comment) return fail(res, "Comentario no encontrado", 404);
  
  const where = { userId_kind_targetId: { userId: req.user.id, kind: "COMMENT", targetId: comment } };
  const liked = await toggle(prisma.reaction, where);
  res.json({ status: "success", liked });
});

// ==========================================
// GUARDADOS Y REPOSTS
// ==========================================
const toggleSave = wrap(async (req, res) => {
  const { publication } = req.body;
  const where = { userId_publicationId: { userId: req.user.id, publicationId: publication } };
  const saved = await toggle(prisma.save, where);
  res.json({ status: "success", saved });
});

const toggleRepost = wrap(async (req, res) => {
  const { publication } = req.body;
  const pub = await prisma.publication.findUnique({ where: { id: publication } });
  if (!pub) return fail(res, "Publicación no encontrada", 404);
  if (pub.userId === req.user.id) return fail(res, "No puedes compartir tu propia publicación", 400);

  const where = { userId_publicationId: { userId: req.user.id, publicationId: publication } };
  const reposted = await toggle(prisma.repost, where);
  res.json({ status: "success", reposted });
});

const saved = wrap(async (req, res) => {
  const rows = await prisma.save.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { publication: { include: { user: AUTHOR } } }
  });

  let items = rows.filter(r => r.publication).map(r => ({ at: r.createdAt, publication: formatPub(r.publication) }));
  const t = req.query.type;
  const VID = /\..(mp4|webm)$/i, IMG = /\..(jpe?g|png)$/i;
  if (t === "video") items = items.filter(i => VID.test(i.publication.file || ""));
  if (t === "image") items = items.filter(i => IMG.test(i.publication.file || ""));
  
  res.json({ status: "success", items });
});

// ==========================================
// ACTIVIDAD Y BUSCADOR
// ==========================================
const activity = wrap(async (req, res) => {
  const me = req.user.id, tab = req.params.tab, N = 60;
  let items = [];

  if (tab === "likes") {
    const rows = await prisma.reaction.findMany({ where: { userId: me, value: 1 }, orderBy: { createdAt: "desc" }, take: N });
    const pids = rows.filter(r => r.kind === "POST").map(r => r.targetId);
    const cids = rows.filter(r => r.kind === "COMMENT").map(r => r.targetId);
    
    const [pubs, cms] = await Promise.all([
      prisma.publication.findMany({ where: { id: { in: pids } }, include: { user: AUTHOR } }),
      prisma.comment.findMany({ where: { id: { in: cids } }, include: { user: AUTHOR, publication: { include: { user: AUTHOR } } } })
    ]);
    const P = new Map(pubs.map(p => [p.id, formatPub(p)]));
    const C = new Map(cms.map(c => [c.id, formatComment(c)]));
    
    items = rows.map(r => {
      if (r.kind === "POST") return { at: r.createdAt, publication: P.get(r.targetId) };
      return { at: r.createdAt, comment: C.get(r.targetId) };
    }).filter(i => i.publication || i.comment);
  } 
  else if (tab === "comments") {
    const cs = await prisma.comment.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, take: N, include: { user: AUTHOR, publication: { include: { user: AUTHOR } } } });
    items = cs.map(c => ({ at: c.createdAt, comment: formatComment(c) }));
  } 
  else if (tab === "reposts") {
    const rs = await prisma.repost.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, take: N, include: { publication: { include: { user: AUTHOR } } } });
    items = rs.filter(r => r.publication).map(r => ({ at: r.createdAt, publication: formatPub(r.publication) }));
  } 
  else if (tab === "posts") {
    const ps = await prisma.publication.findMany({ where: { userId: me }, orderBy: { createdAt: "desc" }, take: N, include: { user: AUTHOR } });
    items = ps.map(p => ({ at: p.createdAt, publication: formatPub(p) }));
  } 
  else return fail(res, "Sección no válida", 400);

  res.json({ status: "success", items });
});

const search = wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 30);
  if (q.length < 2) return res.json({ status: "success", users: [] });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nick: { contains: q, mode: "insensitive" } }
      ],
      id: { not: req.user.id }
    },
    take: 8,
    select: { id: true, name: true, nick: true, imageKey: true, bio: true }
  });

  res.json({ status: "success", users: users.map(formatUser) });
});

module.exports = { stats, react, comments, addComment, removeComment, likeComment, toggleSave, toggleRepost, saved, activity, search };