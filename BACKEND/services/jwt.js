const jwt = require("jsonwebtoken");
require("dotenv").config();

// Sin valor por defecto: si falta o es débil, el servidor NO arranca.
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error("✗ JWT_SECRET no definido o demasiado corto (mínimo 32 caracteres). Revisa tu archivo .env");
  process.exit(1);
}
const DAYS = Number(process.env.JWT_EXPIRES_DAYS) || 7;
const cookieOptions = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: DAYS * 864e5, path: "/" };

const createToken = (user) => {
  const payload = { id: user._id, role: user.role || "user" };
  return jwt.sign(payload, SECRET, { expiresIn: `${DAYS}d`, algorithm: "HS256" });
};
const verifyToken = (token) => jwt.verify(token, SECRET, { algorithms: ["HS256"] });

module.exports = { createToken, verifyToken, SECRET, cookieOptions };
