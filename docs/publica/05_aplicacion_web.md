# 5. Aplicación web

## Pantallas
| Pantalla | Componente | Descripción |
|---|---|---|
| Bienvenida / autenticación | `AuthPage.jsx` | Pestañas *Iniciar sesión* / *Crear cuenta*, reCAPTCHA y botón de Google |
| Inicio | `Home.jsx` + `Gallery.jsx` | Cuadrícula de miniaturas; pestañas *Explorar* y *Mis fotos*; “Ver más” pagina |
| Subir foto | `UploadModal.jsx` | Vista previa, detección de rostros con recuadros, descripción |
| Foto completa | `PhotoModal.jsx` | Original + 3 transformaciones, descarga, análisis, eliminar (dueño/admin) |
| Perfil | `ProfileModal.jsx` | Nombre, biografía y foto de perfil |

## API (todas bajo `/api`, salvo `/media`)
| Método y ruta | Auth | Función |
|---|---|---|
| `GET /config` | — | Claves públicas (site key reCAPTCHA, client id Google) |
| `POST /user/register` · `/user/login` | — | Alta/entrada con reCAPTCHA (limitadas a 20 por 15 min) |
| `POST /user/google` | — | Entrada con Google (`{credential}`) |
| `POST /user/logout` · `GET /user/me` | sesión | Cerrar / consultar sesión |
| `PUT /user/update` · `PUT /user/password` · `POST /user/upload` | sesión | Perfil, contraseña, avatar |
| `GET /photos?page&limit&mine` | sesión | Miniaturas paginadas |
| `GET /photos/:id` | sesión | Original + transformaciones + análisis |
| `POST /photos` | sesión | Subir foto (multipart: `file`, `text`, `faces`) |
| `DELETE /photos/:id` | dueño/admin | Borrar foto y archivos |
| `GET /media/<clave>` | sesión | Entrega la imagen (caché inmutable) |
| `GET /audit` | admin | Bitácora |
| `/social/*`, `/follow/*` | sesión | Comentarios, reacciones, guardados, seguidores (backend listo; sin interfaz aún) |

Formato de errores: `{ "status": "error", "message": "..." }` con códigos 400/401/403/404/422/429/500.
