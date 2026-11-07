# 🔒 Carpeta PRIVADA (información clasificada)

**Esta carpeta NUNCA se sube a GitHub** (está en `.gitignore`). Se entrega al docente por un canal privado
(correo institucional / plataforma del curso), **no** dentro del repositorio.

| Archivo (créalo aquí) | Contenido | Requisito |
|---|---|---|
| `credenciales_aws_docente.txt` | Usuario y contraseña IAM del docente (política en `infra/iam/teacher-user-policy.json`), **probados** | Entregable 4 |
| `llave_ssh.pem` | Par de claves para entrar por SSH a la EC2 (`chmod 400`) | Entregable 5 |
| `.env.produccion` | Copia del `.env` real del servidor | — |

Reglas
1. Usuario IAM de privilegios limitados para el docente (nunca la cuenta raíz).
2. Rotar o eliminar esas credenciales cuando termine la calificación.
3. En el servidor, usar el **IAM Role** de la EC2 para S3/Rekognition: así no existen claves de AWS en `.env`.
