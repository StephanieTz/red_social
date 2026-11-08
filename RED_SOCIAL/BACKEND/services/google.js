/** Validación del ID token de "Iniciar sesión con Google" (Google Identity Services). */
const { OAuth2Client } = require("google-auth-library");
const cfg = require("../config/env");

let client;

async function verifyIdToken(idToken) {
  if (!cfg.google.clientId) throw Object.assign(new Error("Google Login no está configurado"), { status: 503 });
  if (typeof idToken !== "string" || idToken.length < 20) throw Object.assign(new Error("Credencial de Google inválida"), { status: 400 });
  client = client || new OAuth2Client(cfg.google.clientId);
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: cfg.google.clientId });
    const p = ticket.getPayload();
    return {
      sub: p.sub,
      email: String(p.email || "").toLowerCase(),
      emailVerified: p.email_verified === true,
      name: p.name || String(p.email || "usuario").split("@")[0],
    };
  } catch {
    throw Object.assign(new Error("No se pudo validar la cuenta de Google"), { status: 401 });
  }
}

module.exports = { verifyIdToken };
