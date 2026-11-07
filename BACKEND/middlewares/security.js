const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cfg = require("../config/env");

const allowed = cfg.corsOrigins;

// CSP: solo se permite lo estrictamente necesario (Google reCAPTCHA, Google Login y nuestro propio origen).
// Las imágenes se sirven desde /media (mismo origen), por eso no hace falta abrir el dominio de S3.
const G = "https://accounts.google.com/gsi/";
const RC = ["https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"];
const headers = helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // necesario para el popup de Google
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'", "https://accounts.google.com/gsi/client", ...RC],
      styleSrc: ["'self'", "'unsafe-inline'", G + "style", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://www.gstatic.com"],
      connectSrc: ["'self'", G],
      frameSrc: [G, "https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: cfg.https ? [] : null,
    },
  },
});

const limiter = (limit, message) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { status: "error", message } });
const authLimiter = limiter(20, "Demasiados intentos. Inténtalo de nuevo en unos minutos.");
const uploadLimiter = limiter(60, "Demasiadas subidas seguidas. Espera unos minutos.");
const apiLimiter = limiter(1500, "Demasiadas peticiones. Espera un momento.");

// Anti-CSRF: las peticiones que modifican datos deben venir de nuestro propio origen
const sameOrigin = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const o = req.headers.origin;
  if (!o) return next(); // Postman / curl no envían Origin
  try { if (new URL(o).host === req.headers.host || allowed.includes(o)) return next(); } catch { /* origen mal formado */ }
  return res.status(403).json({ status: "error", message: "Origen no permitido" });
};

module.exports = { headers, authLimiter, uploadLimiter, apiLimiter, sameOrigin, allowed };
