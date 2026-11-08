# 4. Segmentación de red

## Esquema
| Zona | Recurso | Quién puede entrar |
|---|---|---|
| Internet → **pública** | EC2 (nginx 80/443) | Cualquiera, solo HTTP/HTTPS |
| **Pública** → loopback | Contenedor app en `127.0.0.1:4000` | Solo nginx (mismo servidor) |
| Aplicación → datos | PostgreSQL (puerto 5432) | Solo la app, por TLS (`sslmode=require`) |
| Aplicación → S3 / Rekognition | Endpoints de AWS | Solo con el IAM Role de la EC2 |
| Administración | SSH 22 | Solo la IP del administrador |

## Security Group de la EC2
| Tipo | Puerto | Origen | Motivo |
|---|---|---|---|
| SSH | 22 | **Mi IP** (nunca 0.0.0.0/0) | Administración |
| HTTP | 80 | 0.0.0.0/0 | Redirección a HTTPS y desafío de certbot |
| HTTPS | 443 | 0.0.0.0/0 | Tráfico de la aplicación |
| — | 4000, 5432 | **cerrados** | La app y la BD no se exponen directamente |

Para ello, en `docker-compose.yml` publica el puerto como `127.0.0.1:4000:4000` cuando uses nginx.

## Recomendación de VPC (si la BD pasa a RDS)
- Subred **pública**: EC2. Subred **privada** (2 zonas): RDS PostgreSQL, sin IP pública.
- Security Group de RDS: puerto 5432 con origen = Security Group de la EC2.
- Bucket S3 sin acceso público (Block Public Access activado, ver `infra/s3/create-bucket.sh`).
