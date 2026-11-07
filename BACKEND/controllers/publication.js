const fs = require("fs");
const path = require("path");
const prisma = require("../database/prisma");

const err = (res, code, message) => res.status(code).json({ status: "error", message });
const srv = (res, e) => { console.error(e); return err(res, 500, "Error del servidor"); };
const AUTHOR = { select: { id: true, name: true, nick: true, imageKey: true } };

// Helper para no romper el frontend actual (que espera "_id" e "image")
const formatPub = (p) => ({
  ...p,
  _id: p.id,
  file: p.fileKey, // El frontend actual espera "file"
  user: p.user ? { ...p.user, _id: p.user.id, image: p.user.imageKey } : p.user
});

const pruebaPublication = (req, res) => res.status(200).send({ message: "Prueba publication OK" });

const create = async (req, res) => {
  try {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    
    if (!text && !req.file) return err(res, 400, "Debes enviar texto o una imagen");
    if (text.length > 500) return err(res, 400, "El texto admite máximo 500 caracteres");

    // NOTA: Aquí luego pondremos la subida a S3.
    const fileKey = req.file ? req.file.filename : null;

    const stored = await prisma.publication.create({
      data: {
        userId: req.user.id,
        text,
        fileKey,
        fileType: req.file ? req.file.mimetype : null,
      },
      include: { user: AUTHOR }
    });

    return res.status(201).json({ 
      status: "success", 
      message: "Publicación creada", 
      publication: formatPub(stored) 
    });
  } catch (e) {
    return srv(res, e);
  }
};

const feed = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const limit = 10;
    const skip = (page - 1) * limit;

    // En Prisma, para mezclar publicaciones y reposts, los traemos por separado
    const [pubs, reposts, totalPubs, totalReposts] = await Promise.all([
      prisma.publication.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: { user: AUTHOR }
      }),
      prisma.repost.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          user: AUTHOR,
          publication: { include: { user: AUTHOR } }
        }
      }),
      prisma.publication.count(),
      prisma.repost.count()
    ]);

    // Mezclamos y ordenamos por fecha
    const all = [
      ...pubs.map(p => ({ type: "post", at: p.createdAt, publication: formatPub(p) })),
      ...reposts.filter(r => r.publication).map(r => ({
        type: "repost",
        at: r.createdAt,
        by: { _id: r.user.id, name: r.user.name, nick: r.user.nick, image: r.user.imageKey },
        publication: formatPub(r.publication)
      }))
    ].sort((a, b) => b.at - a.at).slice(0, limit);

    return res.status(200).json({
      status: "success",
      items: all,
      totalDocs: totalPubs + totalReposts,
      totalPages: Math.ceil((totalPubs + totalReposts) / limit)
    });
  } catch (e) {
    return srv(res, e);
  }
};

const profilePublications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const limit = 5;
    const userId = req.params.id;

    const [pubs, totalDocs] = await Promise.all([
      prisma.publication.findMany({
        where: { userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: AUTHOR }
      }),
      prisma.publication.count({ where: { userId } })
    ]);

    return res.status(200).json({ 
      status: "success", 
      publications: pubs.map(formatPub), 
      totalDocs 
    });
  } catch (e) {
    return err(res, 400, "ID inválido");
  }
};

const remove = async (req, res) => {
  try {
    const pubId = req.params.id;
    
    const pub = await prisma.publication.findUnique({ where: { id: pubId } });
    if (!pub) return err(res, 404, "Publicación no encontrada");
    if (pub.userId !== req.user.id) return err(res, 403, "No tienes permiso");

    // Prisma se encarga de borrar comentarios y reacciones en cascada gracias al schema
    await prisma.publication.delete({ where: { id: pubId } });

    // Borrar archivo local si existe (luego será borrar de S3)
    if (pub.fileKey) {
      fs.unlink(path.join(__dirname, "../../uploads", path.basename(pub.fileKey)), () => {});
    }

    return res.status(200).json({ status: "success", message: "Publicación eliminada" });
  } catch (e) {
    return err(res, 400, "ID inválido");
  }
};

module.exports = { pruebaPublication, create, feed, profilePublications, remove };