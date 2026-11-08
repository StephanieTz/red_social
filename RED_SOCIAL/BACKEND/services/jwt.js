const jwt = require("jsonwebtoken");
const cfg = require("../config/env");

if (!cfg.jwtSecret || cfg.jwtSecret.length < 32) {
  console.error("✗ JWT_SECRET no definido o demasiado corto (mínimo 32 caracteres). Revisa tu archivo .env");
  process.exit(1);
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: cfg.https,
  maxAge: cfg.jwtDays * 864e5,
  path: "/",
};

const createToken = (user) =>
  jwt.sign({ id: user.id, role: user.role || "user" }, cfg.jwtSecret, { expiresIn: `${cfg.jwtDays}d`, algorithm: "HS256" });

const verifyToken = (token) => jwt.verify(token, cfg.jwtSecret, { algorithms: ["HS256"] });

module.exports = { createToken, verifyToken, cookieOptions };
