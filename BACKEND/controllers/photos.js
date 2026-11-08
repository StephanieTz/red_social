/**
 * Publicaciones con foto o video corto: subida, galería de miniaturas, detalle con transformaciones y borrado.
 * (También permite publicar solo texto, como en el diseño original.)
 *
 * Una publicación con foto = fila de `publications` (con thumb_key) + filas en `publication_transforms`
 * + opcionalmente una fila en `image_analysis`. Los archivos viven en S3 (o disco en desarrollo);
 * la base de datos solo guarda sus claves.
 *
 * Claves:  photos/{userId}/{photoId}/{original.ext | thumb.jpg | feed.jpg | grayscale.jpg | sepia.jpg | upscale.jpg}
 */
const crypto = require("crypto");
const validator = require("validator");
const prisma = require("../database/prisma");
const { getStorage } = require("../services/storage");
const images = require("../services/images");
const analysis = require("../services/analysis");
const cfg = require("../config/env");
const { inspectVideo } = require("../services/video");
const audit = require("../services/audit");
const { url, feedKeyOf, userOut, pubOut } = require("../services/serialize");

const err = (res, code, message) => res.status(code).json({ status: "error", message });
const AUTHOR = { select: { id: true, name: true, nick: true, imageKey: true } };
const LABEL = { GRAYSCALE: "Blanco y negro", SEPIA: "Sepia", UPSCALE: "Ampliación 2×" };
const ORDER = ["GRAYSCALE", "SEPIA", "UPSCALE"];

const card = (p) => ({ ...pubOut(p), caption: p.text, faceCount: p.analysis?.faceCount ?? 0 });
const detail = (p) => ({
  id: p.id, caption: p.text, createdAt: p.createdAt, user: userOut(p.user),
  original: { url: url(p.fileKey), width: p.width, height: p.height, sizeBytes: p.sizeBytes, type: p.fileType },
  transforms: [...p.transforms]
    .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
    .map((t) => ({ type: t.type, label: LABEL[t.type] || t.type, url: url(t.s3Key), width: t.width, height: t.height, sizeBytes: t.sizeBytes })),
  analysis: p.analysis && { provider: p.analysis.provider, faceCount: p.analysis.faceCount, faces: p.analysis.faces, labels: p.analysis.labels },
});

// GET /api/photos?page=1&limit=24&mine=1&user=<uuid>   → miniaturas
const list = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 24, 1), 48);
    const where = { thumbKey: { not: null } };
    if (req.query.kind === "video") where.fileType = { startsWith: "video/" };
    else if (req.query.kind === "image") where.fileType = { startsWith: "image/" };
    if (req.query.mine) where.userId = req.user.id;
    else if (req.query.user) {
      if (!validator.isUUID(String(req.query.user))) return err(res, 400, "ID inválido");
      where.userId = req.query.user;
    }
    const [items, totalDocs] = await Promise.all([
      prisma.publication.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { user: AUTHOR, analysis: { select: { faceCount: true } } } }),
      prisma.publication.count({ where }),
    ]);
    res.json({ status: "success", items: items.map(card), page, totalDocs, totalPages: Math.ceil(totalDocs / limit) });
  } catch (e) { next(e); }
};

// GET /api/photos/:id   → original + transformaciones + análisis
const get = async (req, res, next) => {
  try {
    if (!validator.isUUID(req.params.id)) return err(res, 400, "ID inválido");
    const p = await prisma.publication.findUnique({ where: { id: req.params.id }, include: { user: AUTHOR, transforms: true, analysis: true } });
    if (!p || !p.thumbKey) return err(res, 404, "Foto no encontrada");
    res.json({ status: "success", photo: detail(p) });
  } catch (e) { next(e); }
};

