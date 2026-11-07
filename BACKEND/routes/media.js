/**
 * GET /media/<clave>  — entrega las imágenes (miniaturas, originales, transformaciones, avatares).
 * Solo para usuarios autenticados; el bucket de S3 permanece PRIVADO. Como las claves son únicas e
 * inmutables, el navegador las cachea un año (ETag + immutable) y casi no vuelven a pedirse.
 */
const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middlewares/auth");
const { getStorage } = require("../services/storage");

const SAFE = /^(photos|avatars)\/[A-Za-z0-9_\-./]+$/;

router.get("/*key", ensureAuth, async (req, res, next) => {
  const key = [].concat(req.params.key).join("/");
  if (!SAFE.test(key) || key.includes("..")) return res.status(404).end();
  try {
    const f = await getStorage().get(key);
    if (f.etag && req.headers["if-none-match"] === f.etag) { f.stream.destroy?.(); return res.status(304).end(); }
    res.set({ "Content-Type": f.contentType, "Cache-Control": "private, max-age=31536000, immutable" });
    if (f.etag) res.set("ETag", f.etag);
    if (f.contentLength) res.set("Content-Length", String(f.contentLength));
    f.stream.on("error", next);
    f.stream.pipe(res);
  } catch (e) {
    if (e.code === "ENOENT") return res.status(404).end();
    next(e);
  }
});

module.exports = router;
