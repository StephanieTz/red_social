const validator = require("validator");
const crypto = require("crypto");
const prisma = require("../database/prisma");
const { createToken, cookieOptions } = require("../services/jwt");
const password = require("../services/password");
const recaptcha = require("../services/recaptcha");
const google = require("../services/google");
const audit = require("../services/audit");
const images = require("../services/images");
const { getStorage } = require("../services/storage");
const { userOut } = require("../services/serialize");

const str = (v) => (typeof v === "string" ? v.trim() : "");
const NICK = /^[A-Za-z0-9_.]{3,20}$/;
const err = (res, code, message) => res.status(code).json({ status: "error", message });
const srv = (res, e) => { console.error(e); return err(res, 500, "Error del servidor"); };

// Datos que se envían al frontend (nunca hash, salt ni correo de otros usuarios)
const publicUser = (u) => ({
  _id: u.id, id: u.id, name: u.name, nick: u.nick, bio: u.bio || "", role: u.role,
  image: u.imageKey || null,
  imageUrl: u.imageKey ? `/media/${u.imageKey}` : null,
});

const clear = (res) => res.clearCookie("token", { ...cookieOptions, maxAge: undefined });
const startSession = (res, user) => res.cookie("token", createToken(user), cookieOptions);

// ---------------------------------------------------------
// REGISTRO (con reCAPTCHA) — inicia sesión automáticamente
// ---------------------------------------------------------
const register = async (req, res) => {
  try {
    const name = str(req.body.name);
    const nick = str(req.body.nick);
    const email = str(req.body.email).toLowerCase();
    const pass = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !nick || !email || !pass) return err(res, 400, "Faltan datos por enviar");
    if (name.length > 50) return err(res, 400, "El nombre es demasiado largo");
    if (!NICK.test(nick)) return err(res, 400, "El nick debe tener de 3 a 20 caracteres (letras, números, _ o .)");
    if (!validator.isEmail(email)) return err(res, 400, "El correo no es válido");
    if (pass.length < 8 || pass.length > 128) return err(res, 400, "La contraseña debe tener entre 8 y 128 caracteres");
    if (!(await recaptcha.verify(req.body.captcha, req.ip))) return err(res, 400, "No se pudo verificar el reCAPTCHA");

    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { nick }] } });
    if (exists) return err(res, 400, "El usuario ya existe");

    const salt = password.newSalt();
    const user = await prisma.user.create({ data: { name, nick, email, salt, passwordHash: await password.hash(pass, salt) } });

    startSession(res, user);
    await audit.log(req, "user.register", { userId: user.id, entity: "user", entityId: user.id });
    return res.status(201).json({ status: "success", message: "Usuario registrado", user: publicUser(user) });
  } catch (e) { return srv(res, e); }
};

// ---------------------------------------------------------
// LOGIN (con reCAPTCHA)
// ---------------------------------------------------------
const login = async (req, res) => {
  try {
    const email = str(req.body.email).toLowerCase();
    const pass = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !pass) return err(res, 400, "Faltan datos");
    if (!(await recaptcha.verify(req.body.captcha, req.ip))) return err(res, 400, "No se pudo verificar el reCAPTCHA");

    const user = await prisma.user.findUnique({ where: { email } });
    const result = user ? await password.verify(pass, user) : (await password.fakeVerify(pass), { ok: false });

    if (!user || !result.ok) {
      await audit.log(req, "user.login_failed", { userId: user?.id, metadata: { email } });
      return err(res, 401, "Correo o contraseña incorrectos");
    }
    if (result.legacy) { // migra el hash antiguo al esquema nuevo
      const salt = password.newSalt();
      await prisma.user.update({ where: { id: user.id }, data: { salt, passwordHash: await password.hash(pass, salt) } });
    }
    startSession(res, user);
    await audit.log(req, "user.login", { userId: user.id, entity: "user", entityId: user.id });
    return res.status(200).json({ status: "success", message: "Login exitoso", user: publicUser(user) });
  } catch (e) { return srv(res, e); }
};

// ---------------------------------------------------------
// LOGIN CON GOOGLE
// ---------------------------------------------------------
const uniqueNick = async (seed) => {
  const base = (seed.replace(/[^A-Za-z0-9_.]/g, "").slice(0, 14) || "user").padEnd(3, "0");
  for (let i = 0; i < 6; i++) {
    const nick = i === 0 ? base : base + crypto.randomInt(1000, 9999);
    if (!(await prisma.user.findUnique({ where: { nick } }))) return nick;
  }
  return base + crypto.randomBytes(3).toString("hex");
};

