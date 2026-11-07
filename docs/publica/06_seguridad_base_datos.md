# 6. Manual de seguridad de la base de datos

## Datos sensibles y su protección
| Dato | Protección |
|---|---|
| Contraseña | Nunca se guarda. Se guarda `bcrypt(HMAC-SHA256(sal, contraseña))` (costo 12) y la **sal única de 16 bytes** por usuario (`users.salt`). El HMAC evita el límite de 72 bytes de bcrypt. |
| Sesión | JWT (HS256, 7 días) en cookie `httpOnly`, `SameSite=Lax`, `secure` bajo HTTPS. El token no se devuelve en el JSON. |
| Reset de contraseña | Tabla `password_resets` guarda solo el **hash** del token, con expiración. |
| Imágenes | No están en la BD: solo claves de S3 (`file_key`, `thumb_key`, `s3_key`). |

## Controles
1. **Consultas parametrizadas** (Prisma) → sin inyección SQL.
2. **Mínimo privilegio:** usar un usuario de BD solo con `SELECT/INSERT/UPDATE/DELETE` para la app; las migraciones (`DIRECT_URL`) usan otro usuario.
3. **TLS obligatorio:** `?sslmode=require` en `DATABASE_URL`.
4. **Secretos fuera del código:** `.env` en `.gitignore`; en la EC2, IAM Role para AWS.
5. **Borrado en cascada** definido en el esquema (al borrar una foto desaparecen transformaciones, comentarios y reacciones).
6. **Auditoría** de accesos y cambios (`audit_logs`, ver manual 3).
7. **Respuestas mínimas:** la API nunca devuelve `password_hash`, `salt` ni correos de otros usuarios.
8. **Límites:** tasa de peticiones, tamaño de cuerpo JSON (100 KB) y de imágenes (10 MB).

## Buenas prácticas operativas
- Rotar `JWT_SECRET` y credenciales ante cualquier sospecha (cierra todas las sesiones).
- Respaldos cifrados y probados (ver manuales 7 y 11).
- Si una clave llegó a un repositorio o chat: **rotarla de inmediato**.
