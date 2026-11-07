const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");
const prisma = require("../database/prisma");
const { createToken, cookieOptions } = require("../services/jwt");

const str = (v) => (typeof v === "string" ? v.trim() : "");
const NICK = /^[A-Za-z0-9_]{3,20}$/;

// Mismo tiempo de respuesta exista o no el correo
const DUMMY = bcrypt.hashSync("dummy-password", 10);

const err = (res, code, message) => res.status(code).json({ status: "error", message });
const srv = (res, e) => {
  console.error(e);
  return err(res, 500, "Error del servidor");
};

// Formatea el usuario para no enviar la contraseña al frontend
const publicUser = (u) => ({
  _id: u.id, // Mantenemos _id para no romper el frontend actual
  id: u.id,
  name: u.name,
  nick: u.nick,
  image: u.imageKey || null,
  bio: u.bio || "",
});

const clear = (res) => res.clearCookie("token", { ...cookieOptions, maxAge: undefined });

const pruebaUser = (req, res) =>
  res.status(200).send({ status: "success", message: "Prueba user OK", usuario: req.user });

// ---------------------------------------------------------
// REGISTRO
// ---------------------------------------------------------
const register = async (req, res) => {
  try {
    const name = str(req.body.name);
    const nick = str(req.body.nick);
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !nick || !email || !password) return err(res, 400, "Faltan datos por enviar");
    if (name.length > 50) return err(res, 400, "El nombre es demasiado largo");
    if (!NICK.test(nick)) return err(res, 400, "El nick debe tener de 3 a 20 caracteres (letras, números, _)");
    if (!validator.isEmail(email)) return err(res, 400, "El correo no es válido");
    if (password.length < 8 || password.length > 72) return err(res, 400, "La contraseña debe tener entre 8 y 72 caracteres");

    // Verificar si ya existe (por email o nick)
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { nick }] }
    });
    if (exists) return err(res, 400, "El usuario ya existe");

    // Generar salt único y hashear contraseña
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(password + salt, 10);

    const stored = await prisma.user.create({
      data: { name, nick, email, passwordHash, salt }
    });

    return res.status(201).json({
      status: "success",
      message: "Usuario registrado",
      user: { id: stored.id, name: stored.name, nick: stored.nick }
    });
  } catch (e) {
    return srv(res, e);
  }
};

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------
const login = async (req, res) => {
  try {
    const email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) return err(res, 400, "Faltan datos");

    const user = await prisma.user.findUnique({ where: { email } });
    
    // Validar contraseña (usando el salt único guardado)
    let ok = false;
    if (user && user.passwordHash) {
      ok = await bcrypt.compare(password + (user.salt || ""), user.passwordHash);
    } else {
      await bcrypt.compare(password, DUMMY); // Evita timing attacks
    }

    if (!user || !ok) return err(res, 401, "Correo o contraseña incorrectos");

    const token = createToken({ id: user.id, role: user.role });
    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      status: "success",
      message: "Login exitoso",
      user: publicUser(user),
      token,
    });
  } catch (e) {
    return srv(res, e);
  }
};

// ---------------------------------------------------------
// LOGOUT Y SESIÓN
// ---------------------------------------------------------
const logout = (req, res) => {
  clear(res);
  return res.status(200).json({ status: "success", message: "Sesión cerrada" });
};

const me = async (req, res) => {
  try {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u) {
      clear(res);
      return err(res, 401, "La sesión no es válida");
    }
    return res.status(200).json({ status: "success", user: publicUser(u) });
  } catch (e) {
    return srv(res, e);
  }
};

// ---------------------------------------------------------
// PERFILES Y LISTA
// ---------------------------------------------------------
const profile = async (req, res) => {
  try {
    const u = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, nick: true, imageKey: true, bio: true, createdAt: true }
    });
    if (!u) return err(res, 404, "Usuario no encontrado");
    
    // Adaptamos la respuesta para que el frontend no se rompa
    return res.status(200).json({ status: "success", user: { ...u, _id: u.id, image: u.imageKey } });
  } catch (error) {
    return err(res, 400, "ID inválido");
  }
};

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const limit = 5;
    
    const totalDocs = await prisma.user.count();
    const users = await prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, nick: true, imageKey: true, bio: true }
    });

    if (!users.length) return err(res, 404, "No hay usuarios");

    return res.status(200).json({
      status: "success",
      users: users.map(u => ({ ...u, _id: u.id, image: u.imageKey })),
      totalDocs,
      totalPages: Math.ceil(totalDocs / limit),
      currentPage: page,
    });
  } catch (e) {
    return srv(res, e);
  }
};

// ---------------------------------------------------------
// ACTUALIZACIÓN Y CONTRASEÑA
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
      if (!NICK.test(v)) return err(res, 400, "El nick debe tener de 3 a 20 caracteres (letras, números, _)");
      // Verificar que el nuevo nick no esté en uso por otro
      const exists = await prisma.user.findFirst({
        where: { nick: v, id: { not: req.user.id } }
      });
      if (exists) return err(res, 400, "Ese nick ya está en uso");
      set.nick = v;
    }

    const u = await prisma.user.update({
      where: { id: req.user.id },
      data: set
    });

    return res.status(200).json({ 
      status: "success", 
      message: "Perfil actualizado", 
      user: publicUser(u) 
    });
  } catch (e) {
    return srv(res, e);
  }
};

const upload = async (req, res) => {
  try {
    if (!req.file) return err(res, 400, "La petición no incluye imagen");

    // NOTA: Aquí irá la subida a S3 más adelante. Por ahora guardamos el nombre del archivo.
    const filename = req.file.filename;

    const u = await prisma.user.update({
      where: { id: req.user.id },
      data: { imageKey: filename }
    });

    return res.status(200).json({ 
      status: "success", 
      user: publicUser(u), 
      file: filename 
    });
  } catch (e) {
    return srv(res, e);
  }
};

const changePassword = async (req, res) => {
  try {
    const cur = typeof req.body.current === "string" ? req.body.current : "";
    const next = typeof req.body.next === "string" ? req.body.next : "";

    if (next.length < 8 || next.length > 72) return err(res, 400, "La nueva contraseña debe tener entre 8 y 72 caracteres");

    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u || !u.passwordHash) return err(res, 400, "La contraseña actual no es correcta");

    const ok = await bcrypt.compare(cur + (u.salt || ""), u.passwordHash);
    if (!ok) return err(res, 400, "La contraseña actual no es correcta");

    const newHash = await bcrypt.hash(next + (u.salt || ""), 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash }
    });

    // Generar nuevo token (opcional, pero buena práctica)
    const token = createToken({ id: u.id, role: u.role });
    res.cookie("token", token, cookieOptions);

    return res.status(200).json({ status: "success", message: "Contraseña actualizada" });
  } catch (e) {
    return srv(res, e);
  }
};

module.exports = {
  pruebaUser, register, login, logout, me, profile, list, update, upload, changePassword
};