// POST /api/photos   (multipart: text?, file? (foto o video), poster? (portada del video), faces?)
const create = async (req, res, next) => {
  const stored = [];
  try {
    const caption = typeof req.body.text === "string" ? req.body.text.trim() : "";
    if (caption.length > 500) return err(res, 400, "El texto admite máximo 500 caracteres");
    const file = req.files?.file?.[0];
    const poster = req.files?.poster?.[0];

    // Publicación solo de texto
    if (!file) {
      if (!caption) return err(res, 400, "Escribe un texto o adjunta una foto o video");
      const post = await prisma.publication.create({ data: { userId: req.user.id, text: caption }, include: { user: AUTHOR } });
      await audit.log(req, "post.create", { entity: "photo", entityId: post.id });
      return res.status(201).json({ status: "success", message: "Publicado", publication: pubOut(post) });
    }

    // Foto: miniatura + feed + 3 transformaciones. Video: se valida su firma y se usa la portada (fotograma) para miniatura y feed.
    const isVideo = file.mimetype.startsWith("video/");
    let source, img;
    if (isVideo) {
      const v = inspectVideo(file.buffer);
      if (!poster) return err(res, 400, "No se pudo leer el video (usa MP4 con H.264 o WEBM)");
      if (poster.size > 3 * 1024 * 1024) return err(res, 400, "La portada del video es demasiado grande");
      img = await images.processImage(poster.buffer, { transforms: false });
      source = { ext: v.ext, mime: v.mime, width: img.original.width, height: img.original.height, size: file.size };
    } else {
      if (file.size > cfg.maxUploadMb * 1024 * 1024) return err(res, 400, `La imagen supera el máximo de ${cfg.maxUploadMb} MB`);
      img = await images.processImage(file.buffer);
      source = img.original;
    }

    const ai = await analysis.analyze(img.analysisBuffer, isVideo ? null : analysis.sanitizeFaces(req.body.faces));
    if (ai.flagged) {
      await audit.log(req, "photo.rejected", { entity: "photo", metadata: { reason: "moderation" } });
      return err(res, 422, "El contenido fue rechazado por contener material inapropiado");
    }

    const id = crypto.randomUUID();
    const base = `photos/${req.user.id}/${id}`;
    const files = [
      { key: `${base}/original.${source.ext}`, buffer: file.buffer, type: source.mime },
      { key: `${base}/thumb.jpg`, buffer: img.thumb.buffer, type: "image/jpeg" },
      { key: `${base}/feed.jpg`, buffer: img.feed.buffer, type: "image/jpeg" },
      ...img.transforms.map((t) => ({ key: `${base}/${t.type.toLowerCase()}.jpg`, buffer: t.buffer, type: "image/jpeg", t })),
    ];

    const storage = getStorage();
    stored.push(...files.map((f) => f.key));            // se registran antes de subir para poder limpiar si algo falla
    await Promise.all(files.map((f) => storage.put(f.key, f.buffer, f.type)));

    const withTransforms = files.filter((f) => f.t);
    const pub = await prisma.publication.create({
      data: {
        id, userId: req.user.id, text: caption,
        fileKey: files[0].key, fileType: source.mime, thumbKey: files[1].key,
        width: source.width, height: source.height, sizeBytes: source.size,
        ...(withTransforms.length ? { transforms: { create: withTransforms.map((f) => ({ type: f.t.type, s3Key: f.key, width: f.t.width, height: f.t.height, sizeBytes: f.t.size })) } } : {}),
        ...(ai.row ? { analysis: { create: ai.row } } : {}),
      },
      include: { user: AUTHOR, transforms: true, analysis: true },
    });

    await audit.log(req, "photo.upload", { entity: "photo", entityId: id, metadata: { bytes: source.size, video: isVideo, faces: pub.analysis?.faceCount ?? null } });
    res.status(201).json({ status: "success", message: isVideo ? "Video publicado" : "Foto publicada", publication: pubOut(pub), photo: detail(pub) });
  } catch (e) {
    if (stored.length) await getStorage().remove(stored).catch(() => {}); // sin archivos huérfanos
    if (e.status) return err(res, e.status, e.message);
    next(e);
  }
};

// DELETE /api/photos/:id   (dueño o administrador) — sirve para publicaciones con o sin foto
const remove = async (req, res, next) => {
  try {
    if (!validator.isUUID(req.params.id)) return err(res, 400, "ID inválido");
    const p = await prisma.publication.findUnique({ where: { id: req.params.id }, include: { transforms: true } });
    if (!p) return err(res, 404, "Publicación no encontrada");
    if (p.userId !== req.user.id && req.user.role !== "admin") return err(res, 403, "No tienes permiso");

    // reactions no tiene clave foránea (apunta a posts o comentarios): se limpian aquí
    const comments = await prisma.comment.findMany({ where: { publicationId: p.id }, select: { id: true } });
    await prisma.reaction.deleteMany({ where: { targetId: { in: [p.id, ...comments.map((c) => c.id)] } } });
    await prisma.publication.delete({ where: { id: p.id } }); // comentarios, reposts, guardados y transformaciones caen en cascada

    await getStorage().remove([p.fileKey, p.thumbKey, feedKeyOf(p.fileKey), ...p.transforms.map((t) => t.s3Key)]).catch((e) => console.error("Borrado en storage:", e.message));
    await audit.log(req, "photo.delete", { entity: "photo", entityId: p.id });
    res.json({ status: "success", message: "Publicación eliminada" });
  } catch (e) { next(e); }
};

module.exports = { list, get, create, remove };
