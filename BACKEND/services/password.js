/**
 * Contraseñas: hash + sal ÚNICA por usuario (requisito del proyecto).
 *
 * Esquema: bcrypt( HMAC-SHA256(sal, contraseña) )
 *  - La sal (16 bytes aleatorios) se guarda en users.salt; el hash en users.password_hash.
 *  - El HMAC previo convierte cualquier longitud a 44 caracteres: bcrypt solo lee los
 *    primeros 72 bytes, y con "contraseña+sal" la sal podía quedar cortada.
 *  - verify() también acepta el formato anterior (bcrypt(contraseña+sal)) y avisa con
 *    legacy=true para que el controlador lo migre al formato nuevo en el siguiente login.
 */
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const COST = 12;
const prehash = (password, salt) => crypto.createHmac("sha256", salt).update(password).digest("base64");

const newSalt = () => crypto.randomBytes(16).toString("hex");
const hash = (password, salt) => bcrypt.hash(prehash(password, salt), COST);

async function verify(password, user) {
  if (!user || !user.passwordHash) return { ok: false };
  const salt = user.salt || "";
  if (await bcrypt.compare(prehash(password, salt), user.passwordHash)) return { ok: true, legacy: false };
  if (await bcrypt.compare(password + salt, user.passwordHash)) return { ok: true, legacy: true };
  return { ok: false };
}

// Gasta el mismo tiempo que una verificación real (evita revelar si el correo existe)
const DUMMY = bcrypt.hashSync("dummy-password", COST);
async function fakeVerify(password) {
  await bcrypt.compare(password, DUMMY);
  await bcrypt.compare(password, DUMMY);
}

module.exports = { newSalt, hash, verify, fakeVerify };
