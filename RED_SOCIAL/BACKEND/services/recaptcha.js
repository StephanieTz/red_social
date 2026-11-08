/** Verificación server-side de Google reCAPTCHA v2 (checkbox). */
const cfg = require("../config/env");
const URL_VERIFY = "https://www.google.com/recaptcha/api/siteverify";

async function verify(token, ip) {
  // Sin clave secreta: en desarrollo se omite; en producción se rechaza.
  if (!cfg.recaptcha.secret) return !cfg.isProd;
  if (!token || typeof token !== "string") return false;
  try {
    const body = new URLSearchParams({ secret: cfg.recaptcha.secret, response: token });
    if (ip) body.set("remoteip", ip);
    const r = await fetch(URL_VERIFY, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    return data.success === true;
  } catch (e) {
    console.error("reCAPTCHA:", e.message);
    return false;
  }
}

module.exports = { verify };
