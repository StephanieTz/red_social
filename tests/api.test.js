/**
 * Prueba de integración de punta a punta: levanta el servidor Express real con almacenamiento local
 * y una base de datos EN MEMORIA (sustituye a Prisma), así corre sin PostgreSQL ni AWS.
 */
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
process.env.JWT_SECRET = "x".repeat(40);
process.env.STORAGE_DRIVER = "local";
process.env.STORAGE_LOCAL_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "rs-api-"));
process.env.NODE_ENV = "test";
delete process.env.RECAPTCHA_SECRET;

const test = require("node:test");
const assert = require("node:assert");
const sharp = require("sharp");

// ---- Prisma falso (solo lo que usan los controladores probados) ----
const db = { users: [], pubs: [], audit: [] };
const pick = (rows, where = {}) => rows.filter((r) => Object.entries(where).every(([k, v]) =>
  k === "OR" ? v.some((w) => pick([r], w).length) : v && typeof v === "object" && "not" in v ? r[k] !== v.not : r[k] === v));
const withRel = (p, inc = {}) => ({ ...p, ...(inc.user ? { user: db.users.find((u) => u.id === p.userId) } : {}) });
const fake = {
  user: {
    findFirst: async ({ where }) => pick(db.users, where)[0] || null,
    findUnique: async ({ where }) => pick(db.users, where)[0] || null,
    create: async ({ data }) => { const u = { id: crypto.randomUUID(), role: "user", bio: "", imageKey: null, googleId: null, ...data }; db.users.push(u); return u; },
    update: async ({ where, data }) => Object.assign(pick(db.users, where)[0], data),
  },
  publication: {
    create: async ({ data, include }) => {
      const { transforms, analysis, ...rest } = data;
      const p = { ...rest, createdAt: new Date(), transforms: transforms.create.map((t) => ({ ...t })), analysis: analysis ? { ...analysis.create } : null };
      db.pubs.push(p); return withRel(p, include);
    },
    findMany: async ({ where, skip = 0, take = 24, include }) => pick(db.pubs, where).slice(skip, skip + take).map((p) => withRel(p, include)),
    count: async ({ where }) => pick(db.pubs, where).length,
    findUnique: async ({ where, include }) => { const p = pick(db.pubs, where)[0]; return p ? withRel(p, include) : null; },
    delete: async ({ where }) => { db.pubs = db.pubs.filter((p) => p.id !== where.id); },
  },
  auditLog: { create: async ({ data }) => { db.audit.push(data); } },
};
const prismaPath = require.resolve("../BACKEND/database/prisma");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fake };

const app = require("../index");
let server, base, cookie = "";
test.before(() => new Promise((ok) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; ok(); }); }));
test.after(() => server.close());

const call = (p, opt = {}) => fetch(base + p, { ...opt, headers: { ...(opt.headers || {}), ...(cookie ? { cookie } : {}) } });
const json = (p, method, body) => call(p, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const png = () => sharp({ create: { width: 900, height: 600, channels: 3, background: { r: 30, g: 120, b: 200 } } }).png().toBuffer();
const upload = async (buf, type = "image/png", extra = {}) => {
  const f = new FormData();
  f.append("text", "mi foto"); for (const [k, v] of Object.entries(extra)) f.append(k, v);
  f.append("file", new Blob([buf], { type }), "foto.png");
  return call("/api/photos", { method: "POST", body: f });
};

let photoId, thumbUrl;

test("config pública y cabeceras de seguridad", async () => {
  const r = await call("/api/config");
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get("content-security-policy"), /accounts\.google\.com/);
  assert.deepStrictEqual(Object.keys(await r.json()).sort(), ["googleClientId", "recaptchaSiteKey"]);
});

test("sin sesión: API y /media responden 401", async () => {
  assert.strictEqual((await call("/api/photos")).status, 401);
  assert.strictEqual((await call("/media/photos/a/b/thumb.jpg")).status, 401);
});

test("registro valida datos, crea sesión (cookie httpOnly) y no expone el token", async () => {
  assert.strictEqual((await json("/api/user/register", "POST", { name: "A", nick: "a", email: "x", password: "1" })).status, 400);
  const r = await json("/api/user/register", "POST", { name: "Ana", nick: "ana_01", email: "ANA@mail.com", password: "ClaveSegura123" });
  assert.strictEqual(r.status, 201);
  const set = r.headers.get("set-cookie");
  assert.match(set, /token=.*HttpOnly/i);
  cookie = set.split(";")[0];
  const body = await r.json();
  assert.ok(!("token" in body) && !JSON.stringify(body).includes("passwordHash"));
  assert.ok(db.users[0].salt && db.users[0].passwordHash && db.users[0].email === "ana@mail.com");
  assert.strictEqual((await json("/api/user/register", "POST", { name: "Ana", nick: "ana_01", email: "otro@mail.com", password: "ClaveSegura123" })).status, 400);
});

