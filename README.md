# 📸 Mi Red Social — Proyecto Final Desarrollo Web (UMG)

Aplicación web social tipo Instagram para almacenar y navegar fotografías.
**Stack:** React (Vite) · Node.js + Express 5 · PostgreSQL + Prisma · Amazon S3 · sharp · face-api.js · Amazon Rekognition (opcional) · Google Login · reCAPTCHA · Docker · AWS EC2 / Route 53.

## ¿Qué cumple del enunciado?
| # | Requisito | Dónde está |
|---|---|---|
| 1 | Bienvenida + autenticación, Google Login y reCAPTCHA con React | `FRONTEND/src/components/AuthPage.jsx`, `BACKEND/services/{google,recaptcha}.js` |
| 2 | Inicio con miniaturas (sharp) | `Gallery.jsx`, `BACKEND/services/images.js` |
| 3 | Subir fotos y reconocer rostros (face-api.js) | `UploadModal.jsx`, `FRONTEND/src/faceDetect.js` |
| 4 | 3 transformaciones automáticas (B/N, sepia, ampliación) | `images.js` → tabla `publication_transforms` |
| 5 | Ver foto completa + transformaciones | `PhotoModal.jsx`, `GET /api/photos/:id` |
| 6 | Almacenamiento en la nube (S3) y arquitectura cloud | `BACKEND/services/storage.js`, `infra/` |
| 7 | Amazon Rekognition (opcional) | `BACKEND/services/analysis.js` (`REKOGNITION_ENABLED=true`) |
| + | Imágenes solo en S3, BD guarda rutas | `publications.file_key / thumb_key`, `publication_transforms.s3_key` |
| + | Contraseñas con hash + sal única | `BACKEND/services/password.js` |
| + | EC2, Route 53, auditoría, documentación | `infra/`, `audit_logs`, `docs/` |

## Mapa de carpetas
| Carpeta | Contenido | ¿GitHub? |
|---|---|---|
| `BACKEND/` | API: `routes → controllers → services` · `config/env.js` es el único lector de variables | ✅ |
| `FRONTEND/` | Aplicación React (Vite). Se compila a `FRONTEND/dist` y Express la sirve | ✅ |
| `prisma/` | Esquema y migraciones de PostgreSQL | ✅ |
| `infra/` | Scripts y políticas AWS (EC2, S3, IAM, Route 53) **sin claves** | ✅ |
| `docs/publica/` | Los manuales técnicos (arquitectura, seguridad, DRP, …) | ✅ |
| `docs/entregables/` | Documentación del desarrollador, despliegue, usuario e integrantes | ✅ |
| `tests/` | 22 pruebas automáticas (`npm test`) | ✅ |
| `privado/` | Credenciales del docente, llave `.pem`, `.env` real | ❌ **nunca** |

## Arranque local (sin AWS)
```bash
cp .env.example .env     # completa DATABASE_URL, DIRECT_URL, JWT_SECRET; deja STORAGE_DRIVER=local
npm install
npx prisma generate && npx prisma migrate deploy
npm run build:front      # compila React
npm start                # http://localhost:4000
```
Desarrollo con recarga en vivo: `npm run dev` (API, puerto 4000) y `npm run dev:front` (React, puerto 5173).
Para reCAPTCHA en local usa las claves de prueba que aparecen en `.env.example`.

## Pruebas
`npm test` → 22 pruebas (procesamiento de imágenes, almacenamiento, contraseñas y un recorrido completo de la API con BD simulada; no necesitan PostgreSQL ni AWS).

## Despliegue
Ver **`docs/entregables/instrucciones_despliegue.md`**. Resumen: `bash infra/ec2/deploy.sh` en la EC2.

## Equipo y flujo de trabajo
Ver `docs/entregables/integrantes_grupo.md` y `CONTRIBUTING.md`.
