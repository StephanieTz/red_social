# 10. Manuales técnicos

## Requisitos
Node.js 22+ · npm 10+ · PostgreSQL (o cuenta Neon) · Docker (despliegue) · AWS CLI (solo infraestructura).

## Variables de entorno (valores reales solo en `.env`; plantilla en `.env.example`)
| Variable | Obligatoria | Uso |
|---|---|---|
| `JWT_SECRET` | ✅ | Firma de sesiones (≥ 32 caracteres) |
| `DATABASE_URL`, `DIRECT_URL` | ✅ | PostgreSQL (la segunda se usa para migraciones) |
| `STORAGE_DRIVER` | ✅ | `s3` (producción) o `local` |
| `AWS_BUCKET_NAME`, `AWS_REGION` | con `s3` | Bucket de imágenes |
| `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET` | ✅ en producción | reCAPTCHA v2 |
| `GOOGLE_CLIENT_ID` | opcional | Habilita el botón de Google |
| `REKOGNITION_ENABLED` | opcional | Análisis con Rekognition |
| `HTTPS`, `TRUST_PROXY` | según despliegue | Cookie `secure` y proxy |
| `MAX_UPLOAD_MB` | opcional | Límite de subida (10) |

## Comandos
| Comando | Acción |
|---|---|
| `npm install` | Dependencias del backend |
| `npx prisma generate` | Genera el cliente Prisma |
| `npm run migrate` | Aplica migraciones (`prisma migrate deploy`) |
| `npm run build:front` | Compila React en `FRONTEND/dist` |
| `npm start` / `npm run dev` | Servidor / servidor con recarga |
| `npm run dev:front` | React con recarga en :5173 (proxy a :4000) |
| `npm test` | 22 pruebas automáticas |
| `node scripts/make-admin.js <correo>` | Convierte un usuario en administrador |

## Estructura del backend
`routes/` (URL → controlador, con middlewares) → `controllers/` (valida y responde) → `services/` (lógica reutilizable: imágenes, almacenamiento, contraseñas, auditoría, Google, reCAPTCHA, análisis). `config/env.js` es el único lugar que lee `process.env`.

## Cómo crear las credenciales de terceros
- **reCAPTCHA v2 (casilla):** https://www.google.com/recaptcha/admin → agrega tu dominio (y `localhost` para pruebas).
- **Google Login:** Google Cloud Console → *APIs y servicios* → *Credenciales* → *ID de cliente OAuth* (Aplicación web) → orígenes JavaScript autorizados: `http://localhost:4000` y `https://TU-DOMINIO`. Google no acepta IPs como origen.

## Solución de problemas
| Síntoma | Causa probable |
|---|---|
| Tras iniciar sesión vuelve al login | `HTTPS=true` sin HTTPS real (la cookie `secure` no se guarda) |
| “Origen no permitido” (403) | nginx sin `proxy_set_header Host $host` |
| Registro/login rechazado en producción | Falta `RECAPTCHA_SECRET` o el dominio no está registrado en reCAPTCHA |
| Fotos no se ven | Revisar `STORAGE_DRIVER`, bucket y permisos del IAM Role (`docker compose logs app`) |
| Botón de Google no aparece | Falta `GOOGLE_CLIENT_ID` |
