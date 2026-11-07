/**
 * Almacenamiento de imágenes (NUNCA en la base de datos; la BD solo guarda la "clave" del objeto).
 *
 * Dos drivers con la misma interfaz:
 *   - s3     → Amazon S3 (producción). Usa el IAM Role de la EC2; no hacen falta claves en el servidor.
 *   - local  → carpeta ./storage (desarrollo sin AWS).
 *
 * Interfaz:  put(key, buffer, contentType) · get(key) → {stream,contentType,contentLength,etag} · remove(keys[])
 * Si un objeto no existe, get() lanza un error con code "ENOENT".
 */
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const cfg = require("../config/env");

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const mimeFromKey = (key) => MIME[String(key).split(".").pop().toLowerCase()] || "application/octet-stream";

function createLocalDriver(dir) {
  const root = path.resolve(dir);
  const full = (key) => {
    const p = path.resolve(root, key);
    if (!p.startsWith(root + path.sep)) throw new Error("Clave de almacenamiento inválida");
    return p;
  };
  return {
    name: "local",
    async put(key, buffer) {
      const p = full(key);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, buffer);
    },
    async get(key) {
      const p = full(key);
      const st = await fs.stat(p); // lanza ENOENT si no existe
      return { stream: fsSync.createReadStream(p), contentLength: st.size, contentType: mimeFromKey(key), etag: `"${st.size}-${Math.round(st.mtimeMs)}"` };
    },
    async remove(keys) {
      await Promise.all(keys.filter(Boolean).map(async (k) => {
        const p = full(k);
        await fs.rm(p, { force: true });
        // limpia las carpetas que quedaron vacías (sin tocar la raíz)
        for (let d = path.dirname(p); d !== root && d.startsWith(root); d = path.dirname(d)) {
          try { await fs.rmdir(d); } catch { break; }
        }
      }));
    },
  };
}

function createS3Driver({ bucket, region }) {
  if (!bucket) throw new Error("AWS_BUCKET_NAME no está definido (STORAGE_DRIVER=s3)");
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
  const client = new S3Client({ region }); // credenciales: IAM Role de la EC2 o variables AWS_* en local
  return {
    name: "s3",
    async put(key, buffer, contentType) {
      await client.send(new PutObjectCommand({
        Bucket: bucket, Key: key, Body: buffer, ContentType: contentType,
        CacheControl: "private, max-age=31536000, immutable", // las claves son únicas e inmutables
        ServerSideEncryption: "AES256",
      }));
    },
    async get(key) {
      try {
        const r = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return { stream: r.Body, contentLength: r.ContentLength, contentType: r.ContentType || mimeFromKey(key), etag: r.ETag };
      } catch (e) {
        if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) throw Object.assign(new Error("No existe"), { code: "ENOENT" });
        throw e;
      }
    },
    async remove(keys) {
      const list = keys.filter(Boolean).map((Key) => ({ Key }));
      for (let i = 0; i < list.length; i += 1000) {
        await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: list.slice(i, i + 1000), Quiet: true } }));
      }
    },
  };
}

let instance;
function getStorage() {
  if (!instance) instance = cfg.storage.driver === "s3" ? createS3Driver(cfg.storage) : createLocalDriver(cfg.storage.localDir);
  return instance;
}

module.exports = { getStorage, createLocalDriver, createS3Driver, mimeFromKey };
