/** Validación de videos por su firma (no se confía en el tipo que declara el cliente). Admite MP4 y WEBM. */
const badRequest = (m) => Object.assign(new Error(m), { status: 400 });

function inspectVideo(buf) {
  if (buf.length > 12) {
    if (buf.toString("latin1", 4, 8) === "ftyp") return { ext: "mp4", mime: "video/mp4" };
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: "webm", mime: "video/webm" };
  }
  throw badRequest("El archivo no es un video MP4 o WEBM válido");
}

module.exports = { inspectVideo };
