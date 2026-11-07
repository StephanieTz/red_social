# 11. Plan de mantenimiento de la base de datos

| Frecuencia | Tarea | Cómo |
|---|---|---|
| Diaria | Verificar que el respaldo automático terminó | Consola del proveedor |
| Semanal | `pg_dump` a S3 | `pg_dump "$DIRECT_URL" \| gzip \| aws s3 cp - s3://BUCKET-RESPALDOS/db-$(date +%F).sql.gz` |
| Semanal | Revisar intentos de login fallidos y errores | Consulta del manual 3 · `docker compose logs app` |
| Mensual | Eliminar tokens de reset vencidos | `DELETE FROM password_resets WHERE expires_at < now() - interval '7 days';` |
| Mensual | Archivar auditoría > 12 meses | Exportar con `\copy` a S3 y luego `DELETE FROM audit_logs WHERE created_at < now() - interval '12 months';` |
| Mensual | Revisar crecimiento y lentitud | `SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY 2 DESC;` |
| Trimestral | `VACUUM (ANALYZE)` si el proveedor no lo hace solo | Consola SQL |
| Por cambio | Migraciones | Siempre con `prisma migrate deploy`; nunca editar tablas a mano |
| Semestral | Probar restauración completa | Manual 7 |

**Índices existentes** (definidos en `schema.prisma`): `publications(user_id)`, `publications(created_at)`, `comments(publication_id, created_at)`, `audit_logs(user_id, created_at)`, `audit_logs(action, created_at)`, únicos en `users.email` y `users.nick`.

**Ventana de mantenimiento:** domingos 02:00–04:00 (hora de Guatemala). Avisar si hay cambios con cortes.