test("login correcto e incorrecto", async () => {
  assert.strictEqual((await json("/api/user/login", "POST", { email: "ana@mail.com", password: "mala" })).status, 401);
  assert.strictEqual((await json("/api/user/login", "POST", { email: "ana@mail.com", password: "ClaveSegura123" })).status, 200);
});

test("subir foto: miniatura + 3 transformaciones + análisis de rostros", async () => {
  const faces = JSON.stringify([{ x: 10, y: 20, width: 100, height: 100, score: 0.93 }]);
  const r = await upload(await png(), "image/png", { faces });
  assert.strictEqual(r.status, 201);
  const { photo } = await r.json();
  photoId = photo.id;
  assert.deepStrictEqual(photo.transforms.map((t) => t.type), ["GRAYSCALE", "SEPIA", "UPSCALE"]);
  assert.strictEqual(photo.transforms[2].width, 1800);
  assert.deepStrictEqual([photo.analysis.provider, photo.analysis.faceCount], ["FACEAPI", 1]);
  assert.strictEqual(photo.original.width, 900);
});

test("galería devuelve miniaturas y /media las entrega (con caché inmutable)", async () => {
  const list = await (await call("/api/photos?page=1")).json();
  assert.strictEqual(list.items.length, 1);
  thumbUrl = list.items[0].thumbUrl;
  const img = await call(thumbUrl);
  assert.strictEqual(img.status, 200);
  assert.strictEqual(img.headers.get("content-type"), "image/jpeg");
  assert.match(img.headers.get("cache-control"), /immutable/);
  const meta = await sharp(Buffer.from(await img.arrayBuffer())).metadata();
  assert.deepStrictEqual([meta.width, meta.height], [400, 400]);
  assert.strictEqual((await call("/media/photos/no/existe/thumb.jpg")).status, 404);
  assert.strictEqual((await call("/media/other/secreto.txt")).status, 404);
});

test("detalle trae original + transformaciones", async () => {
  const { photo } = await (await call(`/api/photos/${photoId}`)).json();
  assert.strictEqual(photo.transforms.length, 3);
  for (const u of [photo.original.url, ...photo.transforms.map((t) => t.url)]) assert.strictEqual((await call(u)).status, 200);
  assert.strictEqual((await call("/api/photos/no-es-uuid")).status, 400);
});

test("rechaza archivos falsos (texto con mimetype image/png) y formatos no permitidos", async () => {
  assert.strictEqual((await upload(Buffer.from("no soy una imagen"))).status, 400);
  const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).gif().toBuffer();
  assert.strictEqual((await upload(gif, "image/png")).status, 400);
  assert.strictEqual((await upload(await png(), "application/pdf")).status, 400);
  assert.strictEqual(db.pubs.length, 1, "no deben quedar publicaciones por subidas inválidas");
});

test("borrar elimina BD y archivos; otro usuario no puede borrar", async () => {
  const mine = cookie;
  const r2 = await json("/api/user/register", "POST", { name: "Beto", nick: "beto", email: "beto@mail.com", password: "ClaveSegura123" });
  cookie = r2.headers.get("set-cookie").split(";")[0];
  assert.strictEqual((await call(`/api/photos/${photoId}`, { method: "DELETE" })).status, 403);
  cookie = mine;
  assert.strictEqual((await call(`/api/photos/${photoId}`, { method: "DELETE" })).status, 200);
  assert.strictEqual((await call(`/api/photos/${photoId}`)).status, 404);
  assert.strictEqual((await call(thumbUrl)).status, 404);
  assert.ok(!fs.existsSync(path.join(process.env.STORAGE_LOCAL_DIR, "photos", db.users[0].id, photoId)), "no deben quedar archivos huérfanos");
});

test("auditoría registra las acciones", () => {
  const actions = db.audit.map((a) => a.action);
  for (const a of ["user.register", "user.login", "user.login_failed", "photo.upload", "photo.delete"]) assert.ok(actions.includes(a), a);
});
