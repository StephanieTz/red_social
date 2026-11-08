# 5. Aplicación web

## Pantallas
| Pantalla | Componente | Descripción |
|---|---|---|
| Bienvenida / autenticación | `AuthPage.jsx` | Pestañas *Iniciar sesión* / *Crear cuenta*, reCAPTCHA y botón de Google |
| Inicio | `FeedPage.jsx` | Perfil (izq.), publicaciones o **galería de miniaturas** (centro) y «A quién seguir» (der.) |
| Publicación | `PostCard.jsx` | Me gusta, no me gusta, comentarios con respuestas, repost, guardar; clic en la foto abre el detalle |
| Crear publicación | `Composer.jsx` | Texto y, opcionalmente, foto con detección de rostros (recuadros verdes) |
| Foto completa | `PhotoModal.jsx` | Original + 3 transformaciones, descarga, análisis, eliminar (dueño/admin) |
| Configuración | `SettingsPage.jsx` | Menú lateral: editar perfil, guardado, actividad (me gusta, comentarios, reposts, publicaciones) y contraseña |

## API (todas bajo `/api`, salvo `/media`)
| Método y ruta | Auth | Función |
|---|---|---|
| `GET /config` | — | Claves públicas (site key reCAPTCHA, client id Google) |
| `POST /user/register` · `/user/login` | — | Alta/entrada con reCAPTCHA (limitadas a 20 por 15 min) |
| `POST /user/google` | — | Entrada con Google (`{credential}`) |
| `POST /user/logout` · `GET /user/me` | sesión | Cerrar / consultar sesión |
| `PUT /user/update` · `PUT /user/password` · `POST /user/upload` | sesión | Perfil, contraseña, avatar |
| `GET /publications/feed/:page` | sesión | Inicio: publicaciones y reposts mezclados por fecha |
| `GET /photos?page&limit&mine` | sesión | Miniaturas paginadas |
| `GET /photos/:id` | sesión | Original + transformaciones + análisis |
| `POST /photos` | sesión | Publicar (multipart: `text`, `file` opcional, `faces`) |
| `DELETE /photos/:id` | dueño/admin | Borrar foto y archivos |
| `GET /media/<clave>` | sesión | Entrega la imagen (caché inmutable) |
| `GET /audit` | admin | Bitácora |
| `POST /social/react` · `/social/save` · `/social/repost` | sesión | Me gusta/no me gusta, guardar, repostear |
| `GET/POST/DELETE /social/comment…` · `POST /social/comment-like` | sesión | Comentarios, respuestas y me gusta en comentarios |
| `GET /social/saved` · `/social/activity/:tab` · `/social/search` | sesión | Guardados, actividad del usuario y buscador |
| `POST /follow/follow` · `DELETE /follow/unfollow/:id` · `GET /follow/suggestions` | sesión | Seguir, dejar de seguir y sugerencias |

Formato de errores: `{ "status": "error", "message": "..." }` con códigos 400/401/403/404/422/429/500.
