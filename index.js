require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./BACKEND/services/jwt"); // valida JWT_SECRET antes de arrancar
const connection = require("./BACKEND/database/connection");
const { headers, apiLimiter, sameOrigin, allowed } = require("./BACKEND/middlewares/security");
const UserRoutes = require("./BACKEND/routes/user");
const FollowRoutes = require("./BACKEND/routes/follow");
const PublicationRoutes = require("./BACKEND/routes/publication");
const SocialRoutes = require("./BACKEND/routes/social");

connection();

const app = express();
const puerto = process.env.PORT || 4000;

app.use(headers);
app.use(cors({ origin: allowed.length ? allowed : false, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "FRONTEND")));

app.use("/api", apiLimiter, sameOrigin);
app.use("/api/user", UserRoutes);
app.use("/api/follow", FollowRoutes);
app.use("/api/publication", PublicationRoutes);
app.use("/api/social", SocialRoutes);
app.use("/api", (req, res) => res.status(404).json({ status: "error", message: "Ruta no encontrada" }));

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "FRONTEND", "index.html")));

// Errores en JSON (multer: archivo muy grande o tipo no permitido, JSON mal formado, etc.)
app.use((err, req, res, next) => {
  const code = err.name === "MulterError" ? 400 : err.status || 500;
  const message = err.code === "LIMIT_FILE_SIZE" ? "El archivo es demasiado grande" : code < 500 ? err.message : "Error interno";
  if (code >= 500) console.error(err);
  res.status(code).json({ status: "error", message });
});

app.listen(puerto, () => console.log(`✅ Servidor ejecutándose en http://localhost:${puerto}`));
