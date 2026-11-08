# Animación de creadores (pantalla de bienvenida)

La animación de la izquierda del inicio de sesión lee `showcase.json`. **No hay que tocar código**.

1. Copia aquí tus videos y fotos (ej. `creador1.mp4`, `creador2.jpg`).
2. Abre `showcase.json` y llena `items`:

```json
{
  "items": [
    { "type": "video", "src": "/showcase/creador1.mp4", "poster": "/showcase/creador1.jpg", "name": "@creador1" },
    { "type": "image", "src": "/showcase/creador2.jpg", "name": "@creador2" }
  ]
}
```
3. Recarga la página (con `npm run build:front` si usas el servidor normal).

Recomendaciones
- Entre 6 y 12 elementos. Videos **cortos** (5–10 s), sin sonido, formato MP4 (H.264), menos de 3 MB cada uno.
- Fotos verticales (3:4 o 4:5) y menos de 300 KB.
- Estos archivos viajan en GitHub y en el servidor: no subas archivos pesados.
- Solo archivos de esta carpeta (el servidor no permite cargar videos desde otras direcciones por seguridad).
