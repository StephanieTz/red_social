/** Subida de archivos con multer EN MEMORIA: el buffer se procesa con sharp y se envía a S3; nada queda en disco. */
const multer = require("multer");
const cfg = require("../config/env");

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const make = (mb) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    TYPES.includes(file.mimetype) ? cb(null, true) : cb(Object.assign(new Error("Solo se permiten imágenes JPG, PNG o WEBP"), { status: 400 })),
});

module.exports = { photo: make(cfg.maxUploadMb), avatar: make(3) };
