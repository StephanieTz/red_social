/**
 * GET /media/<clave>  — entrega las imágenes y videos (miniaturas, originales, transformaciones, avatares, banners).
 * Solo para usuarios autenticados; el bucket de S3 permanece PRIVADO. Las claves son únicas e inmutables, así que
 * el navegador las cachea un año (ETag + immutable). Soporta "Range" para que los videos se reproduzcan y se puedan adelantar.
 */
const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middlewares/auth");
const { getStorage } = require("../services/storage");

const SAFE = /^(photos|avatars|banners)\/[A-Za-z0-9_\-./]+$/;

// "bytes=a-b" o "bytes=a-". Los rangos de sufijo ("bytes=-N") se ignoran: se responde el archivo completo, lo que HTTP permite.
function parseRange(h) {
  const m = /^bytes=(\d+)-(\d*)$/.exec(h || "");
  return m ? { start: Number(m[1]), end: m[2] === "" ? undefined : Number(m[2]) } : null;
}

router.get("/*key", ensureAuth, async (req, res, next) => {
  const key = [].concat(req.params.key).join("/");
  if (!SAFE.test(key) || key.includes("..")) return res.status(404).end();
  try {
    const range = parseRange(req.headers.range);
    const f = await getStorage().get(key, range || undefined);
    if (!range && f.etag && req.headers["if-none-match"] === f.etag) { f.stream.destroy?.(); return res.status(304).end(); }

    res.set({ "Content-Type": f.contentType, "Cache-Control": "private, max-age=31536000, immutable", "Accept-Ranges": "bytes" });
    if (f.etag) res.set("ETag", f.etag);
    if (f.range) {
      res.status(206).set("Content-Range", `bytes ${f.range.start}-${f.range.end}/${f.totalLength ?? "*"}`);
    }
    if (f.contentLength != null) res.set("Content-Length", String(f.contentLength));
    f.stream.on("error", next);
    f.stream.pipe(res);
  } catch (e) {
    if (e.code === "ENOENT") return res.status(404).end();
    if (e.code === "RANGE") return res.status(416).end();
    next(e);
  }
});

module.exports = router;
