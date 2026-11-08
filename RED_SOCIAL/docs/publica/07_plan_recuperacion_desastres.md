# 7. Plan de recuperación contra desastres (DRP)

> El enunciado lista este manual dos veces (7 y 8): es uno solo.

**Objetivos:** RPO ≤ 24 h para la BD · RTO ≤ 2 h para reponer el servicio.

## Respaldos
| Qué | Cómo | Frecuencia |
|---|---|---|
| Código | GitHub (`main`) | Cada push |
| Imágenes | S3 con **versionado** activado (recupera borrados/sobrescrituras) | Continuo |
| Base de datos | Respaldo automático del proveedor (Neon/RDS) + `pg_dump` semanal a S3 | Diario / semanal |
| Servidor | **AMI** de la EC2 tras cada cambio de infraestructura | Mensual / por cambio |
| Secretos | Copia cifrada en `privado/` (fuera de Git) | Por cambio |

## Escenarios y respuesta
| Escenario | Respuesta | RTO |
|---|---|---|
| Cae el contenedor | `docker compose up -d` (política `restart: unless-stopped` lo reinicia solo) | minutos |
| Se pierde/daña la EC2 | Lanzar nueva EC2 desde la AMI (o `infra/ec2/setup.sh`), asociar IP elástica, `bash infra/ec2/deploy.sh`, restaurar `.env` desde `privado/` | ≤ 1 h |
| Borrado accidental de fotos | Recuperar la versión anterior del objeto en S3 (*Show versions → restore*) | minutos |
| Corrupción de BD | Restaurar el último respaldo (`pg_restore`) o punto en el tiempo del proveedor; las claves de S3 siguen siendo válidas | ≤ 2 h |
| Credenciales filtradas | Desactivar/rotar claves IAM y `JWT_SECRET`, revisar `audit_logs`, forzar nuevo login | ≤ 1 h |
| Caída de la región us-east-1 | Restaurar en otra región desde AMI copiada + respaldo de BD (manual) | ≤ 1 día |

## Verificación
Probar una restauración completa **una vez por semestre** y documentar la fecha y el resultado.
