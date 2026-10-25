const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "video/mp4": ".mp4", "video/webm": ".webm" };
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, "file_" + Date.now() + "-" + Math.round(Math.random() * 1e9) + EXT[file.mimetype])
});
const make = (types, mb, msg) => multer({
  storage, limits: { fileSize: mb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => types.includes(file.mimetype) ? cb(null, true) : cb(Object.assign(new Error(msg), { status: 400 }))
});

// Foto de perfil: solo imágenes (5 MB). upload.media: imágenes o videos (50 MB) para publicaciones.
const upload = make(["image/jpeg", "image/png"], 5, "Solo se permiten imágenes jpg o png");
upload.media = make(Object.keys(EXT), 50, "Solo se permiten imágenes (jpg, png) o videos (mp4, webm)");

module.exports = upload;
