# 3. Sistema de auditoría de transacciones

Cada acción relevante genera una fila en la tabla `audit_logs` mediante `BACKEND/services/audit.js`.
Un fallo al auditar nunca interrumpe la petición del usuario, y **nunca** se guardan contraseñas ni tokens.

## Campos
`id` · `user_id` (nulo si es un intento anónimo) · `action` · `entity` · `entity_id` · `ip` · `user_agent` · `metadata` (JSON) · `created_at`

## Acciones registradas
| `action` | Cuándo |
|---|---|
| `user.register`, `user.register_google` | Alta de cuenta |
| `user.login`, `user.login_google` | Inicio de sesión correcto |
| `user.login_failed` | Contraseña incorrecta (guarda el correo intentado en `metadata`) |
| `user.update`, `user.avatar`, `user.password_change` | Cambios de perfil |
| `photo.upload` | Subida (bytes y rostros detectados en `metadata`) |
| `photo.rejected` | Rechazo por contenido inapropiado (Rekognition) |
| `photo.delete` | Borrado de foto |

## Consulta
- Administradores: `GET /api/audit?page=1&action=photo.upload` (50 por página, más recientes primero).
- Crear un administrador: `node scripts/make-admin.js correo@ejemplo.com`.
- SQL directo, por ejemplo intentos fallidos por IP en la última hora:
  ```sql
  SELECT ip, count(*) FROM audit_logs
  WHERE action = 'user.login_failed' AND created_at > now() - interval '1 hour'
  GROUP BY ip ORDER BY 2 DESC;
  ```

## Retención
12 meses en línea; luego se exporta y se elimina (ver `11_mantenimiento_base_datos.md`). Índices: `(user_id, created_at)` y `(action, created_at)`.
