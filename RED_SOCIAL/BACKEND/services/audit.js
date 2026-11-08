/**
 * Auditoría de transacciones: cada acción relevante deja un registro en la tabla audit_logs
 * (quién, qué, sobre qué entidad, desde qué IP/navegador y cuándo). Nunca guardar contraseñas ni tokens.
 * Una falla al auditar NO debe romper la petición del usuario.
 */
const prisma = require("../database/prisma");

async function log(req, action, { userId, entity, entityId, metadata } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || req.user?.id || null,
        action,
        entity: entity || null,
        entityId: entityId || null,
        ip: String(req.ip || "").slice(0, 45) || null,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 500) || null,
        metadata: metadata || undefined,
      },
    });
  } catch (e) {
    console.error("Auditoría:", e.message);
  }
}

module.exports = { log };
