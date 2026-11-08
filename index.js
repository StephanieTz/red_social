// index.js — punto de entrada del servidor (Express 5)
const fs = require("fs");
const path = require("path");
const cfg = require("./BACKEND/config/env"); // carga .env
const express = require("express");
const cors = require("cors");

require("./BACKEND/services/jwt"); // valida JWT_SECRET al arrancar
const connection = require("./BACKEND/database/connection");
const { headers, apiLimiter, sameOrigin, allowed } = require("./BACKEND/middlewares/security");

const app = express();
if (cfg.trustProxy) app.set("trust proxy", cfg.trustProxy);

app.use(headers);
app.use(cors({ origin: allowed.length ? allowed : false, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Imágenes (privadas, solo autenticados)
app.use("/media", require("./BACKEND/routes/media"));

// API
app.use("/api", apiLimiter, sameOrigin);
app.use("/api/config", require("./BACKEND/routes/config"));
app.use("/api/user", require("./BACKEND/routes/user"));
app.use("/api/photos", require("./BACKEND/routes/photos"));
app.use("/api/publications", require("./BACKEND/routes/publications"));
app.use("/api/follow", require("./BACKEND/routes/follow"));
app.use("/api/social", require("./BACKEND/routes/social"));
app.use("/api/audit", require("./BACKEND/routes/audit"));
app.use("/api", (req, res) => res.status(404).json({ status: "error", message: "Ruta no encontrada" }));

// Frontend React compilado (FRONTEND/dist) + fallback para la SPA
const DIST = path.join(__dirname, "FRONTEND", "dist");
app.use(express.static(DIST));
app.get(/^\/(?!api\/|media\/).*/, (req, res) => {
  const index = path.join(DIST, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(503).send("Frontend sin compilar. Ejecuta: npm run build:front");
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const code = err.name === "MulterError" ? 400 : err.status || 500;
  const message = err.code === "LIMIT_FILE_SIZE" ? `La imagen supera el máximo de ${cfg.maxUploadMb} MB` : code < 500 ? err.message : "Error interno";
  if (code >= 500) console.error(err);
  res.status(code).json({ status: "error", message });
});

if (cfg.isProd && !cfg.recaptcha.secret) console.warn("⚠️  RECAPTCHA_SECRET no definido: en producción registro y login serán rechazados.");
if (!cfg.google.clientId) console.warn("⚠️  GOOGLE_CLIENT_ID no definido: el botón de Google Login estará oculto.");
console.log(`📦 Almacenamiento: ${cfg.storage.driver}${cfg.storage.driver === "s3" ? ` (bucket ${cfg.storage.bucket})` : ` (${cfg.storage.localDir})`} · Rekognition: ${cfg.rekognition ? "sí" : "no"}`);

if (require.main === module) {
  connection().then(() => app.listen(cfg.port, () => console.log(`✅ Servidor ejecutándose en http://localhost:${cfg.port}`)));
}

module.exports = app;
