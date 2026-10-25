const Reaction = require("../models/reaction");
const Comment = require("../models/comment");
const Repost = require("../models/repost");
const Save = require("../models/save");
const User = require("../models/user");
const Publication = require("../models/publication");
const mongoose = require("mongoose");

const fail = (res, m, c = 500) => res.status(c).json({ status: "error", message: m });
const wrap = fn => async (req, res) => { try { await fn(req, res); } catch (e) { console.error(e); fail(res, "Error del servidor"); } };
const ok = v => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
const O = s => new mongoose.Types.ObjectId(s);
const AUTHOR = "name nick image";
const toggle = async (M, f, extra) => { const cur = await M.findOne(f); if (cur) { await cur.deleteOne(); return false; } await M.create({ ...f, ...extra }); return true; };
const pubExists = id => ok(id) && Publication.exists({ _id: id });

// ---------- contadores de varias publicaciones ----------
const stats = wrap(async (req, res) => {
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter(ok).slice(0, 50), oid = ids.map(O), me = req.user.id;
  const cnt = (M, f, k) => M.aggregate([{ $match: f }, { $group: { _id: k, n: { $sum: 1 } } }]);
  const [rx, cm, rp, mine, sv, mr] = await Promise.all([
    cnt(Reaction, { kind: "post", target: { $in: oid } }, { p: "$target", v: "$value" }),
    cnt(Comment, { publication: { $in: oid } }, { p: "$publication" }),
    cnt(Repost, { publication: { $in: oid } }, { p: "$publication" }),
    Reaction.find({ user: me, kind: "post", target: { $in: oid } }),
    Save.find({ user: me, publication: { $in: oid } }),
    Repost.find({ user: me, publication: { $in: oid } })
  ]);
  const out = {};
  ids.forEach(i => (out[i] = { likes: 0, dislikes: 0, comments: 0, reposts: 0, mine: 0, saved: false, reposted: false }));
  rx.forEach(r => (out[r._id.p][r._id.v === 1 ? "likes" : "dislikes"] = r.n));
  cm.forEach(r => (out[r._id.p].comments = r.n));
  rp.forEach(r => (out[r._id.p].reposts = r.n));
  mine.forEach(m => (out[m.target].mine = m.value));
  sv.forEach(s => (out[s.publication].saved = true));
  mr.forEach(r => (out[r.publication].reposted = true));
  res.json({ status: "success", stats: out });
});

// ---------- like / dislike en publicaciones (propias y ajenas) ----------
const react = wrap(async (req, res) => {
  const { publication } = req.body, v = Number(req.body.value);
  if (![1, -1].includes(v) || !ok(publication)) return fail(res, "Datos inválidos", 400);
  if (!(await pubExists(publication))) return fail(res, "Publicación no encontrada", 404);
  const f = { user: req.user.id, kind: "post", target: publication }, cur = await Reaction.findOne(f);
  let mine = v;
  if (cur && cur.value === v) { await cur.deleteOne(); mine = 0; }
  else if (cur) { cur.value = v; await cur.save(); }
  else await Reaction.create({ ...f, value: v });
  res.json({ status: "success", mine });
});

// ---------- comentarios, respuestas y likes de comentarios ----------
const withLikes = async (list, me) => {
  const ids = list.map(c => c._id);
  const [lk, ml] = await Promise.all([
    Reaction.aggregate([{ $match: { kind: "comment", target: { $in: ids } } }, { $group: { _id: "$target", n: { $sum: 1 } } }]),
    Reaction.find({ user: me, kind: "comment", target: { $in: ids } })
  ]);
  const L = new Map(lk.map(x => [String(x._id), x.n])), M = new Set(ml.map(x => String(x.target)));
  return list.map(c => ({ ...c.toObject(), likes: L.get(String(c._id)) || 0, liked: M.has(String(c._id)) }));
};

const comments = wrap(async (req, res) => {
  if (!ok(req.params.id)) return fail(res, "ID inválido", 400);
  const list = await Comment.find({ publication: req.params.id }).sort({ created_at: 1 }).limit(300).populate("user replyTo", AUTHOR);
  res.json({ status: "success", comments: await withLikes(list, req.user.id) });
});

const addComment = wrap(async (req, res) => {
  const { publication, parent } = req.body, text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  if (!ok(publication) || !text || text.length > 300) return fail(res, "Comentario inválido (1 a 300 caracteres)", 400);
  if (!(await pubExists(publication))) return fail(res, "Publicación no encontrada", 404);
  let root = null, replyTo = null;
  if (parent) {
    const p = ok(parent) && (await Comment.findOne({ _id: parent, publication }));
    if (!p) return fail(res, "El comentario al que respondes no existe", 404);
    root = p.parent || p._id; replyTo = p.user; // las respuestas viven a un solo nivel
  }
  const c = await Comment.create({ user: req.user.id, publication, text, parent: root, replyTo });
  await c.populate("user replyTo", AUTHOR);
  res.status(201).json({ status: "success", comment: { ...c.toObject(), likes: 0, liked: false } });
});

