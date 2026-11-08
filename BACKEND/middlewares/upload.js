/** Subida de archivos con multer EN MEMORIA: el buffer se procesa y se envía a S3; nada queda en disco. */
const multer = require("multer");
const cfg = require("../config/env");

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
const VIDEOS = ["video/mp4", "video/webm"];
const reject = (cb, msg) => cb(Object.assign(new Error(msg), { status: 400 }));

const single = (mb) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => (IMAGES.includes(file.mimetype) ? cb(null, true) : reject(cb, "Solo se permiten imágenes JPG, PNG o WEBP")),
});

// Publicaciones: "file" (foto o video corto) y, para videos, "poster" (fotograma de portada generado por el navegador)
const media = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: cfg.maxVideoMb * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === "poster" ? IMAGES.includes(file.mimetype) : file.fieldname === "file" && [...IMAGES, ...VIDEOS].includes(file.mimetype);
    return ok ? cb(null, true) : reject(cb, "Formato no permitido (fotos JPG/PNG/WEBP o videos MP4/WEBM)");
  },
}).fields([{ name: "file", maxCount: 1 }, { name: "poster", maxCount: 1 }]);

module.exports = { media, avatar: single(3), banner: single(5) };
