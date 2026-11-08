# 1. Arquitectura de la solución

## Visión general
Aplicación de tres capas desplegada en AWS:

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Presentación | React 18 (Vite) | Bienvenida/autenticación, galería de miniaturas, subida, detalle. Detecta rostros en el navegador (face-api.js). |
| Aplicación | Node.js 22 + Express 5 en Docker (EC2 `t2.small`) | API REST, sesión JWT en cookie httpOnly, procesamiento de imágenes (sharp), auditoría, entrega de imágenes. |
| Datos | PostgreSQL (Prisma) + Amazon S3 | La BD guarda cuentas, metadatos y **claves** de los archivos; S3 guarda las imágenes (nunca en la BD). |

Servicios externos: Google Identity (login), Google reCAPTCHA v2, Amazon Rekognition (opcional), Route 53 (DNS).

## Flujo de subida de una foto
1. El usuario elige la imagen; el navegador detecta rostros (face-api.js) y muestra los recuadros.
2. `POST /api/photos` (multipart). multer la recibe **en memoria** (máx. 10 MB).
3. `images.processImage`: verifica el formato real, corrige la orientación EXIF y genera **miniatura 400×400**, **blanco y negro**, **sepia** y **ampliación 2×**.
4. (Opcional) Rekognition analiza rostros/etiquetas/contenido inapropiado; si hay contenido inapropiado la foto se rechaza.
5. Se suben a S3 el original y 5 variantes bajo `photos/{usuario}/{foto}/…`: `thumb.jpg` (400×400), `feed.jpg` (≤1080 px, para el inicio), `grayscale.jpg`, `sepia.jpg` y `upscale.jpg`.
6. Se insertan las filas en `publications`, `publication_transforms` e `image_analysis` (solo claves y metadatos).
7. Se registra `photo.upload` en `audit_logs`. Si algo falla, los archivos ya subidos se borran (sin huérfanos).

## Algoritmo de almacenamiento y renderizado (decisiones)
- **Claves únicas e inmutables** (`photos/{userId}/{photoId}/thumb.jpg`): permiten caché del navegador de un año (`immutable`) y borrado exacto.
- **Bucket privado.** Las imágenes se entregan por `GET /media/<clave>`, que exige sesión. Así no hay URLs públicas ni hace falta abrir el dominio de S3 en la política CSP.
- **Tres tamaños por foto:** miniatura (cuadrícula), `feed.jpg` (publicaciones del inicio, ≈100–200 KB) y original (solo al abrir el detalle). El inicio nunca descarga originales de varios MB.
- **Galería ligera:** la cuadrícula solo descarga miniaturas de ~20–40 KB (paginadas de 24 en 24, `loading="lazy"`); el original completo se pide solo al abrir el detalle.
- **Transformaciones en el servidor** (sharp) en lugar de Lambda: menos piezas que operar con un presupuesto académico. El servicio `images.js` es una función pura, así que se puede mover a Lambda (evento S3 `ObjectCreated`) sin reescribirla.
- **Driver de almacenamiento intercambiable** (`s3` / `local`): los compañeros desarrollan sin AWS y producción usa S3 sin cambiar código.

## Seguridad en la arquitectura
Contraseñas con HMAC+bcrypt y sal única · cookie `httpOnly` + `SameSite=Lax` · CSP estricta (helmet) · anti-CSRF por verificación de origen · límites de tasa · validación del formato real de la imagen · IAM Role en lugar de claves en el servidor · auditoría de acciones. Detalle en `06_seguridad_base_datos.md`.