const googleLogin = async (req, res) => {
  try {
    const g = await google.verifyIdToken(req.body.credential);
    if (!g.emailVerified) return err(res, 403, "La cuenta de Google no tiene el correo verificado");

    let user = await prisma.user.findFirst({ where: { OR: [{ googleId: g.sub }, { email: g.email }] } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: g.name.slice(0, 50), nick: await uniqueNick(g.email.split("@")[0]), email: g.email, googleId: g.sub, emailVerified: true },
      });
      await audit.log(req, "user.register_google", { userId: user.id, entity: "user", entityId: user.id });
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: g.sub, emailVerified: true } });
    }
    startSession(res, user);
    await audit.log(req, "user.login_google", { userId: user.id, entity: "user", entityId: user.id });
    return res.status(200).json({ status: "success", message: "Login exitoso", user: publicUser(user) });
  } catch (e) {
    if (e.status) return err(res, e.status, e.message);
    return srv(res, e);
  }
};

const logout = async (req, res) => {
  clear(res);
  return res.status(200).json({ status: "success", message: "Sesión cerrada" });
};

const me = async (req, res) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u) { clear(res); return err(res, 401, "La sesión no es válida"); }
    return res.status(200).json({ status: "success", user: publicUser(u) });
  } catch (e) { return srv(res, e); }
};

// ---------------------------------------------------------
// PERFILES Y LISTA
// ---------------------------------------------------------
const profile = async (req, res) => {
  try {
    if (!validator.isUUID(req.params.id)) return err(res, 400, "ID inválido");
    const u = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, nick: true, imageKey: true, bio: true, createdAt: true } });
    if (!u) return err(res, 404, "Usuario no encontrado");
    return res.status(200).json({ status: "success", user: { ...userOut(u), createdAt: u.createdAt } });
  } catch (e) { return srv(res, e); }
};

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const limit = 5;
    const [totalDocs, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, select: { id: true, name: true, nick: true, imageKey: true, bio: true } }),
    ]);
    if (!users.length) return err(res, 404, "No hay usuarios");
    return res.status(200).json({
      status: "success",
      users: users.map(userOut),
      totalDocs, totalPages: Math.ceil(totalDocs / limit), currentPage: page,
    });
  } catch (e) { return srv(res, e); }
};

// ---------------------------------------------------------
// ACTUALIZACIÓN, FOTO DE PERFIL Y CONTRASEÑA
// ---------------------------------------------------------
const update = async (req, res) => {
  try {
    const b = req.body;
    const set = {};
    if (b.name !== undefined) {
      const v = str(b.name);
      if (!v || v.length > 50) return err(res, 400, "Nombre inválido (1 a 50 caracteres)");
      set.name = v;
    }
    if (b.bio !== undefined) {
      const v = str(b.bio);
      if (v.length > 160) return err(res, 400, "La biografía admite máximo 160 caracteres");
      set.bio = v;
    }
    if (b.nick !== undefined) {
      const v = str(b.nick);
      if (!NICK.test(v)) return err(res, 400, "El nick debe tener de 3 a 20 caracteres (letras, números, _ o .)");
      if (await prisma.user.findFirst({ where: { nick: v, id: { not: req.user.id } } })) return err(res, 400, "Ese nick ya está en uso");
      set.nick = v;
    }
    const u = await prisma.user.update({ where: { id: req.user.id }, data: set });
    await audit.log(req, "user.update", { entity: "user", entityId: u.id, metadata: { fields: Object.keys(set) } });
    return res.status(200).json({ status: "success", message: "Perfil actualizado", user: publicUser(u) });
  } catch (e) { return srv(res, e); }
};

const upload = async (req, res) => {
  try {
    if (!req.file) return err(res, 400, "La petición no incluye imagen");
    const storage = getStorage();
    const key = `avatars/${req.user.id}/${Date.now()}.jpg`;
    await storage.put(key, await images.processAvatar(req.file.buffer), "image/jpeg");

    const old = await prisma.user.findUnique({ where: { id: req.user.id }, select: { imageKey: true } });
    const u = await prisma.user.update({ where: { id: req.user.id }, data: { imageKey: key } });
    if (old?.imageKey?.startsWith("avatars/")) storage.remove([old.imageKey]).catch(() => {});
    await audit.log(req, "user.avatar", { entity: "user", entityId: u.id });
    return res.status(200).json({ status: "success", user: publicUser(u) });
  } catch (e) {
    if (e.status) return err(res, e.status, e.message);
    return srv(res, e);
  }
};

const changePassword = async (req, res) => {
  try {
    const cur = typeof req.body.current === "string" ? req.body.current : "";
    const next = typeof req.body.next === "string" ? req.body.next : "";
    if (next.length < 8 || next.length > 128) return err(res, 400, "La nueva contraseña debe tener entre 8 y 128 caracteres");

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u || !u.passwordHash || !(await password.verify(cur, u)).ok) return err(res, 400, "La contraseña actual no es correcta");

    const salt = password.newSalt();
    await prisma.user.update({ where: { id: u.id }, data: { salt, passwordHash: await password.hash(next, salt) } });
    startSession(res, u);
    await audit.log(req, "user.password_change", { entity: "user", entityId: u.id });
    return res.status(200).json({ status: "success", message: "Contraseña actualizada" });
  } catch (e) { return srv(res, e); }
};

module.exports = { register, login, googleLogin, logout, me, profile, list, update, upload, changePassword };
