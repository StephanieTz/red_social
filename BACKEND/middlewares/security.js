const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const isProd = process.env.NODE_ENV === "production";
const allowed = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);

const headers = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"], imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null
    }
  }
});

const limiter = (limit, message) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { status: "error", message } });
const authLimiter = limiter(20, "Demasiados intentos. Inténtalo de nuevo en unos minutos.");
const apiLimiter = limiter(1500, "Demasiadas peticiones. Espera un momento.");

// Anti-CSRF: las peticiones que modifican datos deben venir de nuestro propio origen
const sameOrigin = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const o = req.headers.origin;
  if (!o) return next(); // Postman / curl no envían Origin
  try { if (new URL(o).host === req.headers.host || allowed.includes(o)) return next(); } catch {}
  return res.status(403).json({ status: "error", message: "Origen no permitido" });
};

module.exports = { headers, authLimiter, apiLimiter, sameOrigin, allowed, isProd };
