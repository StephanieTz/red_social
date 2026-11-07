/**
 * Configuración central. Es el ÚNICO archivo que lee process.env,
 * así todo el backend consulta la configuración desde un solo lugar.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const bool = (v) => String(v || "").toLowerCase() === "true";
const e = process.env;

const config = {
  isProd: e.NODE_ENV === "production",
  port: Number(e.PORT) || 4000,

  // true solo cuando el sitio se sirve por HTTPS (cookie "secure" + upgrade-insecure-requests)
  https: bool(e.HTTPS),
  // número de proxies delante de Node (1 si usas nginx en la misma EC2)
  trustProxy: Number(e.TRUST_PROXY) || 0,
  corsOrigins: (e.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean),

  jwtSecret: e.JWT_SECRET,
  jwtDays: Number(e.JWT_EXPIRES_DAYS) || 7,

  storage: {
    // "s3" (producción) o "local" (desarrollo sin AWS). Por defecto: s3 si hay bucket.
    driver: e.STORAGE_DRIVER || (e.AWS_BUCKET_NAME ? "s3" : "local"),
    bucket: e.AWS_BUCKET_NAME,
    region: e.AWS_REGION || "us-east-1",
    localDir: path.resolve(e.STORAGE_LOCAL_DIR || path.join(__dirname, "../../storage")),
  },

  recaptcha: { siteKey: e.RECAPTCHA_SITE_KEY || "", secret: e.RECAPTCHA_SECRET || "" },
  google: { clientId: e.GOOGLE_CLIENT_ID || "" },
  rekognition: bool(e.REKOGNITION_ENABLED),
  maxUploadMb: Number(e.MAX_UPLOAD_MB) || 10,
};

module.exports = config;
