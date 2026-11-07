/**
 * Procesamiento de imágenes con sharp.
 *
 * Por cada foto subida se generan automáticamente:
 *   - THUMB       miniatura 400×400 (recorte inteligente) para la cuadrícula de inicio
 *   - GRAYSCALE   blanco y negro
 *   - SEPIA       sepia
 *   - UPSCALE     ampliación 2× (máx. 4000 px de ancho) con interpolación Lanczos
 * El original se conserva tal como fue subido (resolución completa).
 */
const sharp = require("sharp");

const FORMATS = {
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  png: { ext: "png", mime: "image/png" },
  webp: { ext: "webp", mime: "image/webp" },
};
const SEPIA = [[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]];
const THUMB_SIZE = 400;
const MAX_UPSCALE_WIDTH = 4000;
const LIMIT_PIXELS = 60e6; // protege la memoria del servidor contra "bombas" de píxeles

const open = (input) => sharp(input, { limitInputPixels: LIMIT_PIXELS });
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

/** Valida el formato REAL de la imagen (no confía en el mimetype que declara el cliente). */
async function inspect(buffer) {
  let meta;
  try { meta = await open(buffer).metadata(); } catch { throw badRequest("El archivo no es una imagen válida"); }
  const fmt = FORMATS[meta.format];
  if (!fmt) throw badRequest("Formato no permitido (usa JPG, PNG o WEBP)");
  return fmt;
}

const asJpeg = (pipeline, quality) => pipeline.jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
const out = ({ data, info }) => ({ buffer: data, width: info.width, height: info.height, size: info.size });

async function processImage(buffer) {
  const fmt = await inspect(buffer);

  // Base: orientada según EXIF y sin transparencia; de aquí salen todas las variantes.
  const { data: base, info } = await open(buffer).rotate().flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true });

  const [thumb, gray, sepia, up, analysisBuffer] = await Promise.all([
    asJpeg(sharp(base).resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: sharp.strategy.attention }), 78),
    asJpeg(sharp(base).grayscale(), 85),
    asJpeg(sharp(base).recomb(SEPIA), 85),
    asJpeg(sharp(base).resize({ width: Math.min(info.width * 2, MAX_UPSCALE_WIDTH), kernel: "lanczos3" }).sharpen({ sigma: 0.8 }), 85),
    sharp(base).resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(), // para Rekognition (<5 MB)
  ]);

  return {
    original: { ...fmt, width: info.width, height: info.height, size: buffer.length },
    thumb: out(thumb),
    transforms: [
      { type: "GRAYSCALE", ...out(gray) },
      { type: "SEPIA", ...out(sepia) },
      { type: "UPSCALE", ...out(up) },
    ],
    analysisBuffer,
  };
}

/** Foto de perfil: cuadrada 256×256. */
async function processAvatar(buffer) {
  await inspect(buffer);
  return open(buffer).rotate().flatten({ background: "#ffffff" }).resize(256, 256, { fit: "cover", position: sharp.strategy.attention }).jpeg({ quality: 82 }).toBuffer();
}

module.exports = { processImage, processAvatar, inspect, FORMATS };
