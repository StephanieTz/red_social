const bcrypt = require("bcryptjs");
const validator = require("validator");
const User = require("../models/user");
const { createToken, cookieOptions } = require("../services/jwt");

const str = v => (typeof v === "string" ? v.trim() : "");
const rx = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact = s => new RegExp(`^${rx(s)}$`, "i");
const NICK = /^[A-Za-z0-9_.]{3,20}$/;
const DUMMY = bcrypt.hashSync("dummy-password", 10); // mismo tiempo de respuesta exista o no el correo
const err = (res, code, message) => res.status(code).json({ status: "error", message });
const srv = (res, e) => { console.error(e); return err(res, 500, "Error del servidor"); };
const publicUser = u => ({ _id: u._id, name: u.name, nick: u.nick, image: u.image || null, bio: u.bio || "" });
const clear = res => res.clearCookie("token", { ...cookieOptions, maxAge: undefined });

const pruebaUser = (req, res) => res.status(200).send({ status: "success", message: "Prueba user OK", usuario: req.user });

const register = async (req, res) => {
  try {
    const name = str(req.body.name), nick = str(req.body.nick), email = str(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!name || !nick || !email || !password) return err(res, 400, "Faltan datos por enviar");
    if (name.length > 50) return err(res, 400, "El nombre es demasiado largo");
    if (!NICK.test(nick)) return err(res, 400, "El nick debe tener de 3 a 20 caracteres (letras, números, _ o .)");
    if (!validator.isEmail(email)) return err(res, 400, "El correo no es válido");
    if (password.length < 8 || password.length > 72) return err(res, 400, "La contraseña debe tener entre 8 y 72 caracteres");
    if (await User.findOne({ $or: [{ email }, { nick: exact(nick) }] })) return err(res, 400, "El usuario ya existe");
    const stored = await new User({ name, nick, email, password: await bcrypt.hash(password, 10) }).save();
    return res.status(201).json({ status: "success", message: "Usuario registrado", user: { id: stored._id, name: stored.name, nick: stored.nick } });
  } catch (e) { return srv(res, e); }
};

const login = async (req, res) => {
  try {
    const email = str(req.body.email).toLowerCase(), password = typeof req.body.password === "string" ? req.body.password : "";
    if (!email || !password) return err(res, 400, "Faltan datos");
    const user = await User.findOne({ email }).select("name nick image bio password");
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY);
    if (!user || !ok) return err(res, 401, "Correo o contraseña incorrectos"); // mismo mensaje en ambos casos
    const token = createToken(user);
    res.cookie("token", token, cookieOptions); // cookie httpOnly: el JavaScript del navegador no puede leerla
    return res.status(200).json({ status: "success", message: "Login exitoso", user: publicUser(user), token });
  } catch (e) { return srv(res, e); }
};

const logout = (req, res) => { clear(res); return res.status(200).json({ status: "success", message: "Sesión cerrada" }); };

const me = async (req, res) => {
  try {
    const u = await User.findById(req.user.id).select("name nick image bio");
    if (!u) { clear(res); return err(res, 401, "La sesión no es válida"); }
    return res.status(200).json({ status: "success", user: publicUser(u) });
  } catch (e) { return srv(res, e); }
};

const profile = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select("-password -email");
    if (!u) return err(res, 404, "Usuario no encontrado");
    return res.status(200).json({ status: "success", user: u });
  } catch { return err(res, 400, "ID inválido"); }
};

const list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.params.page) || 1, 1);
    const users = await User.paginate({}, { page, limit: 5, sort: { _id: -1 }, select: "-password -email" });
    if (!users.docs.length) return err(res, 404, "No hay usuarios");
    return res.status(200).json({ status: "success", users: users.docs, totalDocs: users.totalDocs, totalPages: users.totalPages, currentPage: users.page });
  } catch (e) { return srv(res, e); }
};

// Lista blanca: solo name, nick y bio. Nada más se puede modificar desde aquí.
const update = async (req, res) => {
  try {
    const b = req.body, set = {};
    if (b.name !== undefined) { const v = str(b.name); if (!v || v.length > 50) return err(res, 400, "Nombre inválido (1 a 50 caracteres)"); set.name = v; }
    if (b.bio !== undefined) { const v = str(b.bio); if (v.length > 160) return err(res, 400, "La biografía admite máximo 160 caracteres"); set.bio = v; }
    if (b.nick !== undefined) {
      const v = str(b.nick), cur = await User.findById(req.user.id).select("nick");
      if (v !== cur.nick) {
        if (!NICK.test(v)) return err(res, 400, "El nick debe tener de 3 a 20 caracteres (letras, números, _ o .)");
        if (await User.findOne({ _id: { $ne: req.user.id }, nick: exact(v) })) return err(res, 400, "Ese nick ya está en uso");
        set.nick = v;
      }
    }
    const u = await User.findByIdAndUpdate(req.user.id, set, { new: true, runValidators: true }).select("name nick image bio");
    return res.status(200).json({ status: "success", message: "Perfil actualizado", user: publicUser(u) });
  } catch (e) { return srv(res, e); }
};

const upload = async (req, res) => {
  try {
    if (!req.file) return err(res, 400, "La petición no incluye imagen");
    const u = await User.findByIdAndUpdate(req.user.id, { image: req.file.filename }, { new: true }).select("name nick image bio");
    return res.status(200).json({ status: "success", user: publicUser(u), file: req.file.filename });
  } catch (e) { return srv(res, e); }
};

const changePassword = async (req, res) => {
  try {
    const cur = typeof req.body.current === "string" ? req.body.current : "", next = typeof req.body.next === "string" ? req.body.next : "";
    if (next.length < 8 || next.length > 72) return err(res, 400, "La nueva contraseña debe tener entre 8 y 72 caracteres");
    const u = await User.findById(req.user.id).select("password");
    if (!u || !(await bcrypt.compare(cur, u.password))) return err(res, 400, "La contraseña actual no es correcta");
    u.password = await bcrypt.hash(next, 10); await u.save();
    res.cookie("token", createToken(u), cookieOptions);
    return res.status(200).json({ status: "success", message: "Contraseña actualizada" });
  } catch (e) { return srv(res, e); }
};

module.exports = { pruebaUser, register, login, logout, me, profile, list, update, upload, changePassword };
