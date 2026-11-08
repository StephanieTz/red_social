# Guía para colaborar

## Flujo con Git (una rama por integrante)
```bash
git checkout main && git pull
git checkout -b feature/<tu-nombre>-<tema>      # ej. feature/reyneri-comentarios-ui
# ...trabajas...
npm test                                         # deben pasar las 22 pruebas
git add -A && git commit -m "feat: comentarios en el detalle de la foto"
git push -u origin feature/<tu-nombre>-<tema>    # y abre un Pull Request hacia main
```
- Cada integrante hace commits con **su propio usuario de GitHub** (así queda registrado quién desarrolló qué, como pide el enunciado).
- Nunca subas `.env`, `privado/`, `*.pem` ni claves de AWS. Si se sube una por error, **rótala de inmediato** (borrarla del historial no basta).
- Convención de commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Código documentado: cada servicio y controlador explica en su cabecera qué hace y por qué.

## Cómo agregar una transformación nueva (ejemplo: "desenfoque")
1. `prisma/schema.prisma`: el enum `TransformType` ya incluye `BLUR` y `ROTATE`.
2. `BACKEND/services/images.js`: agrega el pipeline en `processImage` y en el arreglo `transforms`.
3. `BACKEND/controllers/photos.js`: agrega su etiqueta en `LABEL` y su posición en `ORDER`.
4. Añade una prueba en `tests/images.test.js`.

## Pendientes sugeridos (para repartir)
| Tarea | Notas |
|---|---|
| Notificaciones (likes, comentarios, seguidores nuevos) | Crear tabla `notifications` en `prisma/schema.prisma` + `npx prisma migrate dev`; mostrarlas en la barra superior |
| Perfil público de otros usuarios (`#/u/<nick>`) | Backend listo: `GET /api/user/profile/:id`, `GET /api/photos?user=<id>`, `/api/follow/*` |
| Recuperación de contraseña | La tabla `password_resets` ya existe; falta el envío de correo (Amazon SES) |
| Mover las transformaciones a AWS Lambda (opcional) | Disparar con evento S3 `ObjectCreated` y reutilizar `BACKEND/services/images.js` |
| Capturas, diagramas PNG y datos del grupo en `docs/` | Ver `docs/README.md` |
| Probar todo en la EC2 real | Lista de verificación en `docs/entregables/instrucciones_despliegue.md` |
