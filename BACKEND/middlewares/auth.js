const { verifyToken } = require("../services/jwt");

const readCookie = (req, name) => {
  const m = (req.headers.cookie || "").split(";").map((c) => c.trim()).find((c) => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
};

// El token viaja en una cookie httpOnly (navegador). El header Authorization se acepta para Postman/curl.
const ensureAuth = (req, res, next) => {
  let token = readCookie(req, "token");
  if (!token && req.headers.authorization) token = req.headers.authorization.replace(/['"]+/g, "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ status: "error", message: "No has iniciado sesión" });
  try { req.user = verifyToken(token); next(); }
  catch { return res.status(401).json({ status: "error", message: "La sesión no es válida o ha expirado" }); }
};

const ensureAdmin = (req, res, next) =>
  req.user?.role === "admin" ? next() : res.status(403).json({ status: "error", message: "Solo administradores" });

module.exports = { ensureAuth, ensureAdmin, readCookie };
