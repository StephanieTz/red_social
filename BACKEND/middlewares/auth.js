const { verifyToken } = require("../services/jwt");

const readCookie = (req, name) => {
  const m = (req.headers.cookie || "").split(";").map(c => c.trim()).find(c => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
};

// El token se lee de la cookie httpOnly (navegador). El header Authorization sigue
// aceptándose para clientes de API como Postman.
const ensureAuth = (req, res, next) => {
  let token = readCookie(req, "token");
  if (!token && req.headers.authorization) token = req.headers.authorization.replace(/['"]+/g, "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ status: "error", message: "No has iniciado sesión" });
  try { req.user = verifyToken(token); next(); }
  catch { return res.status(401).json({ status: "error", message: "La sesión no es válida o ha expirado" }); }
};

module.exports = { ensureAuth, readCookie };
