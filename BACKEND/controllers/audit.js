const prisma = require("../database/prisma");

// GET /api/audit?page=1&action=photo.upload  (solo administradores)
const list = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 50;
    const where = req.query.action ? { action: String(req.query.action).slice(0, 80) } : {};
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { user: { select: { nick: true } } } }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ status: "success", items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
};

module.exports = { list };