// Puede borrar el autor del comentario o el dueño de la publicación
const removeComment = wrap(async (req, res) => {
  if (!ok(req.params.id)) return fail(res, "ID inválido", 400);
  const c = await Comment.findById(req.params.id);
  if (!c) return fail(res, "Comentario no encontrado", 404);
  const pub = await Publication.findById(c.publication).select("user");
  if (c.user.toString() !== req.user.id && pub?.user.toString() !== req.user.id) return fail(res, "No tienes permiso", 403);
  const ids = [c._id, ...(await Comment.find({ parent: c._id }).select("_id")).map(x => x._id)];
  await Promise.all([Comment.deleteMany({ _id: { $in: ids } }), Reaction.deleteMany({ kind: "comment", target: { $in: ids } })]);
  res.json({ status: "success", removed: ids.map(String) });
});

const likeComment = wrap(async (req, res) => {
  if (!ok(req.body.comment) || !(await Comment.exists({ _id: req.body.comment }))) return fail(res, "Comentario no encontrado", 404);
  const liked = await toggle(Reaction, { user: req.user.id, kind: "comment", target: req.body.comment }, { value: 1 });
  res.json({ status: "success", liked });
});

// ---------- guardados y reposts ----------
const toggleSave = wrap(async (req, res) => {
  if (!(await pubExists(req.body.publication))) return fail(res, "Publicación no encontrada", 404);
  res.json({ status: "success", saved: await toggle(Save, { user: req.user.id, publication: req.body.publication }) });
});

const toggleRepost = wrap(async (req, res) => {
  const pub = ok(req.body.publication) && (await Publication.findById(req.body.publication).select("user"));
  if (!pub) return fail(res, "Publicación no encontrada", 404);
  if (pub.user.toString() === req.user.id) return fail(res, "No puedes compartir tu propia publicación", 400);
  res.json({ status: "success", reposted: await toggle(Repost, { user: req.user.id, publication: pub._id }) });
});

const saved = wrap(async (req, res) => {
  const rows = await Save.find({ user: req.user.id }).sort({ created_at: -1 }).limit(100).populate({ path: "publication", populate: { path: "user", select: AUTHOR } });
  let items = rows.filter(r => r.publication).map(r => ({ at: r.created_at, publication: r.publication }));
  const t = req.query.type, VID = /\.(mp4|webm)$/i, IMG = /\.(jpe?g|png)$/i;
  if (t === "video") items = items.filter(i => VID.test(i.publication.file || ""));
  if (t === "image") items = items.filter(i => IMG.test(i.publication.file || ""));
  res.json({ status: "success", items });
});

// ---------- actividad del usuario: likes, comentarios, reposts, publicaciones ----------
const activity = wrap(async (req, res) => {
  const me = req.user.id, tab = req.params.tab, N = 60;
  const popPub = { path: "publication", populate: { path: "user", select: AUTHOR } };
  let items = [];
  if (tab === "likes") {
    const rows = await Reaction.find({ user: me, value: 1 }).sort({ _id: -1 }).limit(N);
    const pids = rows.filter(r => r.kind === "post").map(r => r.target), cids = rows.filter(r => r.kind === "comment").map(r => r.target);
    const [pubs, cms] = await Promise.all([
      Publication.find({ _id: { $in: pids } }).populate("user", AUTHOR),
      Comment.find({ _id: { $in: cids } }).populate("user", AUTHOR)
    ]);
    const P = new Map(pubs.map(p => [String(p._id), p])), C = new Map(cms.map(c => [String(c._id), c]));
    items = rows.map(r => { const at = r._id.getTimestamp(); return r.kind === "post" ? { at, publication: P.get(String(r.target)) } : { at, comment: C.get(String(r.target)) }; }).filter(i => i.publication || i.comment);
  } else if (tab === "comments") {
    const cs = await Comment.find({ user: me }).sort({ created_at: -1 }).limit(N).populate("user", AUTHOR)
      .populate({ path: "publication", select: "text user", populate: { path: "user", select: "name nick" } });
    items = cs.filter(c => c.publication).map(c => ({ at: c.created_at, comment: c }));
  } else if (tab === "reposts") {
    const rs = await Repost.find({ user: me }).sort({ created_at: -1 }).limit(N).populate(popPub);
    items = rs.filter(r => r.publication).map(r => ({ at: r.created_at, publication: r.publication }));
  } else if (tab === "posts") {
    const ps = await Publication.find({ user: me }).sort({ created_at: -1 }).limit(N).populate("user", AUTHOR);
    items = ps.map(p => ({ at: p.created_at, publication: p }));
  } else return fail(res, "Sección no válida", 400);
  res.json({ status: "success", items });
});

// ---------- buscador de usuarios ----------
const search = wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 30);
  if (q.length < 2) return res.json({ status: "success", users: [] });
  const r = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const users = await User.find({ $or: [{ name: r }, { nick: r }], _id: { $ne: req.user.id } }).select("name nick image bio").limit(8);
  res.json({ status: "success", users });
});

module.exports = { stats, react, comments, addComment, removeComment, likeComment, toggleSave, toggleRepost, saved, activity, search };
