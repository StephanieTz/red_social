const fs = require("fs");
const path = require("path");
const Publication = require("../models/publication");
const Repost = require("../models/repost");
const Comment = require("../models/comment");
const Reaction = require("../models/reaction");
const Save = require("../models/save");

const err = (res, code, message) => res.status(code).json({ status: "error", message });
const srv = (res, e) => { console.error(e); return err(res, 500, "Error del servidor"); };
const AUTHOR = "name nick image";

const pruebaPublication = (req, res) => res.status(200).send({ message: "Prueba publication OK" });

const create = async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (!text) return err(res, 400, "El texto es obligatorio");
    if (text.length > 500) return err(res, 400, "El texto admite máximo 500 caracteres");
    const stored = await new Publication({ user: req.user.id, text, file: req.file ? req.file.filename : null }).save();
    return res.status(201).json({ status: "success", message: "Publicación creada", publication: stored });
  } catch (e) { return srv(res, e); }
};

// Feed = publicaciones + reposts mezclados por fecha. Para la página N se toman las N*10 más
// recientes de cada fuente, se mezclan y se corta la ventana de esa página.
const feed = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1), limit = 10, k = page * limit;
    const [pubs, reps, np, nr] = await Promise.all([
      Publication.find().sort({ created_at: -1 }).limit(k).populate("user", AUTHOR),
      Repost.find().sort({ created_at: -1 }).limit(k).populate("user", AUTHOR).populate({ path: "publication", populate: { path: "user", select: AUTHOR } }),
      Publication.countDocuments(), Repost.countDocuments()
    ]);
    const all = [
      ...pubs.map(p => ({ type: "post", at: p.created_at, publication: p })),
      ...reps.filter(r => r.publication).map(r => ({ type: "repost", at: r.created_at, by: r.user, publication: r.publication }))
    ].sort((a, b) => b.at - a.at).slice(k - limit, k);
    return res.status(200).json({ status: "success", items: all, totalDocs: np + nr, totalPages: Math.ceil((np + nr) / limit) });
  } catch (e) { return srv(res, e); }
};

const profilePublications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const r = await Publication.paginate({ user: req.params.id }, { page, limit: 5, sort: { created_at: -1 }, populate: { path: "user", select: AUTHOR } });
    return res.status(200).json({ status: "success", publications: r.docs, totalDocs: r.totalDocs });
  } catch { return err(res, 400, "ID inválido"); }
};

const remove = async (req, res) => {
  try {
    const pub = await Publication.findById(req.params.id);
    if (!pub) return err(res, 404, "Publicación no encontrada");
    if (pub.user.toString() !== req.user.id) return err(res, 403, "No tienes permiso");
    const cids = (await Comment.find({ publication: pub._id }).select("_id")).map(c => c._id);
    await Promise.all([
      Comment.deleteMany({ publication: pub._id }), Repost.deleteMany({ publication: pub._id }), Save.deleteMany({ publication: pub._id }),
      Reaction.deleteMany({ $or: [{ kind: "post", target: pub._id }, { kind: "comment", target: { $in: cids } }] }),
      Publication.findByIdAndDelete(pub._id)
    ]);
    if (pub.file) fs.unlink(path.join(__dirname, "../../uploads", path.basename(pub.file)), () => {});
    return res.status(200).json({ status: "success", message: "Publicación eliminada" });
  } catch { return err(res, 400, "ID inválido"); }
};

module.exports = { pruebaPublication, create, feed, profilePublications, remove };
